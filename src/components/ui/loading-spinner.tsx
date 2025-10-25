/**
 * ローディングスピナーコンポーネント
 *
 * 用途: データ読み込み中の表示
 *
 * 機能:
 * - 回転アニメーション
 * - カスタマイズ可能なサイズとメッセージ
 */

import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  /** スピナーのサイズ（ピクセル） */
  size?: number
  /** 表示するメッセージ */
  message?: string
  /** 全画面表示するか */
  fullScreen?: boolean
}

export function LoadingSpinner({
  size = 40,
  message,
  fullScreen = false
}: LoadingSpinnerProps) {
  const containerClass = fullScreen
    ? 'flex flex-col items-center justify-center min-h-screen'
    : 'flex flex-col items-center justify-center p-8'

  return (
    <div className={containerClass}>
      <Loader2
        className="animate-spin text-blue-600"
        style={{ width: size, height: size }}
      />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
