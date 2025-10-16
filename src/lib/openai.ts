/**
 * OpenAI クライアント設定
 *
 * このファイルでは、OpenAI APIとの通信を行うクライアントを設定します。
 * APIキーは環境変数から取得します。
 */

import OpenAI from 'openai';

// 環境変数からAPIキーを取得
const apiKey = process.env.OPENAI_API_KEY;

// APIキーが設定されていない場合はエラーを出す
if (!apiKey || apiKey === 'your_openai_key') {
  console.warn('⚠️ OpenAI APIキーが設定されていません。.env.localファイルにOPENAI_API_KEYを設定してください。');
}

// OpenAIクライアントのインスタンスを作成（Singleton パターン）
export const openai = new OpenAI({
  apiKey: apiKey || '', // APIキーが未設定の場合は空文字
});

/**
 * OpenAI APIキーが有効かどうかをチェック
 */
export function isOpenAIConfigured(): boolean {
  return !!apiKey && apiKey !== 'your_openai_key';
}
