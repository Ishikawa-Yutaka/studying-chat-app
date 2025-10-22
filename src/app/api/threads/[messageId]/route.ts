/**
 * スレッド取得API
 * GET /api/threads/[messageId] - 特定メッセージのスレッド返信一覧を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server';

/**
 * スレッド取得エンドポイント（GET）
 *
 * セキュリティ強化版:
 * 1. 認証チェック：ログインしているユーザーのみアクセス可能
 * 2. メンバーシップ確認：親メッセージが属するチャンネルのメンバーのみ取得可能
 * 3. スレッド返信を取得
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await context.params;

    console.log(`🔄 スレッド取得開始 - メッセージID: ${messageId}`);

    // 1. 認証チェック：現在ログインしているユーザーを取得
    const { user, error: authError, status: authStatus } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError
      }, { status: authStatus });
    }

    // 2. 親メッセージの存在確認とチャンネルID取得
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

    // 3. メンバーシップ確認：このユーザーが親メッセージのチャンネルのメンバーか確認
    const { isMember, error: memberError, status: memberStatus } = await checkChannelMembership(
      user.id,
      parentMessage.channelId
    );

    if (!isMember) {
      return NextResponse.json({
        success: false,
        error: memberError
      }, { status: memberStatus });
    }

    // 4. スレッド返信を取得（parentMessageId が messageId のメッセージ）
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
 * セキュリティ強化版:
 * 1. 認証チェック：ログインしているユーザーのみ送信可能
 * 2. メンバーシップ確認：親メッセージのチャンネルのメンバーのみ送信可能
 * 3. スレッド返信をデータベースに保存
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await context.params;
    const body = await request.json();
    const { content } = body;

    console.log(`🔄 スレッド返信送信開始 - 親メッセージID: ${messageId}`);

    // 1. 認証チェック：現在ログインしているユーザーを取得
    const { user, error: authError, status: authStatus } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError
      }, { status: authStatus });
    }

    // 2. 入力検証
    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: 'メッセージ内容が必要です'
        },
        { status: 400 }
      );
    }

    // 3. 親メッセージの存在確認とチャンネルID取得
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

    // 4. メンバーシップ確認：このユーザーが親メッセージのチャンネルのメンバーか確認
    const { isMember, error: memberError, status: memberStatus } = await checkChannelMembership(
      user.id,
      parentMessage.channelId
    );

    if (!isMember) {
      return NextResponse.json({
        success: false,
        error: memberError
      }, { status: memberStatus });
    }

    // 5. スレッド返信をデータベースに保存
    const newReply = await prisma.message.create({
      data: {
        content,
        senderId: user.id,  // 認証済みユーザーのIDを使用
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
