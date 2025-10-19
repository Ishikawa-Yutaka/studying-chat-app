/**
 * ソーシャル認証ヘルパー関数
 *
 * Google、GitHub、Twitter/X、Facebookでのログインを簡単に実装するための関数を提供
 */

import { createClient } from '@/lib/supabase/client'

/**
 * サポートされているソーシャル認証プロバイダーの型定義
 */
export type SocialProvider = 'google' | 'github' | 'twitter' | 'facebook'

/**
 * ソーシャル認証プロバイダーの表示情報
 */
export const SOCIAL_PROVIDERS = {
  google: {
    name: 'Google',
    color: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300',
  },
  github: {
    name: 'GitHub',
    color: 'bg-gray-900 hover:bg-gray-800 text-white',
  },
  twitter: {
    name: 'Twitter',
    color: 'bg-sky-500 hover:bg-sky-600 text-white',
  },
  facebook: {
    name: 'Facebook',
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
} as const

/**
 * ソーシャル認証でログインする関数
 *
 * 処理の流れ:
 * 1. Supabaseクライアントを作成
 * 2. 指定されたプロバイダー（Google、GitHubなど）の認証画面にリダイレクト
 * 3. ユーザーがログイン・認可
 * 4. Supabaseのコールバック経由でアプリに戻る
 * 5. /auth/callback で認証コードをセッションに交換
 * 6. ワークスペースページにリダイレクト
 *
 * @param provider - 認証プロバイダー（'google' | 'github' | 'twitter' | 'facebook'）
 * @returns Promise<void>
 *
 * 使用例:
 * ```tsx
 * <button onClick={() => signInWithSocial('google')}>
 *   Googleでログイン
 * </button>
 * ```
 */
export async function signInWithSocial(provider: SocialProvider): Promise<void> {
  const supabase = createClient()

  try {
    console.log(`🔄 ${SOCIAL_PROVIDERS[provider].name}でのログインを開始...`)

    // ソーシャル認証を実行
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // リダイレクト先URL（認証成功後に戻ってくるURL）
        redirectTo: `${window.location.origin}/auth/callback`,
        // スコープ（取得する情報の範囲）
        // 各プロバイダーで必要な情報を取得
        scopes: provider === 'github' ? 'read:user user:email' : undefined,
      },
    })

    if (error) {
      console.error(`❌ ${SOCIAL_PROVIDERS[provider].name}ログインエラー:`, error)
      throw error
    }

    console.log(`✅ ${SOCIAL_PROVIDERS[provider].name}認証画面にリダイレクト中...`)

    // 注: この後、プロバイダーの認証画面にリダイレクトされるため、
    // この関数はここで終了します。認証完了後は /auth/callback に戻ります。
  } catch (error) {
    console.error('❌ ソーシャル認証エラー:', error)
    throw error
  }
}

/**
 * ソーシャル認証プロバイダーのアイコンを取得
 *
 * lucide-reactのアイコンコンポーネント名を返します
 *
 * @param provider - 認証プロバイダー
 * @returns アイコンコンポーネント名（文字列）
 */
export function getProviderIcon(provider: SocialProvider): string {
  const icons = {
    google: 'Chrome', // Googleのアイコンの代替
    github: 'Github',
    twitter: 'Twitter',
    facebook: 'Facebook',
  }
  return icons[provider]
}
