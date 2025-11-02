/**
 * DmHeaderコンポーネントのユニットテスト
 *
 * テスト対象: src/components/dm/dmHeader.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * DMヘッダーコンポーネントの表示を確認します。
 *
 * テストする機能:
 * - DM相手のユーザー名表示
 * - ユーザーアバター表示
 * - オンライン状態の表示
 * - 最終アクティブ時刻の表示
 * - オンライン/オフライン時の表示切り替え
 */

// 依存コンポーネントとユーティリティのモック
jest.mock('@/components/userAvatar', () => ({
  UserAvatar: ({ name, size, showOnlineStatus, isOnline }: any) => (
    <div
      data-testid="user-avatar"
      data-name={name}
      data-size={size}
      data-online={isOnline}
    >
      {name}のアバター
    </div>
  ),
}))

jest.mock('@/lib/utils', () => ({
  formatRelativeTime: (date?: Date) => {
    if (!date) return '不明'
    const now = new Date('2024-01-01T12:00:00Z')
    const target = new Date(date)
    const diffMs = now.getTime() - target.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return '今'
    if (diffMinutes < 60) return `${diffMinutes}分前`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}時間前`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}日前`
  },
}))

import { render, screen } from '@testing-library/react'
import DmHeader from '@/components/dm/dmHeader'

// テスト用のユーザーデータ
const mockOnlineUser = {
  id: 'user-1',
  name: 'テストユーザー1',
  email: 'user1@example.com',
  avatarUrl: 'https://example.com/avatar1.png',
  isOnline: true,
}

const mockOfflineUser = {
  id: 'user-2',
  name: 'テストユーザー2',
  email: 'user2@example.com',
  avatarUrl: 'https://example.com/avatar2.png',
  isOnline: false,
  lastSeen: new Date('2024-01-01T11:00:00Z'), // 1時間前
}

describe('DmHeader - DMヘッダーコンポーネント', () => {
  /**
   * 基本的な表示テスト
   */
  describe('基本的な表示', () => {
    test('DM相手の名前が表示される', () => {
      render(<DmHeader dmPartner={mockOnlineUser} />)

      expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
    })

    test('UserAvatarコンポーネントが表示される', () => {
      render(<DmHeader dmPartner={mockOnlineUser} />)

      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('data-name', 'テストユーザー1')
    })

    test('headerタグでレンダリングされる', () => {
      const { container } = render(<DmHeader dmPartner={mockOnlineUser} />)

      const header = container.querySelector('header')
      expect(header).toBeInTheDocument()
    })

    test('UserAvatarのサイズがmdに設定されている', () => {
      render(<DmHeader dmPartner={mockOnlineUser} />)

      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toHaveAttribute('data-size', 'md')
    })
  })

  /**
   * オンライン状態の表示テスト
   */
  describe('オンライン状態の表示', () => {
    test('オンラインユーザーには「アクティブ」と表示される', () => {
      render(<DmHeader dmPartner={mockOnlineUser} />)

      expect(screen.getByText('アクティブ')).toBeInTheDocument()
    })

    test('オンラインユーザーには緑色のインジケーターが表示される', () => {
      const { container } = render(<DmHeader dmPartner={mockOnlineUser} />)

      const indicator = container.querySelector('.bg-green-500')
      expect(indicator).toBeInTheDocument()
    })

    test('UserAvatarにisOnline=trueが渡される', () => {
      render(<DmHeader dmPartner={mockOnlineUser} />)

      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toHaveAttribute('data-online', 'true')
    })
  })

  /**
   * オフライン状態の表示テスト
   */
  describe('オフライン状態の表示', () => {
    test('オフラインユーザーには最終アクティブ時刻が表示される', () => {
      render(<DmHeader dmPartner={mockOfflineUser} />)

      // formatRelativeTime のモックにより「1時間前」と表示される
      expect(screen.getByText(/1時間前にアクティブ/)).toBeInTheDocument()
    })

    test('オフラインユーザーには灰色のインジケーターが表示される', () => {
      const { container } = render(<DmHeader dmPartner={mockOfflineUser} />)

      const indicator = container.querySelector('.bg-gray-400')
      expect(indicator).toBeInTheDocument()
    })

    test('UserAvatarにisOnline=falseが渡される', () => {
      render(<DmHeader dmPartner={mockOfflineUser} />)

      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toHaveAttribute('data-online', 'false')
    })

    test('lastSeenがundefinedの場合でもエラーにならない', () => {
      const userWithoutLastSeen = {
        ...mockOfflineUser,
        lastSeen: undefined,
      }

      render(<DmHeader dmPartner={userWithoutLastSeen} />)

      // formatRelativeTimeが「不明」を返す
      expect(screen.getByText(/不明にアクティブ/)).toBeInTheDocument()
    })
  })

  /**
   * avatarUrlの扱いテスト
   */
  describe('avatarUrlの扱い', () => {
    test('avatarUrlが設定されている場合、UserAvatarに渡される', () => {
      render(<DmHeader dmPartner={mockOnlineUser} />)

      // UserAvatarコンポーネントがレンダリングされている
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    })

    test('avatarUrlがnullの場合でもエラーにならない', () => {
      const userWithoutAvatar = {
        ...mockOnlineUser,
        avatarUrl: null,
      }

      render(<DmHeader dmPartner={userWithoutAvatar} />)

      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    })

    test('avatarUrlが未定義の場合でもエラーにならない', () => {
      const userWithoutAvatar = {
        id: 'user-3',
        name: 'ユーザー3',
      }

      render(<DmHeader dmPartner={userWithoutAvatar} />)

      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    })
  })

  /**
   * 長い名前の表示テスト
   */
  describe('長い名前の表示', () => {
    test('長いユーザー名が正しく表示される', () => {
      const userWithLongName = {
        ...mockOnlineUser,
        name: 'とても長いユーザー名ですがちゃんと表示されるか確認するテスト',
      }

      render(<DmHeader dmPartner={userWithLongName} />)

      expect(
        screen.getByText(
          'とても長いユーザー名ですがちゃんと表示されるか確認するテスト'
        )
      ).toBeInTheDocument()
    })
  })

  /**
   * 特殊文字を含む名前のテスト
   */
  describe('特殊文字を含む名前', () => {
    test('記号を含むユーザー名が正しく表示される', () => {
      const userWithSpecialChars = {
        ...mockOnlineUser,
        name: 'ユーザー_123-テスト',
      }

      render(<DmHeader dmPartner={userWithSpecialChars} />)

      expect(screen.getByText('ユーザー_123-テスト')).toBeInTheDocument()
    })

    test('絵文字を含むユーザー名が正しく表示される', () => {
      const userWithEmoji = {
        ...mockOnlineUser,
        name: 'テストユーザー🎉',
      }

      render(<DmHeader dmPartner={userWithEmoji} />)

      expect(screen.getByText('テストユーザー🎉')).toBeInTheDocument()
    })
  })

  /**
   * スタイリングのテスト
   */
  describe('スタイリング', () => {
    test('ヘッダーにborder-bクラスが適用されている', () => {
      const { container } = render(<DmHeader dmPartner={mockOnlineUser} />)

      const header = container.querySelector('header')
      expect(header).toHaveClass('border-b')
    })

    test('ユーザー名がfont-semiboldクラスを持つ', () => {
      const { container } = render(<DmHeader dmPartner={mockOnlineUser} />)

      const heading = container.querySelector('h1')
      expect(heading).toHaveClass('font-semibold')
    })

    test('ユーザー名がtext-lgクラスを持つ', () => {
      const { container } = render(<DmHeader dmPartner={mockOnlineUser} />)

      const heading = container.querySelector('h1')
      expect(heading).toHaveClass('text-lg')
    })

    test('オンライン状態インジケーターが丸い形（rounded-full）', () => {
      const { container } = render(<DmHeader dmPartner={mockOnlineUser} />)

      const indicator = container.querySelector('.rounded-full')
      expect(indicator).toBeInTheDocument()
    })
  })

  /**
   * 様々なlastSeenパターンのテスト
   */
  describe('lastSeenの表示パターン', () => {
    test('数分前にアクティブだったユーザー', () => {
      const recentUser = {
        ...mockOfflineUser,
        lastSeen: new Date('2024-01-01T11:55:00Z'), // 5分前
      }

      render(<DmHeader dmPartner={recentUser} />)

      expect(screen.getByText(/5分前にアクティブ/)).toBeInTheDocument()
    })

    test('数日前にアクティブだったユーザー', () => {
      const oldUser = {
        ...mockOfflineUser,
        lastSeen: new Date('2023-12-30T12:00:00Z'), // 2日前
      }

      render(<DmHeader dmPartner={oldUser} />)

      expect(screen.getByText(/2日前にアクティブ/)).toBeInTheDocument()
    })
  })

  /**
   * オンライン状態の切り替えテスト
   */
  describe('オンライン状態の切り替え', () => {
    test('オンラインからオフラインに切り替わると表示が変わる', () => {
      const { rerender } = render(<DmHeader dmPartner={mockOnlineUser} />)

      // オンライン時
      expect(screen.getByText('アクティブ')).toBeInTheDocument()

      // オフラインに変更
      const offlineVersion = {
        ...mockOnlineUser,
        isOnline: false,
        lastSeen: new Date('2024-01-01T11:30:00Z'),
      }
      rerender(<DmHeader dmPartner={offlineVersion} />)

      // オフライン表示に変わる
      expect(screen.getByText(/30分前にアクティブ/)).toBeInTheDocument()
      expect(screen.queryByText('アクティブ')).not.toBeInTheDocument()
    })
  })
})
