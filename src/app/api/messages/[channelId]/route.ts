// メッセージAPI - 取得と送信
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// メッセージ取得API（GET）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    
    console.log(`📥 メッセージ取得リクエスト - チャンネルID: ${channelId}`);
    
    // チャンネルの存在確認
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });
    
    if (!channel) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }
    
    // メッセージ取得（送信者情報も含む）
    const messages = await prisma.message.findMany({
      where: {
        channelId: channelId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'  // 古いメッセージから順番に
      }
    });
    
    console.log(`✅ メッセージ取得成功 - ${messages.length}件`);
    
    return NextResponse.json({
      success: true,
      messages: messages,
      count: messages.length
    });
    
  } catch (error) {
    console.error('❌ メッセージ取得エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'メッセージの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}

// メッセージ送信API（POST）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const body = await request.json();
    
    console.log(`📤 メッセージ送信リクエスト - チャンネルID: ${channelId}`, body);
    
    // リクエストボディのバリデーション
    const { content, senderId } = body;
    
    if (!content || !senderId) {
      return NextResponse.json({
        success: false,
        error: 'メッセージ内容と送信者IDが必要です'
      }, { status: 400 });
    }
    
    if (content.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'メッセージ内容が空です'
      }, { status: 400 });
    }
    
    // チャンネルの存在確認
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });
    
    if (!channel) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }
    
    // 送信者の存在確認
    const sender = await prisma.user.findUnique({
      where: { id: senderId }
    });
    
    if (!sender) {
      return NextResponse.json({
        success: false,
        error: '送信者が見つかりません'
      }, { status: 404 });
    }
    
    // メッセージ作成
    const newMessage = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: senderId,
        channelId: channelId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`✅ メッセージ送信成功 - ID: ${newMessage.id}`);
    
    return NextResponse.json({
      success: true,
      message: newMessage
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ メッセージ送信エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'メッセージの送信に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}