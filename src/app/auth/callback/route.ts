import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 認証コールバック処理
// ユーザーがログインした後、Supabaseから送られてくる認証コードを処理し、
// ユーザーをワークスペースページにリダイレクトする
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // 認証コードがある場合の処理
  if (code) {
    const supabase = await createClient()
    
    // 認証コードをセッショントークンに交換
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // ログイン成功：ワークスペースページにリダイレクト
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // 開発環境：localhost にリダイレクト
        return NextResponse.redirect(`${origin}/workspace`)
      } else if (forwardedHost) {
        // 本番環境：適切なホストにリダイレクト
        return NextResponse.redirect(`https://${forwardedHost}/workspace`)
      } else {
        // フォールバック：origin を使用
        return NextResponse.redirect(`${origin}/workspace`)
      }
    }
  }

  // エラーまたは認証コードがない場合：ログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login`)
}