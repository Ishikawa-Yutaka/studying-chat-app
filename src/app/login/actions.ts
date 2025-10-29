/**
 * ログインページのアクション関数
 *
 * 「ログインボタンを押したときの処理」を定義
 * フォームデータを受け取って、実際のログイン処理を実行
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'

/**
 * Server Actionの戻り値の型定義
 *
 * エラーがある場合: errorプロパティにメッセージを設定
 * 成功した場合: errorはundefined
 */
type ActionResult = {
  error?: string
}

/**
 * ログイン処理
 *
 * 処理の流れ:
 * 1. フォームデータを取得
 * 2. Zodでバリデーション
 * 3. Supabaseでログイン
 * 4. 成功 → /workspace にリダイレクト
 * 5. 失敗 → エラーメッセージを返す（ページ遷移なし）
 *
 * @param prevState 前回の状態（useFormStateで使用）
 * @param formData フォームから送信されたデータ
 */
export async function login(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  // フォームからメールアドレスとパスワードを取得
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Zodバリデーション
  const validation = loginSchema.safeParse(rawData)

  if (!validation.success) {
    // バリデーションエラー時、最初のエラーメッセージを返す
    const errorMessage = validation.error.issues[0]?.message || 'バリデーションエラー'
    console.error('❌ ログインバリデーションエラー:', errorMessage, validation.error.issues)

    return { error: errorMessage }
  }

  // バリデーション成功後のデータを使用
  const data = validation.data

  // Supabaseでログイン処理を実行
  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Supabaseのエラーメッセージを日本語に変換して返す
    console.error('❌ ログインエラー:', error.message)

    let errorMessage = 'ログインに失敗しました'

    // エラーの種類に応じてメッセージを変更
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'メールアドレスまたはパスワードが正しくありません'
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'メールアドレスが確認されていません。確認メールをご確認ください'
    } else if (error.message.includes('Network request failed')) {
      errorMessage = 'ネットワークエラーが発生しました。接続を確認してください'
    }

    return { error: errorMessage }
  }

  // ログイン成功時: Prismaユーザーを作成/更新
  if (authData.user) {
    try {
      // ユーザー名を取得（メタデータまたはメールアドレスから生成）
      const userName = authData.user.user_metadata?.name ||
                      authData.user.user_metadata?.full_name ||
                      authData.user.email?.split('@')[0] ||
                      'Unknown User'

      // アバターURLを取得
      const avatarUrl = authData.user.user_metadata?.avatar_url ||
                       authData.user.user_metadata?.picture ||
                       null

      await prisma.user.upsert({
        where: { authId: authData.user.id },
        update: {
          // 既存ユーザーの場合は最終ログイン時刻を更新
          lastSeen: new Date(),
        },
        create: {
          // 新規ユーザーの場合は作成（メール確認後の初回ログイン）
          authId: authData.user.id,
          name: userName,
          email: authData.user.email || '',
          avatarUrl: avatarUrl,
          lastSeen: new Date(),
        },
      })
      console.log('✅ Prismaユーザーを作成/更新しました:', authData.user.email)
    } catch (dbError: any) {
      console.error('❌ Prismaユーザー作成/更新エラー:', {
        message: dbError.message,
        code: dbError.code,
      })
      // DB更新失敗してもログインは成功とする（致命的ではない）
    }
  }

  // ログイン成功時はページを更新してワークスペースにリダイレクト
  revalidatePath('/', 'layout')
  redirect('/workspace')
}

/**
 * サインアップページへのリダイレクト
 */
export async function signup() {
  redirect('/signup')
}