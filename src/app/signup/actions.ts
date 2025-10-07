/**
 * サインアップページのアクション関数
 * 
 * 「新規登録ボタンを押したときの処理」を定義
 * フォームデータを受け取って、実際のユーザー登録処理を実行
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * サインアップ処理
 * @param formData フォームから送信されたデータ
 */
export async function signup(formData: FormData) {
  const supabase = await createClient()

  // フォームからユーザー情報を取得
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  }

  // Supabaseでユーザー登録処理を実行
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name, // ユーザー名をメタデータとして保存
      },
    },
  })

  if (error) {
    // エラーがあった場合はエラーページにリダイレクト
    redirect('/error')
  }

  // 登録成功時はページを更新してワークスペースにリダイレクト
  revalidatePath('/', 'layout')
  redirect('/workspace')
}

/**
 * ログインページへのリダイレクト
 */
export async function login() {
  redirect('/login')
}