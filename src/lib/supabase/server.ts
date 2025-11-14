import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// サーバー用Supabaseクライアント
// Next.jsサーバー内で動作し、API呼び出し時の認証チェックやデータベース操作を安全に処理
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true, // XSS攻撃対策: JavaScriptからアクセス不可にする
                secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
                sameSite: 'lax', // CSRF攻撃対策
              })
            )
          } catch {
            // サーバーコンポーネントではcookieの設定ができない場合があるため
            // エラーは無視する（ミドルウェアやRoute Handlerで処理される）
          }
        },
      },
    }
  )
}