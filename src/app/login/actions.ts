/**
 * ログインページのアクション関数
 *
 * 「ログインボタンを押したときの処理」を定義
 * フォームデータを受け取って、実際のログイン処理を実行
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
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
  const { error } = await supabase.auth.signInWithPassword(data)

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