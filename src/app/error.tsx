/**
 * エラーページ
 * 
 * ログインやサインアップでエラーが発生した時に表示されるページ
 * ユーザーに分かりやすいエラーメッセージを表示
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // エラーをログに出力（開発時のデバッグ用）
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">エラーが発生しました</CardTitle>
            <CardDescription>
              申し訳ございません。処理中にエラーが発生しました。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded">
              認証処理でエラーが発生しました。以下をご確認ください：
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>メールアドレスが正しく入力されているか</li>
                <li>パスワードが8文字以上であるか</li>
                <li>インターネット接続が安定しているか</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Button onClick={reset} className="w-full">
                もう一度試す
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">ログインページに戻る</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}