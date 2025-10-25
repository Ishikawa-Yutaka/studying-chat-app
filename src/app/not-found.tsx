/**
 * 404 Not Found ページ
 *
 * 存在しないURLにアクセスした時に表示されるページ
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 大きな数字 */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <div className="relative -mt-16">
            <h2 className="text-4xl font-bold text-gray-900">
              ページが見つかりません
            </h2>
          </div>
        </div>

        {/* 説明文 */}
        <p className="text-gray-600 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
          <br />
          URLをご確認いただくか、ホームに戻ってください。
        </p>

        {/* ボタン群 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* ホームに戻るボタン */}
          <Link href="/workspace">
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Home className="h-4 w-4" />
              ダッシュボードに戻る
            </Button>
          </Link>

          {/* ログインページに戻るボタン */}
          <Link href="/login">
            <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              ログインページへ
            </Button>
          </Link>
        </div>

        {/* 追加情報 */}
        <div className="mt-12 text-sm text-gray-500">
          <p>問題が解決しない場合は、管理者にお問い合わせください。</p>
        </div>
      </div>
    </div>
  );
}
