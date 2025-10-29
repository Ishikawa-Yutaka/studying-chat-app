import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 認証コールバック処理
 *
 * 処理の流れ:
 * 1. ユーザーがログインした後、Supabaseから送られてくる認証コードを受け取る
 * 2. 認証コードをセッショントークンに交換
 * 3. ユーザー情報をSupabase Authから取得
 * 4. Prismaデータベースにユーザー情報を同期（ソーシャル認証対応）
 * 5. ワークスペースページにリダイレクト
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // 認証コードがある場合の処理
  if (code) {
    const supabase = await createClient()

    try {
      // 認証コードをセッショントークンに交換
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('❌ セッション交換エラー:', exchangeError)
        return NextResponse.redirect(`${origin}/login`)
      }

      // ログイン成功：ユーザー情報を取得
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('❌ ユーザー取得エラー:', userError)
        return NextResponse.redirect(`${origin}/login`)
      }

      console.log('✅ ユーザー認証成功:', user.email)

      // Prismaデータベースにユーザー情報を同期
      // ソーシャル認証の場合、user_metadataから名前とアバターURLを取得
      // メール認証の場合は、既存のユーザー情報を保持
      const userName = user.user_metadata?.name ||
                      user.user_metadata?.full_name ||
                      user.email?.split('@')[0] ||
                      'Unknown User'

      // OAuthプロバイダーからアバターURLを取得
      // Google: user_metadata.picture
      // GitHub: user_metadata.avatar_url
      const avatarUrl = user.user_metadata?.avatar_url ||
                       user.user_metadata?.picture ||
                       null

      console.log('🔄 Prismaユーザー同期開始:', {
        authId: user.id,
        email: user.email,
        userName,
        avatarUrl: avatarUrl ? '有り' : '無し',
      })

      try {
        const prismaUser = await prisma.user.upsert({
          where: { authId: user.id },
          update: {
            // 既存ユーザーの場合は名前、メール、アバター、最終ログイン時刻を更新
            name: userName,
            email: user.email || '',
            avatarUrl: avatarUrl, // アバターURLを更新（nullの場合は既存値を保持）
            lastSeen: new Date(), // 最終ログイン時刻を更新
          },
          create: {
            // 新規ユーザーの場合は作成
            authId: user.id,
            name: userName,
            email: user.email || '',
            avatarUrl: avatarUrl, // 初回ログイン時にアバターURLを設定
            lastSeen: new Date(), // 初回ログイン時刻を設定
          },
        })

        console.log('✅ Prismaにユーザー情報を同期成功:', {
          id: prismaUser.id,
          authId: prismaUser.authId,
          name: prismaUser.name,
          email: prismaUser.email,
        })
      } catch (dbError: any) {
        console.error('❌ Prismaユーザー同期エラー（詳細）:', {
          error: dbError,
          message: dbError.message,
          code: dbError.code,
          meta: dbError.meta,
        })

        // データベースエラーの場合、ログインページにリダイレクト
        // ユーザーにエラーメッセージを表示
        return NextResponse.redirect(
          `${origin}/login?error=データベース同期エラーが発生しました。再度お試しください。`
        )
      }

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
    } catch (error) {
      console.error('❌ 認証コールバックエラー:', error)
      return NextResponse.redirect(`${origin}/login`)
    }
  }

  // エラーまたは認証コードがない場合：ログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login`)
}