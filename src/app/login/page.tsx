/**
 * ログインページ
 * 
 * ユーザーがメールアドレスとパスワードを入力してログインするページ
 * 美しいフォームデザインとエラーハンドリングを含む
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { login, signup } from './actions'

export default function LoginPage() {
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
            <CardTitle>ログイン</CardTitle>
            <CardDescription>
              メールアドレスとパスワードを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
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