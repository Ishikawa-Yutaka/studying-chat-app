// 単一チャンネル情報取得API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// チャンネル情報取得API（GET）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    
    console.log(`📋 チャンネル情報取得 - チャンネルID: ${channelId}`);
    
    // チャンネル情報を取得
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
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
    });
    
    if (!channel) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }
    
    console.log(`✅ チャンネル情報取得成功: ${channel.name}`);
    
    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        memberCount: channel.members.length,
        members: channel.members.map(member => member.user)
      }
    });
    
  } catch (error) {
    console.error('❌ チャンネル情報取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネル情報の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}