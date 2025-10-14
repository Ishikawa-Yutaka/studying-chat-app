// ダッシュボード統計情報取得API
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ダッシュボード統計情報取得API（GET）
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
    
    console.log(`📊 ダッシュボード統計取得 - ユーザーID: ${userId}`);
    
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
    
    // 並列でデータを取得（Prismaの内部IDを使用）
    const [
      userChannels,
      userMessageCount,
      totalUserCount
    ] = await Promise.all([
      // ユーザーが参加しているチャンネル・DM
      prisma.channelMember.findMany({
        where: { userId: user.id },
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
      }),
      
      // ユーザーが送信したメッセージ数
      prisma.message.count({
        where: { senderId: user.id }
      }),
      
      // ワークスペース全体のユーザー数
      prisma.user.count()
    ]);
    
    // チャンネルとDMを分離
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
    
    const stats = {
      channelCount: channels.length,
      dmCount: directMessages.length,
      totalRoomsCount: channels.length + directMessages.length,
      userMessageCount: userMessageCount,
      totalUserCount: totalUserCount
    };
    
    console.log(`✅ ダッシュボード統計取得成功`, stats);
    
    return NextResponse.json({
      success: true,
      stats: stats,
      channels: channels,
      directMessages: directMessages
    });
    
  } catch (error) {
    console.error('❌ ダッシュボード統計取得エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'ダッシュボード統計の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}