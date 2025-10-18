/**
 * AI会話API
 * POST /api/ai/chat - ユーザーのメッセージに対してAIが応答
 *
 * 処理の流れ:
 * 1. リクエストボディからユーザーメッセージとユーザーIDを取得
 * 2. OpenAI APIを使用してAIの応答を生成
 * 3. 会話履歴をデータベースに保存
 * 4. AIの応答を返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { openai, isOpenAIConfigured } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

/**
 * AI会話エンドポイント（POST）
 */
export async function POST(request: NextRequest) {
  try {
    // OpenAI APIキーが設定されているかチェック
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI APIキーが設定されていません。管理者に連絡してください。'
        },
        { status: 503 }
      );
    }

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

    // リクエストボディを取得
    const body = await request.json();
    const { message, sessionId } = body;

    // 入力検証
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'メッセージが必要です'
        },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'セッションIDが必要です'
        },
        { status: 400 }
      );
    }

    console.log('🤖 AI会話リクエスト:', { message, sessionId, user: authUser.email });

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

    // セッションの存在確認と所有者チェック
    const session = await prisma.aiChatSession.findFirst({
      where: {
        id: sessionId,
        userId: dbUser.id // 自分のセッションのみ
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

    // OpenAI APIで応答を生成
    console.log('🔄 OpenAI API呼び出し中...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // GPT-4o-mini: 高性能で低コスト
      messages: [
        {
          role: 'system',
          content: 'あなたは親切で役立つアシスタントです。日本語で簡潔に回答してください。'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7, // 創造性のバランス（0-2の範囲、0.7が推奨）
      max_tokens: 500, // 応答の最大トークン数
    });

    const aiResponse = completion.choices[0]?.message?.content || 'すみません、応答を生成できませんでした。';

    console.log('✅ AI応答生成成功');

    // データベースに会話履歴を保存
    const aiChat = await prisma.aiChat.create({
      data: {
        sessionId: sessionId, // セッションIDを含める
        userId: dbUser.id,
        message: message.trim(),
        response: aiResponse
      }
    });

    console.log(`💾 会話履歴保存完了 - ID: ${aiChat.id}`);

    // セッションのタイトル自動生成（最初のメッセージの場合）
    if (!session.title) {
      const title = message.length <= 30
        ? message
        : message.substring(0, 30) + '...';

      await prisma.aiChatSession.update({
        where: { id: sessionId },
        data: { title }
      });

      console.log(`📝 セッションタイトル自動生成: "${title}"`);
    }

    // 応答を返す
    return NextResponse.json({
      success: true,
      response: aiResponse,
      chatId: aiChat.id
    });

  } catch (error) {
    console.error('❌ AI会話エラー:', error);

    // OpenAI APIエラーの詳細をログ出力
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'AIとの会話に失敗しました。もう一度お試しください。',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

