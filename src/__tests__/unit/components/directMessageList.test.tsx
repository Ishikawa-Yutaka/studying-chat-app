/**
 * DirectMessageListコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/directMessageList.tsx
 *
 * このテストでは、サイドバーに表示されるDM一覧コンポーネントの
 * 動作を確認します。
 *
 * テストする機能:
 * - DM一覧の表示
 * - アクティブなDMのハイライト
 * - DMリンクの動作
 * - DM開始ボタン
 * - DM削除ボタン
 * - オンライン状態の表示
 * - 最終アクティブ時刻の表示
 * - 「さらに表示」機能
 * - 空の状態表示
 */

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  })),
}))

// lucide-reactのモック
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
}))

// ダイアログコンポーネントのモック
jest.mock('@/components/dm/startDmDialog', () => ({
  __esModule: true,
  default: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="start-dm-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}))

jest.mock('@/components/dm/dmSettingsDialog', () => ({
  __esModule: true,
  default: ({ open, onOpenChange, partnerName }: any) =>
    open ? (
      <div data-testid="dm-settings-dialog">
        <div>{partnerName}</div>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}))

// UserAvatarコンポーネントのモック
jest.mock('@/components/userAvatar', () => ({
  UserAvatar: ({ name, isOnline, showOnlineStatus }: any) => (
    <div data-testid="user-avatar" data-online={isOnline}>
      {name}のアバター
      {showOnlineStatus && isOnline && <span>●</span>}
    </div>
  ),
}))

// formatRelativeTime関数とcn関数のモック
jest.mock('@/lib/utils', () => ({
  formatRelativeTime: jest.fn((date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}分前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}時間前`
    return `${Math.floor(hours / 24)}日前`
  }),
  cn: jest.fn((...inputs) => inputs.filter(Boolean).join(' ')),
}))

import { render, screen, fireEvent } from '@testing-library/react'
import DirectMessageList from '@/components/workspace/directMessageList'

// テスト用のDMデータ
const mockDirectMessages = [
  {
    id: 'dm-1',
    partnerId: 'user-1',
    partnerName: 'テストユーザー1',
    partnerEmail: 'user1@example.com',
    partnerAvatarUrl: 'https://example.com/avatar1.png',
    lastSeen: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'dm-2',
    partnerId: 'user-2',
    partnerName: 'テストユーザー2',
    partnerEmail: 'user2@example.com',
    partnerAvatarUrl: null,
    lastSeen: new Date('2024-01-01T09:00:00Z'),
  },
  {
    id: 'dm-3',
    partnerId: 'user-3',
    partnerName: 'テストユーザー3',
    partnerEmail: 'user3@example.com',
    partnerAvatarUrl: null,
  },
]

describe('DirectMessageList - DM一覧コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * 基本的な表示のテスト
   */
  describe('基本的な表示', () => {
    test('DM一覧が正しく表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
      expect(screen.getByText('テストユーザー2')).toBeInTheDocument()
      expect(screen.getByText('テストユーザー3')).toBeInTheDocument()
    })

    test('DMが0件の場合、「DMがありません」と表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={[]}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      expect(screen.getByText('DMがありません')).toBeInTheDocument()
    })

    test('「ダイレクトメッセージ」というヘッダーが表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      expect(screen.getByText('ダイレクトメッセージ')).toBeInTheDocument()
    })
  })

  /**
   * アクティブなDMのハイライト
   */
  describe('アクティブなDMのハイライト', () => {
    test('現在のpathnameに一致するDMがハイライトされる', () => {
      const mockIsUserOnline = jest.fn(() => false)

      const { container } = render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace/dm/user-1"
          isUserOnline={mockIsUserOnline}
        />
      )

      // アクティブなDMはbg-accentクラスを持つ
      const activeElements = container.querySelectorAll('.bg-accent')
      expect(activeElements.length).toBeGreaterThan(0)
    })
  })

  /**
   * DMリンクの動作
   */
  describe('DMリンク', () => {
    test('各DMに正しいリンクが設定されている', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      const dmLink = screen.getByText('テストユーザー1').closest('a')
      expect(dmLink).toHaveAttribute('href', '/workspace/dm/user-1')
    })

    test('リンククリック時にonLinkClickコールバックが呼ばれる', () => {
      const mockIsUserOnline = jest.fn(() => false)
      const mockOnLinkClick = jest.fn()

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
          onLinkClick={mockOnLinkClick}
        />
      )

      const dmLink = screen.getByText('テストユーザー1').closest('a')
      if (dmLink) {
        fireEvent.click(dmLink)
      }

      expect(mockOnLinkClick).toHaveBeenCalled()
    })
  })

  /**
   * DM開始ボタン
   */
  describe('DM開始ボタン', () => {
    test('検索ボタンをクリックするとDM開始ダイアログが開く', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      const searchIcon = screen.getByTestId('search-icon')
      const searchButton = searchIcon.closest('button')
      if (searchButton) {
        fireEvent.click(searchButton)
      }

      expect(screen.getByTestId('start-dm-dialog')).toBeInTheDocument()
    })
  })

  /**
   * DM削除ボタン
   */
  describe('DM削除ボタン', () => {
    test('削除ボタンが全てのDMに表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      const trashIcons = screen.getAllByTestId('trash-icon')
      expect(trashIcons).toHaveLength(mockDirectMessages.length)
    })

    test('削除ボタンをクリックすると設定ダイアログが表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      const trashIcon = screen.getAllByTestId('trash-icon')[0]
      const deleteButton = trashIcon.closest('button')
      if (deleteButton) {
        fireEvent.click(deleteButton)
      }

      expect(screen.getByTestId('dm-settings-dialog')).toBeInTheDocument()
      // ダイアログ内のテキストを確認
      const dialog = screen.getByTestId('dm-settings-dialog')
      expect(dialog).toHaveTextContent('テストユーザー1')
    })
  })

  /**
   * オンライン状態の表示
   */
  describe('オンライン状態の表示', () => {
    test('オンラインユーザーはUserAvatarにisOnline=trueが渡される', () => {
      const mockIsUserOnline = jest.fn((userId) => userId === 'user-1')

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      const avatars = screen.getAllByTestId('user-avatar')
      expect(avatars[0]).toHaveAttribute('data-online', 'true')
      expect(avatars[1]).toHaveAttribute('data-online', 'false')
    })

    test('isUserOnline関数が各partnerIdで呼ばれる', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      expect(mockIsUserOnline).toHaveBeenCalledWith('user-1')
      expect(mockIsUserOnline).toHaveBeenCalledWith('user-2')
      expect(mockIsUserOnline).toHaveBeenCalledWith('user-3')
    })
  })

  /**
   * 最終アクティブ時刻の表示
   */
  describe('最終アクティブ時刻の表示', () => {
    test('オフラインユーザーにはlastSeenが表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      // lastSeenがあるDMには「〜にアクティブ」と表示される
      const lastSeenTexts = screen.getAllByText(/にアクティブ/)
      expect(lastSeenTexts.length).toBeGreaterThan(0)
    })

    test('オンラインユーザーにはlastSeenが表示されない', () => {
      const mockIsUserOnline = jest.fn((userId) => userId === 'user-1')

      const { container } = render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      // オンラインユーザーの場合、lastSeen表示要素が少ない
      const lastSeenElements = container.querySelectorAll('.text-xs.text-muted-foreground')
      // user-2とuser-3のみ表示される（user-1はオンラインなので非表示）
      expect(lastSeenElements.length).toBeLessThan(mockDirectMessages.length)
    })
  })

  /**
   * 「さらに表示」機能
   */
  describe('さらに表示機能', () => {
    test('DMが5件以下の場合、「さらに表示」ボタンは表示されない', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages.slice(0, 5)}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      expect(screen.queryByText(/さらに表示/)).not.toBeInTheDocument()
    })

    test('DMが6件以上の場合、「さらに表示」ボタンが表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      const manyDms = [
        ...mockDirectMessages,
        {
          id: 'dm-4',
          partnerId: 'user-4',
          partnerName: 'ユーザー4',
          partnerEmail: 'user4@example.com',
        },
        {
          id: 'dm-5',
          partnerId: 'user-5',
          partnerName: 'ユーザー5',
          partnerEmail: 'user5@example.com',
        },
        {
          id: 'dm-6',
          partnerId: 'user-6',
          partnerName: 'ユーザー6',
          partnerEmail: 'user6@example.com',
        },
      ]

      render(
        <DirectMessageList
          directMessages={manyDms}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      expect(screen.getByText(/さらに表示/)).toBeInTheDocument()
    })

    test('「さらに表示」ボタンをクリックすると全てのDMが表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      const manyDms = [
        ...mockDirectMessages,
        {
          id: 'dm-4',
          partnerId: 'user-4',
          partnerName: 'ユーザー4',
          partnerEmail: 'user4@example.com',
        },
        {
          id: 'dm-5',
          partnerId: 'user-5',
          partnerName: 'ユーザー5',
          partnerEmail: 'user5@example.com',
        },
        {
          id: 'dm-6',
          partnerId: 'user-6',
          partnerName: 'ユーザー6',
          partnerEmail: 'user6@example.com',
        },
      ]

      render(
        <DirectMessageList
          directMessages={manyDms}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      const showMoreButton = screen.getByText(/さらに表示/)
      fireEvent.click(showMoreButton)

      // 全てのDMが表示される
      expect(screen.getByText('ユーザー6')).toBeInTheDocument()

      // ボタンのテキストが変わる
      expect(screen.getByText('表示を減らす')).toBeInTheDocument()
    })
  })

  /**
   * UserAvatarの表示
   */
  describe('UserAvatar', () => {
    test('各DMにUserAvatarが表示される', () => {
      const mockIsUserOnline = jest.fn(() => false)

      render(
        <DirectMessageList
          directMessages={mockDirectMessages}
          pathname="/workspace"
          isUserOnline={mockIsUserOnline}
        />
      )

      const avatars = screen.getAllByTestId('user-avatar')
      expect(avatars).toHaveLength(mockDirectMessages.length)
    })
  })
})
