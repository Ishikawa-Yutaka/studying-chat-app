// DM チャンネル取得・作成API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { channelMemberUserSelect, userBasicSelect } from '@/lib/prisma-selectors';

// DMチャンネル取得API（GET）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const { partnerId } = await params;
    const url = new URL(request.url);
    const myUserId = url.searchParams.get('myUserId');
    
    if (!myUserId) {
      return NextResponse.json({
        success: false,
        error: '現在のユーザーIDが必要です'
      }, { status: 400 });
    }
    
    console.log(`🔍 DM検索 - 自分: ${myUserId}, 相手: ${partnerId}`);
    
    // 自分のユーザー情報を取得（SupabaseのauthIdからPrisma内部IDに変換）
    const myUser = await prisma.user.findFirst({
      where: { authId: myUserId }
    });
    
    if (!myUser) {
      return NextResponse.json({
        success: false,
        error: '自分のユーザー情報が見つかりません'
      }, { status: 404 });
    }
    
    // 相手のユーザー情報取得（SupabaseのauthIdからPrisma内部IDに変換）
    const partner = await prisma.user.findFirst({
      where: { authId: partnerId },
      select: channelMemberUserSelect
    });
    
    if (!partner) {
      return NextResponse.json({
        success: false,
        error: 'DM相手が見つかりません'
      }, { status: 404 });
    }
    
    console.log(`👤 ユーザー確認 - 自分: ${myUser.name} (${myUser.id}), 相手: ${partner.name} (${partner.id})`);

    // 既存のDMチャンネルを検索
    // 重要: 自分が退出済みでも、相手がメンバーならチャンネルは存在する
    // → メッセージ履歴を保持するため、既存チャンネルを再利用する
    const allDmChannels = await prisma.channel.findMany({
      where: {
        type: 'dm',
        members: {
          some: { userId: partner.id }  // 相手がメンバーのDMチャンネルを探す
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: userBasicSelect
            }
          }
        }
      }
    });

    // 相手との1対1のDMチャンネルを探す
    // （相手がメンバーで、かつ自分または相手のみがメンバーのチャンネル）
    const existingDmChannel = allDmChannels.find(channel => {
      const memberIds = channel.members.map(m => m.userId);
      // 相手が必ずメンバーで、メンバーが2人以下（自分が退出済みなら1人）
      return memberIds.includes(partner.id) &&
             (memberIds.includes(myUser.id) || memberIds.length === 1);
    });

    if (existingDmChannel) {
      const isMember = existingDmChannel.members.some(m => m.userId === myUser.id);

      if (isMember) {
        // 既に両方がメンバー → そのまま返す
        console.log(`✅ 既存DMチャンネル発見（参加中）: ${existingDmChannel.id}`);
      } else {
        // 自分が退出済み → 再度メンバーに追加
        console.log(`🔄 既存DMチャンネルに再参加: ${existingDmChannel.id}`);
        await prisma.channelMember.create({
          data: {
            userId: myUser.id,
            channelId: existingDmChannel.id
          }
        });
      }

      return NextResponse.json({
        success: true,
        dmChannel: {
          id: existingDmChannel.id,
          type: existingDmChannel.type,
          partner: partner
        }
      });
    }
    
    // DMチャンネルが存在しない場合は新規作成
    const newDmChannel = await prisma.channel.create({
      data: {
        name: `${myUser.name} & ${partner.name}`,
        description: `${myUser.name}と${partner.name}のダイレクトメッセージ`,
        type: 'dm',
        members: {
          create: [
            { userId: myUser.id },
            { userId: partner.id }
          ]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: userBasicSelect
            }
          }
        }
      }
    });
    
    console.log(`✅ 新規DMチャンネル作成: ${newDmChannel.id}`);
    
    return NextResponse.json({
      success: true,
      dmChannel: {
        id: newDmChannel.id,
        type: newDmChannel.type,
        partner: partner
      },
      created: true
    });
    
  } catch (error) {
    console.error('❌ DM取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'DMチャンネルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}