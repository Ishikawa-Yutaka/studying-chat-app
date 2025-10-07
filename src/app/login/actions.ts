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

/**
 * ログイン処理
 * @param formData フォームから送信されたデータ
 */
export async function login(formData: FormData) {
  const supabase = await createClient()

  // フォームからメールアドレスとパスワードを取得
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

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