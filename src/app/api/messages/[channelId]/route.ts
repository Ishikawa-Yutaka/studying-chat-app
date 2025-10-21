// メッセージAPI - 取得と送信
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    
    // メッセージ取得（送信者情報、ファイル情報、スレッド返信も含む）
    const messages = await prisma.message.findMany({
      where: {
        channelId: channelId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            authId: true,     // SupabaseのAuthIDも含める
            avatarUrl: true   // プロフィール画像のURL
          }
        },
        replies: {
          // スレッド返信の数をカウントするために含める
          select: {
            id: true
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
    const { content, senderId, fileUrl, fileName, fileType, fileSize } = body;

    if (!content || !senderId) {
      return NextResponse.json({
        success: false,
        error: 'メッセージ内容と送信者IDが必要です'
      }, { status: 400 });
    }

    // ファイルのみの送信は許可（contentが空でもファイルがあればOK）
    if (content.trim().length === 0 && !fileUrl) {
      return NextResponse.json({
        success: false,
        error: 'メッセージ内容またはファイルが必要です'
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
    
    // SupabaseのauthIdからPrismaのユーザー内部IDを取得
    const sender = await prisma.user.findFirst({
      where: { authId: senderId }
    });
    
    if (!sender) {
      return NextResponse.json({
        success: false,
        error: '送信者が見つかりません'
      }, { status: 404 });
    }
    
    console.log(`👤 送信者確認: ${sender.name} (内部ID: ${sender.id})`);
    
    // メッセージ作成（ファイル情報も含める）
    const newMessage = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: sender.id, // Prismaの内部IDを使用
        channelId: channelId,
        // ファイル情報（オプショナル）
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            authId: true,     // SupabaseのAuthIDも含める
            avatarUrl: true   // プロフィール画像のURL
          }
        }
      }
    });
    
    console.log(`✅ メッセージ送信成功 - ID: ${newMessage.id}`);
    if (fileUrl) {
      console.log(`📎 ファイル添付: ${fileName} (${fileType}, ${fileSize}バイト)`);
    }
    
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
  }
}