/**
 * Supabaseクライアント設定（ブラウザ用）
 * 
 * フロントエンド（React）からSupabaseにアクセスするためのクライアント
 * ユーザー認証、データベース操作に使用します
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // 環境変数からSupabaseの設定を取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // ブラウザ用のSupabaseクライアントを作成（Realtime有効化）
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}