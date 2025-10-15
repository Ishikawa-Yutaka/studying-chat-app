// チャンネル一覧取得API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// チャンネル一覧取得API（GET）
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーIDが必要です'
      }, { status: 400 });
    }
    
    console.log(`📋 チャンネル一覧取得 - ユーザーID: ${userId}`);
    
    // SupabaseのauthIdからPrismaのユーザー内部IDを取得
    const user = await prisma.user.findFirst({
      where: { authId: userId }
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーが見つかりません'
      }, { status: 404 });
    }
    
    console.log(`👤 Prismaユーザー確認: ${user.name} (内部ID: ${user.id})`);
    
    console.log('📋 チャンネルメンバー検索開始...');
    // ユーザーが参加しているチャンネルを取得
    const userChannels = await prisma.channelMember.findMany({
      where: {
        userId: user.id
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log('✅ チャンネルメンバー検索完了:', userChannels.length, '件');
    
    // 通常のチャンネルとDMを分離
    const channels = [];
    const directMessages = [];
    
    for (const userChannel of userChannels) {
      const channel = userChannel.channel;
      
      if (channel.type === 'channel') {
        // 通常のチャンネル
        channels.push({
          id: channel.id,
          name: channel.name,
          description: channel.description,
          memberCount: channel.members.length
        });
      } else if (channel.type === 'dm') {
        // DM - 相手のユーザー情報を取得
        const partner = channel.members.find(member => member.userId !== user.id);
        if (partner) {
          directMessages.push({
            id: channel.id,
            partnerId: partner.user.id,
            partnerName: partner.user.name,
            partnerEmail: partner.user.email
          });
        }
      }
    }
    
    console.log(`✅ チャンネル取得成功 - 通常: ${channels.length}件, DM: ${directMessages.length}件`);
    
    return NextResponse.json({
      success: true,
      channels: channels,
      directMessages: directMessages,
      counts: {
        channels: channels.length,
        directMessages: directMessages.length
      }
    });
    
  } catch (error) {
    console.error('❌ チャンネル取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}