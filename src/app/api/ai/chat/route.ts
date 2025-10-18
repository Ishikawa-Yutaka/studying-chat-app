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

    // 会話履歴を取得（過去の会話をAIに記憶させる）
    const chatHistory = await prisma.aiChat.findMany({
      where: {
        sessionId: sessionId
      },
      orderBy: {
        createdAt: 'asc' // 古い順に取得（時系列順）
      },
      take: 20 // 最新20件まで（トークン数制限のため）
    });

    console.log(`📚 会話履歴取得: ${chatHistory.length}件`);

    // OpenAI API用のメッセージ配列を構築
    // システムプロンプト（AIの役割・性格を定義）
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      {
        role: 'system',
        content: 'あなたは親切で役立つアシスタントです。ユーザーの質問に対して、丁寧かつ簡潔に日本語で回答してください。過去の会話内容を踏まえて、文脈に沿った自然な対話を心がけてください。'
      }
    ];

    // 過去の会話履歴を追加（ユーザー→AI→ユーザー→AI...の順）
    for (const chat of chatHistory) {
      messages.push({
        role: 'user',
        content: chat.message
      });
      messages.push({
        role: 'assistant',
        content: chat.response
      });
    }

    // 現在のユーザーメッセージを追加
    messages.push({
      role: 'user',
      content: message
    });

    console.log(`🔄 OpenAI API呼び出し中... (会話履歴: ${messages.length}メッセージ)`);

    // OpenAI APIで応答を生成（リトライ処理付き）
    let aiResponse: string = '';
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // GPT-4o-mini: 高性能で低コスト
          messages: messages, // 会話履歴全体を渡す
          temperature: 0.7, // 創造性のバランス（0-2の範囲、0.7が推奨）
          max_tokens: 500, // 応答の最大トークン数
        }, {
          timeout: 30000, // タイムアウト: 30秒
        });

        aiResponse = completion.choices[0]?.message?.content || 'すみません、応答を生成できませんでした。';
        console.log('✅ AI応答生成成功');
        break; // 成功したらループを抜ける

      } catch (apiError: any) {
        retryCount++;
        console.error(`⚠️ OpenAI APIエラー (試行 ${retryCount}/${maxRetries}):`, apiError.message);

        // 最後のリトライでも失敗した場合
        if (retryCount >= maxRetries) {
          // エラーの種類に応じたメッセージ
          if (apiError.code === 'ETIMEDOUT' || apiError.message?.includes('timeout')) {
            throw new Error('AI応答がタイムアウトしました。しばらく待ってから再度お試しください。');
          } else if (apiError.status === 429) {
            throw new Error('リクエストが多すぎます。しばらく待ってから再度お試しください。');
          } else if (apiError.status === 500 || apiError.status === 503) {
            throw new Error('OpenAIサービスが一時的に利用できません。しばらく待ってから再度お試しください。');
          } else {
            throw new Error('AI応答の生成に失敗しました。もう一度お試しください。');
          }
        }

        // リトライ前に少し待つ（指数バックオフ: 1秒 → 2秒 → 4秒）
        const waitTime = Math.pow(2, retryCount - 1) * 1000;
        console.log(`⏳ ${waitTime / 1000}秒待機してリトライします...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

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

