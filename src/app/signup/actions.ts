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
 * Server Actionの戻り値の型定義
 *
 * エラーがある場合: errorプロパティにメッセージを設定
 * 成功した場合: errorはundefined
 */
type ActionResult = {
  error?: string
}

/**
 * サインアップ処理
 *
 * 処理の流れ:
 * 1. フォームデータを取得
 * 2. Zodでバリデーション
 * 3. Supabaseでユーザー登録
 * 4. Prismaにユーザー情報を保存
 * 5. 成功 → /workspace にリダイレクト
 * 6. 失敗 → エラーメッセージを返す（ページ遷移なし）
 *
 * @param prevState 前回の状態（useFormStateで使用）
 * @param formData フォームから送信されたデータ
 */
export async function signup(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
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
    // バリデーションエラー時、最初のエラーメッセージを返す
    const errorMessage = validation.error.issues[0]?.message || 'バリデーションエラー'
    console.error('❌ サインアップバリデーションエラー:', errorMessage, validation.error.issues)

    return { error: errorMessage }
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
    // Supabaseのエラーメッセージを日本語に変換して返す
    console.error('❌ サインアップエラー:', error.message)

    let errorMessage = 'アカウント作成に失敗しました'

    // エラーの種類に応じてメッセージを変更
    if (error.message.includes('User already registered')) {
      errorMessage = 'このメールアドレスは既に登録されています'
    } else if (error.message.includes('Password should be at least')) {
      errorMessage = 'パスワードは8文字以上で入力してください'
    } else if (error.message.includes('Invalid email')) {
      errorMessage = '正しいメールアドレス形式で入力してください'
    } else if (error.message.includes('Network request failed')) {
      errorMessage = 'ネットワークエラーが発生しました。接続を確認してください'
    }

    return { error: errorMessage }
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
      console.log('✅ Prisma User created successfully')
    } catch (prismaError: any) {
      console.error('❌ Prisma User creation error:', prismaError)

      // Prismaエラーの詳細を確認
      // P2002: ユニーク制約違反（メールアドレスが既に存在）
      if (prismaError.code === 'P2002') {
        return {
          error: 'このメールアドレスは既に登録されています'
        }
      }

      // authIdのユニーク制約違反の場合（既にSupabaseユーザーがPrismaに登録済み）
      if (prismaError.message?.includes('authId')) {
        return {
          error: 'このアカウントは既に登録されています'
        }
      }

      // その他のデータベースエラー
      return {
        error: 'データベースへの保存中にエラーが発生しました。管理者にお問い合わせください'
      }
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