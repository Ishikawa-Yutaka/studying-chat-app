/**
 * AI会話セッション個別操作API
 * GET /api/ai/sessions/[sessionId] - セッション詳細取得
 * DELETE /api/ai/sessions/[sessionId] - セッション削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

/**
 * セッション詳細取得（GET）
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;

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

    // セッションを取得（所有者チェック込み）
    const session = await prisma.aiChatSession.findFirst({
      where: {
        id: sessionId,
        userId: dbUser.id // 自分のセッションのみ取得
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc' // 古い順
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'セッションが見つかりません'
        },
        { status: 404 }
      );
    }

    console.log(`📋 セッション詳細取得: ${session.id} (メッセージ${session.messages.length}件)`);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: session.messages
      }
    });

  } catch (error) {
    console.error('❌ セッション詳細取得エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'セッション詳細の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

/**
 * セッション削除（DELETE）
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;

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

    // セッションを削除（所有者チェック込み）
    const session = await prisma.aiChatSession.deleteMany({
      where: {
        id: sessionId,
        userId: dbUser.id // 自分のセッションのみ削除
      }
    });

    if (session.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'セッションが見つかりません'
        },
        { status: 404 }
      );
    }

    console.log(`🗑️ セッション削除: ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: 'セッションを削除しました'
    });

  } catch (error) {
    console.error('❌ セッション削除エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'セッションの削除に失敗しました'
      },
      { status: 500 }
    );
  }
}
