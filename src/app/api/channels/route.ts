// チャンネル一覧取得API
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    
    // ユーザーが参加しているチャンネルを取得
    const userChannels = await prisma.channelMember.findMany({
      where: {
        userId: userId
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
        const partner = channel.members.find(member => member.userId !== userId);
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
    
  } finally {
    await prisma.$disconnect();
  }
}