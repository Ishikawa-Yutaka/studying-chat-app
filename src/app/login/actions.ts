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
 * ログイン処理
 * @param formData フォームから送信されたデータ
 */
export async function login(formData: FormData) {
  const supabase = await createClient()

  // フォームからメールアドレスとパスワードを取得
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Zodバリデーション
  const validation = loginSchema.safeParse(rawData)

  if (!validation.success) {
    // バリデーションエラー時、最初のエラーメッセージをコンソールに出力
    const errorMessage = validation.error.issues[0]?.message || 'バリデーションエラー'
    console.error('❌ ログインバリデーションエラー:', errorMessage, validation.error.issues)

    // TODO: エラーメッセージをユーザーに表示する仕組みを実装
    // 現時点ではコンソールログとリダイレクトのみ
    redirect('/error')
  }

  // バリデーション成功後のデータを使用
  const data = validation.data

  // Supabaseでログイン処理を実行
  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // エラーがあった場合はエラーページにリダイレクト
    redirect('/error')
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