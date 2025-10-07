/**
 * サインアップページ
 * 
 * ユーザーが新規アカウントを作成するページ
 * ユーザー名、メールアドレス、パスワードを入力
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signup, login } from './actions'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ページタイトル */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            新規アカウント作成
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            既にアカウントをお持ちの場合は{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              ログイン
            </Link>
          </p>
        </div>

        {/* サインアップフォーム */}
        <Card>
          <CardHeader>
            <CardTitle>アカウント作成</CardTitle>
            <CardDescription>
              必要な情報を入力してアカウントを作成してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              {/* ユーザー名入力 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  ユーザー名
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="あなたの名前"
                />
              </div>

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
                  autoComplete="new-password"
                  required
                  placeholder="パスワードを入力（8文字以上）"
                  minLength={8}
                />
                <p className="mt-1 text-xs text-gray-500">
                  8文字以上で入力してください
                </p>
              </div>

              {/* ボタン群 */}
              <div className="space-y-2">
                {/* サインアップボタン */}
                <Button formAction={signup} className="w-full">
                  アカウント作成
                </Button>
                
                {/* ログインボタン */}
                <Button formAction={login} variant="outline" className="w-full">
                  ログインはこちら
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}