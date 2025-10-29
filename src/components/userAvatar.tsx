/**
 * UserAvatarコンポーネント
 *
 * ユーザーのプロフィール画像を表示するコンポーネント
 * - avatarUrlがある場合：画像を表示
 * - avatarUrlがない場合：名前のイニシャルを表示
 *
 * 使用例:
 * <UserAvatar name="Ishikawa Yutaka" avatarUrl="https://..." size="md" />
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'

interface UserAvatarProps {
  /**
   * ユーザー名
   * イニシャル表示に使用（例：「Ishikawa Yutaka」→「IY」）
   */
  name: string

  /**
   * アバター画像のURL
   * Google/GitHubなどのOAuthプロバイダーまたはSupabase Storageから取得
   */
  avatarUrl?: string | null

  /**
   * アバターのサイズ
   * - sm: 小（24px）メッセージ一覧など
   * - md: 中（40px）デフォルト
   * - lg: 大（56px）プロフィールページなど
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * カスタムクラス名
   * Tailwind CSSのクラスを追加可能
   */
  className?: string

  /**
   * オンライン状態表示を有効にする
   * trueにすると、アバター右下にオンライン状態のドットが表示される
   */
  showOnlineStatus?: boolean

  /**
   * ユーザーのオンライン状態
   * showOnlineStatus が true の時のみ有効
   */
  isOnline?: boolean
}

/**
 * 名前からイニシャルを生成する関数
 *
 * Google方式：最初の1文字のみを表示
 *
 * 例:
 * - "石川 裕" → "石"
 * - "田中太郎" → "田"
 * - "Ishikawa Yutaka" → "I"
 * - "uni" → "U"
 */
function getInitials(name: string): string {
  if (!name || name.trim() === '') return '?'

  // 最初の1文字を大文字で返す
  return name.trim().charAt(0).toUpperCase()
}

/**
 * サイズに応じたCSSクラスを返す
 */
function getSizeClass(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'h-8 w-8 text-xs' // 24px
    case 'md':
      return 'h-10 w-10 text-sm' // 40px
    case 'lg':
      return 'h-14 w-14 text-base' // 56px
    default:
      return 'h-10 w-10 text-sm'
  }
}

/**
 * オンライン状態ドットのサイズを返す
 */
function getOnlineIndicatorSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'w-2.5 h-2.5' // 小さいアバター用（10px）
    case 'md':
      return 'w-3 h-3' // 中サイズアバター用（12px）
    case 'lg':
      return 'w-4 h-4' // 大きいアバター用（16px）
    default:
      return 'w-3 h-3'
  }
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  showOnlineStatus = false,
  isOnline = false,
}: UserAvatarProps) {
  const initials = getInitials(name)
  const sizeClass = getSizeClass(size)
  const indicatorSize = getOnlineIndicatorSize(size)

  return (
    <div className="relative inline-block">
      <Avatar className={`${sizeClass} ${className}`}>
        {/* アバター画像（URLがある場合のみ表示） */}
        {avatarUrl && (
          <AvatarImage
            src={avatarUrl}
            alt={`${name}のアバター`}
            className="object-cover"
          />
        )}

        {/* フォールバック：画像が読み込めない場合またはURLがない場合 */}
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* オンライン状態インジケーター（右下の緑のドット） */}
      {showOnlineStatus && isOnline && (
        <div
          className={`absolute -bottom-0.5 -right-0.5 ${indicatorSize} bg-green-500 border-2 border-white dark:border-gray-800 rounded-full`}
          aria-label="オンライン"
        />
      )}
    </div>
  )
}
