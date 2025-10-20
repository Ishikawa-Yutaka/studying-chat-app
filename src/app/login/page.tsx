/**
 * ログインページ
 *
 * ユーザーがメールアドレスとパスワードを入力してログインするページ
 * ソーシャル認証（Google、GitHub、Twitter、Facebook）にも対応
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Chrome, Github, Twitter, Facebook } from 'lucide-react'
import { signInWithSocial, type SocialProvider, SOCIAL_PROVIDERS } from '@/lib/auth'
import { login, signup } from './actions'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null)

  /**
   * ソーシャルログインボタンがクリックされた時の処理
   */
  const handleSocialLogin = async (provider: SocialProvider) => {
    try {
      setIsLoading(true)
      setSocialProvider(provider)
      await signInWithSocial(provider)
      // 注: この後、プロバイダーの認証画面にリダイレクトされます
    } catch (error) {
      console.error('❌ ソーシャルログインエラー:', error)
      alert('ログインに失敗しました。もう一度お試しください。')
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
        return <Chrome className={iconClass} />
      case 'github':
        return <Github className={iconClass} />
      case 'twitter':
        return <Twitter className={iconClass} />
      case 'facebook':
        return <Facebook className={iconClass} />
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ページタイトル */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            チャットアプリにログイン
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            アカウントをお持ちでない場合は{' '}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              新規登録
            </Link>
          </p>
        </div>

        {/* ログインフォーム */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">ログイン</CardTitle>
            <CardDescription className="text-gray-600">
              メールアドレスとパスワード、またはソーシャルアカウントでログインできます
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ソーシャル認証ボタン */}
            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3">
                {/* Googleログインボタン */}
                <Button
                  type="button"
                  variant="outline"
                  className={SOCIAL_PROVIDERS.google.color}
                  onClick={() => handleSocialLogin('google')}
                  disabled={isLoading}
                >
                  {socialProvider === 'google' ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    getIcon('google')
                  )}
                  <span className="ml-2">Google</span>
                </Button>

                {/* GitHubログインボタン */}
                <Button
                  type="button"
                  variant="outline"
                  className={SOCIAL_PROVIDERS.github.color}
                  onClick={() => handleSocialLogin('github')}
                  disabled={isLoading}
                >
                  {socialProvider === 'github' ? (
                    <span className="animate-spin">⏳</span>
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
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-600">または</span>
              </div>
            </div>

            {/* メール・パスワードログインフォーム */}
            <form className="space-y-4">
              {/* メールアドレス入力 */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="your-email@example.com"
                />
              </div>

              {/* パスワード入力 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="パスワードを入力"
                />
              </div>

              {/* ボタン群 */}
              <div className="space-y-2">
                {/* ログインボタン */}
                <Button formAction={login} className="w-full">
                  ログイン
                </Button>
                
                {/* サインアップボタン */}
                <Button formAction={signup} variant="outline" className="w-full">
                  新規登録はこちら
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}