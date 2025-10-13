import { createBrowserClient } from '@supabase/ssr'

// ブラウザ用Supabaseクライアント
// ユーザーのブラウザ内で動作し、ログイン・ログアウトなどの認証機能を提供
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}