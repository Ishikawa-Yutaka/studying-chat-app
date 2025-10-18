/**
 * AI会話セッション管理API
 * GET /api/ai/sessions - セッション一覧取得
 * POST /api/ai/sessions - 新しいセッション作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

/**
 * セッション一覧取得（GET）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          error: '認証が必要です'
        },
        { status: 401 }
      );
    }

    // ユーザー情報を取得
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーが見つかりません'
        },
        { status: 404 }
      );
    }

    // セッション一覧を取得（新しい順）
    const sessions = await prisma.aiChatSession.findMany({
      where: {
        userId: dbUser.id
      },
      include: {
        messages: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc' // 最終更新日時で並び替え
      }
    });

    // メッセージ数を含めたレスポンス
    const sessionsWithCount = sessions.map(session => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messages.length
    }));

    console.log(`📜 セッション一覧取得: ${sessionsWithCount.length}件`);

    return NextResponse.json({
      success: true,
      sessions: sessionsWithCount
    });

  } catch (error) {
    console.error('❌ セッション一覧取得エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'セッション一覧の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

/**
 * 新しいセッション作成（POST）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          error: '認証が必要です'
        },
        { status: 401 }
      );
    }

    // ユーザー情報を取得
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーが見つかりません'
        },
        { status: 404 }
      );
    }

    // 新しいセッションを作成
    const session = await prisma.aiChatSession.create({
      data: {
        userId: dbUser.id,
        title: null // タイトルは最初のメッセージ送信時に設定
      }
    });

    console.log(`✅ 新しいセッション作成: ${session.id}`);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ セッション作成エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'セッションの作成に失敗しました'
      },
      { status: 500 }
    );
  }
}
