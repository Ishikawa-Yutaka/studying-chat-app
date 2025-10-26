/**
 * サインアップページ
 *
 * ユーザーが新規アカウントを作成するページ
 * メールアドレス・パスワード、またはソーシャル認証（Google、GitHub、Twitter、Facebook）で登録可能
 */

'use client'

import React, { useState, useActionState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Github, Twitter, Facebook, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { signInWithSocial, type SocialProvider, SOCIAL_PROVIDERS } from '@/lib/auth'
import { signup } from './actions'

/**
 * サインアップボタンコンポーネント
 *
 * useFormStatusを使って送信中の状態を管理
 * 送信中はボタンを無効化してローディング表示
 */
function SignupButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? 'アカウント作成中...' : 'アカウント作成'}
    </Button>
  )
}

/**
 * Googleカラーアイコンコンポーネント
 *
 * Googleの公式ブランドカラーを使用したロゴアイコン
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // useActionStateでサインアップのエラー状態を管理
  // state.error にエラーメッセージが格納される
  const [state, formAction] = useActionState(signup, null)

  /**
   * ソーシャル認証でサインアップする時の処理
   *
   * 注: ソーシャル認証の場合、サインアップとログインは同じ処理
   * 初回アクセス時は自動的にアカウントが作成される
   */
  const handleSocialSignup = async (provider: SocialProvider) => {
    try {
      setIsLoading(true)
      setSocialProvider(provider)
      await signInWithSocial(provider)
      // 注: この後、プロバイダーの認証画面にリダイレクトされます
    } catch (error) {
      console.error('❌ ソーシャルサインアップエラー:', error)
      alert('アカウント作成に失敗しました。もう一度お試しください。')
      setIsLoading(false)
      setSocialProvider(null)
    }
  }

  /**
   * プロバイダーに応じたアイコンを表示
   */
  const getIcon = (provider: SocialProvider) => {
    const iconClass = "w-5 h-5"
    switch (provider) {
      case 'google':
        return <GoogleIcon className={iconClass} />
      case 'github':
        return <Github className={iconClass} />
      case 'twitter':
        return <Twitter className={iconClass} />
      case 'facebook':
        return <Facebook className={iconClass} />
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ページタイトル */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            新規アカウント作成
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            既にアカウントをお持ちの場合は{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              ログインはこちら
            </Link>
          </p>
        </div>

        {/* サインアップフォーム */}
        <Card>
          <CardHeader>
            <CardTitle>アカウント作成</CardTitle>
            <CardDescription>
              メールアドレス・パスワード、またはソーシャルアカウントで登録できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ソーシャル認証ボタン */}
            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3">
                {/* Googleサインアップボタン */}
                <Button
                  type="button"
                  variant="outline"
                  className={SOCIAL_PROVIDERS.google.color}
                  onClick={() => handleSocialSignup('google')}
                  disabled={isLoading}
                >
                  {socialProvider === 'google' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    getIcon('google')
                  )}
                  <span className="ml-2">Google</span>
                </Button>

                {/* GitHubサインアップボタン */}
                <Button
                  type="button"
                  variant="outline"
                  className={SOCIAL_PROVIDERS.github.color}
                  onClick={() => handleSocialSignup('github')}
                  disabled={isLoading}
                >
                  {socialProvider === 'github' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    getIcon('github')
                  )}
                  <span className="ml-2">GitHub</span>
                </Button>
              </div>
            </div>

            {/* 区切り線 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">または</span>
              </div>
            </div>

            {/* メール・パスワードサインアップフォーム */}
            <form action={formAction} className="space-y-4">
              {/* エラーメッセージ表示 */}
              {state?.error && (
                <div className="rounded-md bg-red-50 p-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{state.error}</p>
                </div>
              )}

              {/* ユーザー名入力 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                  ユーザー名
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="あなたの名前"
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  50文字以内で入力してください
                </p>
              </div>

              {/* メールアドレス入力 */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  メールアドレス
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="your-email@example.com"
                  maxLength={255}
                />
              </div>

              {/* パスワード入力 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                  パスワード
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder="パスワードを入力（8文字以上）"
                    minLength={8}
                    maxLength={128}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "パスワードを非表示" : "パスワードを表示"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  8〜128文字で入力してください
                </p>
              </div>

              {/* ボタン群 */}
              <div>
                {/* サインアップボタン */}
                <SignupButton />
              </div>
            </form>

            {/* ログインリンク（フォーム外） */}
            <Link href="/login" className="block w-full mt-4">
              <Button type="button" variant="outline" className="w-full bg-gray-500 hover:bg-gray-600 text-white">
                ログインはこちら
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}