/**
 * Supabaseクライアント設定（サーバー用）
 * 
 * サーバーサイド（API）からSupabaseにアクセスするためのクライアント
 * より安全な認証処理やデータベース操作に使用します
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  // Next.jsのcookieストアを取得
  const cookieStore = await cookies();

  // サーバー用のSupabaseクライアントを作成
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // クッキーの読み取り（ユーザーのログイン状態を確認）
        getAll() {
          return cookieStore.getAll();
        },
        // クッキーの設定（ログイン状態を保存）
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // サーバーコンポーネントではクッキーの設定ができない場合がある
            // その場合はスキップ
          }
        },
      },
    }
  );
}