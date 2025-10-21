/**
 * スレッド取得API
 * GET /api/threads/[messageId] - 特定メッセージのスレッド返信一覧を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * スレッド取得エンドポイント（GET）
 *
 * 処理の流れ:
 * 1. URLパラメータからmessageIdを取得
 * 2. 親メッセージの存在確認
 * 3. そのメッセージに対するスレッド返信を取得
 * 4. 返信一覧を返す
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    // Next.js 15では params を await する必要がある
    const { messageId } = await context.params;

    console.log(`🔄 スレッド取得開始 - メッセージID: ${messageId}`);

    // 親メッセージの存在確認
    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            authId: true,
            avatarUrl: true  // アバター画像のURL
          }
        }
      }
    });

    if (!parentMessage) {
      console.log(`❌ 親メッセージが見つかりません: ${messageId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'メッセージが見つかりません'
        },
        { status: 404 }
      );
    }

    // スレッド返信を取得（parentMessageId が messageId のメッセージ）
    const replies = await prisma.message.findMany({
      where: {
        parentMessageId: messageId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            authId: true,
            avatarUrl: true  // アバター画像のURL
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // 古い順に並べる
      }
    });

    console.log(`✅ スレッド取得成功 - ${replies.length}件の返信`);

    return NextResponse.json({
      success: true,
      parentMessage,
      replies
    });

  } catch (error) {
    console.error('❌ スレッド取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'スレッドの取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

/**
 * スレッド返信送信エンドポイント（POST）
 *
 * 処理の流れ:
 * 1. リクエストボディからcontent、senderAuthIdを取得
 * 2. 送信者のユーザー情報を取得
 * 3. 親メッセージの存在確認
 * 4. スレッド返信をデータベースに保存
 * 5. 保存したメッセージを返す
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await context.params;
    const body = await request.json();
    const { content, senderAuthId } = body;

    console.log(`🔄 スレッド返信送信開始 - 親メッセージID: ${messageId}`);

    // 入力検証
    if (!content || !senderAuthId) {
      return NextResponse.json(
        {
          success: false,
          error: 'メッセージ内容と送信者IDが必要です'
        },
        { status: 400 }
      );
    }

    // 送信者のユーザー情報を取得
    const sender = await prisma.user.findFirst({
      where: { authId: senderAuthId }
    });

    if (!sender) {
      return NextResponse.json(
        {
          success: false,
          error: '送信者が見つかりません'
        },
        { status: 404 }
      );
    }

    // 親メッセージの存在確認とチャンネルID取得
    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        channelId: true
      }
    });

    if (!parentMessage) {
      return NextResponse.json(
        {
          success: false,
          error: '親メッセージが見つかりません'
        },
        { status: 404 }
      );
    }

    // スレッド返信をデータベースに保存
    const newReply = await prisma.message.create({
      data: {
        content,
        senderId: sender.id,
        channelId: parentMessage.channelId,
        parentMessageId: messageId // 親メッセージIDを設定
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            authId: true,
            avatarUrl: true  // アバター画像のURL
          }
        }
      }
    });

    console.log(`✅ スレッド返信送信成功 - メッセージID: ${newReply.id}`);

    return NextResponse.json({
      success: true,
      message: newReply
    }, { status: 201 });

  } catch (error) {
    console.error('❌ スレッド返信送信エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'スレッド返信の送信に失敗しました'
      },
      { status: 500 }
    );
  }
}
