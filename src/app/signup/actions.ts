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
import { prisma } from '@/lib/prisma'
import { signupSchema } from '@/lib/validations'

/**
 * サインアップ処理
 * @param formData フォームから送信されたデータ
 */
export async function signup(formData: FormData) {
  const supabase = await createClient()

  // フォームからユーザー情報を取得
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  }

  // Zodバリデーション
  const validation = signupSchema.safeParse(rawData)

  if (!validation.success) {
    // バリデーションエラー時、最初のエラーメッセージをコンソールに出力
    const errorMessage = validation.error.issues[0]?.message || 'バリデーションエラー'
    console.error('❌ サインアップバリデーションエラー:', errorMessage, validation.error.issues)

    // TODO: エラーメッセージをユーザーに表示する仕組みを実装
    // 現時点ではコンソールログとリダイレクトのみ
    redirect('/error')
  }

  // バリデーション成功後のデータを使用
  const data = validation.data

  // Supabaseでユーザー登録処理を実行
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name, // ユーザー名をメタデータとして保存
      },
    },
  })

  if (error) {
    console.error('Supabase Auth Error:', error.message)
    redirect('/error')
  }

  // Supabaseユーザー作成成功時、Prismaにもユーザーレコードを作成
  if (authData.user) {
    try {
      await prisma.user.create({
        data: {
          authId: authData.user.id,     // Supabaseユーザーの ID
          email: data.email,
          name: data.name,
        },
      })
      console.log('Prisma User created successfully')
    } catch (prismaError) {
      console.error('Prisma User creation error:', prismaError)
      // Prisma側のエラーでもユーザーは作成されているので、続行
    }
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