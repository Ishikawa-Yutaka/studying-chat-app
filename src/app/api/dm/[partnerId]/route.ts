// DM チャンネル取得・作成API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      select: {
        id: true,
        name: true,
        email: true,
        authId: true
      }
    });
    
    if (!partner) {
      return NextResponse.json({
        success: false,
        error: 'DM相手が見つかりません'
      }, { status: 404 });
    }
    
    console.log(`👤 ユーザー確認 - 自分: ${myUser.name} (${myUser.id}), 相手: ${partner.name} (${partner.id})`);
    
    // 既存のDMチャンネルを検索（2人が参加しているDMタイプのチャンネル）
    const existingDmChannel = await prisma.channel.findFirst({
      where: {
        type: 'dm',
        AND: [
          {
            members: {
              some: { userId: myUser.id }
            }
          },
          {
            members: {
              some: { userId: partner.id }
            }
          }
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                authId: true
              }
            }
          }
        }
      }
    });
    
    // 2人が参加しているDMチャンネルを確認
    const validDmChannel = existingDmChannel?.members.length === 2 &&
      existingDmChannel.members.some(m => m.userId === myUser.id) &&
      existingDmChannel.members.some(m => m.userId === partner.id) 
      ? existingDmChannel : null;
    
    if (validDmChannel) {
      console.log(`✅ 既存DMチャンネル発見: ${validDmChannel.id}`);
      
      return NextResponse.json({
        success: true,
        dmChannel: {
          id: validDmChannel.id,
          type: validDmChannel.type,
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
              select: {
                id: true,
                name: true,
                email: true,
                authId: true
              }
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