// デバッグ用：ダッシュボードAPI詳細ログ
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    console.log('🔍 DEBUG Dashboard - userId:', userId);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーIDが必要です'
      }, { status: 400 });
    }
    
    // Step 1: ユーザー検索
    console.log('Step 1: ユーザー検索開始');
    const user = await prisma.user.findFirst({
      where: { authId: userId }
    });
    
    console.log('Step 1 結果:', user);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーが見つかりません',
        debug: { userId, step: 'user_not_found' }
      }, { status: 404 });
    }
    
    // Step 2: チャンネルメンバー検索
    console.log('Step 2: チャンネルメンバー検索開始 - userId:', user.id);
    const userChannels = await prisma.channelMember.findMany({
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
    });
    
    console.log('Step 2 結果 - チャンネル数:', userChannels.length);
    
    // Step 3: メッセージ数カウント
    console.log('Step 3: メッセージ数カウント開始');
    const userMessageCount = await prisma.message.count({
      where: { senderId: user.id }
    });
    
    console.log('Step 3 結果 - メッセージ数:', userMessageCount);
    
    // Step 4: 全ユーザー数カウント
    console.log('Step 4: 全ユーザー数カウント開始');
    const totalUserCount = await prisma.user.count();
    
    console.log('Step 4 結果 - 全ユーザー数:', totalUserCount);
    
    // Step 5: チャンネル分類
    console.log('Step 5: チャンネル分類開始');
    const channels = [];
    const directMessages = [];
    
    for (const userChannel of userChannels) {
      const channel = userChannel.channel;
      
      if (channel.type === 'channel') {
        channels.push({
          id: channel.id,
          name: channel.name,
          description: channel.description,
          memberCount: channel.members.length
        });
      } else if (channel.type === 'dm') {
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
    
    console.log('Step 5 結果 - channels:', channels.length, 'DMs:', directMessages.length);
    
    const stats = {
      channelCount: channels.length,
      dmCount: directMessages.length,
      totalRoomsCount: channels.length + directMessages.length,
      userMessageCount: userMessageCount,
      totalUserCount: totalUserCount
    };
    
    return NextResponse.json({
      success: true,
      debug: {
        inputUserId: userId,
        foundUser: user,
        steps: {
          userChannels: userChannels.length,
          userMessageCount,
          totalUserCount,
          channelsProcessed: channels.length,
          dmsProcessed: directMessages.length
        }
      },
      stats,
      channels,
      directMessages
    });
    
  } catch (error) {
    console.error('❌ DEBUG Dashboard Error:', error);
    return NextResponse.json({
      success: false,
      error: 'デバッグエラー',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}