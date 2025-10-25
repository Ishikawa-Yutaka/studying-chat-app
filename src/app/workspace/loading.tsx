/**
 * ワークスペース（ダッシュボード）ローディングページ
 *
 * Next.js 15 App Routerの機能により、
 * /workspace ページの読み込み中に自動的に表示される
 */

import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function WorkspaceLoading() {
  return <LoadingSpinner fullScreen={true} size={60} />
}
