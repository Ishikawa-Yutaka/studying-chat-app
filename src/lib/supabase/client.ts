import { createBrowserClient } from '@supabase/ssr'

// ブラウザ用Supabaseクライアント
// ユーザーのブラウザ内で動作し、ログイン・ログアウトなどの認証機能を提供
export function createClient() {
  // 環境変数からSupabaseの設定を取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // ブラウザ用のSupabaseクライアントを作成（Realtime有効化）
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10 // リアルタイム通信の最大イベント数/秒
      }
    }
  });
}