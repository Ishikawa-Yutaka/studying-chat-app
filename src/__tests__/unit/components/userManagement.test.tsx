/**
 * UserManagementコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/userManagement.tsx
 *
 * このテストでは、ユーザー管理コンポーネントの
 * 動作を確認します。
 *
 * テストする機能:
 * - ユーザー一覧の表示
 * - ユーザー検索機能
 * - DM作成機能
 * - チャンネル招待機能
 * - オンライン状態表示
 * - エラーハンドリング
 */

// next/navigationのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}))

// useAuthのモック
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'current-user-id', name: '現在のユーザー' },
    loading: false,
    error: null,
  })),
}))

// PresenceContextのモック
jest.mock('@/contexts/PresenceContext', () => ({
  usePresenceContext: jest.fn(() => ({
    isUserOnline: jest.fn((userId: string) => userId === 'online-user-auth-id'),
  })),
}))

// Lucide Reactのモック
jest.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-circle-icon">MessageCircle</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  UserPlus: () => <div data-testid="user-plus-icon">UserPlus</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
}))

// UIコンポーネントのモック
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid="button">
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      data-testid="search-input"
    />
  ),
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => (
    <div data-testid="dialog-description">{children}</div>
  ),
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange('test-channel-id')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
}))

jest.mock('@/components/userAvatar', () => ({
  UserAvatar: ({ name, avatarUrl, isOnline, size }: any) => (
    <div
      data-testid="user-avatar"
      data-name={name}
      data-avatar-url={avatarUrl}
      data-online={isOnline}
      data-size={size}
    >
      {name}
    </div>
  ),
}))

// global.fetchのモック
global.fetch = jest.fn()

// global.alertのモック
global.alert = jest.fn()

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UserManagement from '@/components/workspace/userManagement'
import { useRouter } from 'next/navigation'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockAlert = global.alert as jest.MockedFunction<typeof alert>

// テスト用ユーザーデータ
const mockUsers = [
  {
    id: 'user-1',
    authId: 'online-user-auth-id',
    name: 'オンラインユーザー',
    email: 'online@example.com',
    avatarUrl: null,
  },
  {
    id: 'user-2',
    authId: 'offline-user-auth-id',
    name: 'オフラインユーザー',
    email: 'offline@example.com',
    avatarUrl: null,
  },
  {
    id: 'user-3',
    authId: 'test-user-auth-id',
    name: '山田太郎',
    email: 'yamada@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
]

// テスト用チャンネルデータ
const mockChannels = [
  { id: 'channel-1', name: '一般', description: '一般チャンネル' },
  { id: 'channel-2', name: '開発', description: '開発チャンネル' },
]

describe('UserManagement - ユーザー管理', () => {
  let mockPush: jest.Mock

  beforeEach(() => {
    mockFetch.mockClear()
    mockAlert.mockClear()
    mockPush = jest.fn()
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)

    // デフォルトのfetchレスポンスを設定
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, users: mockUsers, channels: mockChannels }),
    } as Response)
  })

  /**
   * 基本的な表示
   */
  describe('基本的な表示', () => {
    test('コンポーネントが正しくレンダリングされる', async () => {
      render(<UserManagement />)

      expect(screen.getByText('ユーザー管理')).toBeInTheDocument()
      expect(screen.getByTestId('search-input')).toBeInTheDocument()
      expect(screen.getByTestId('users-icon')).toBeInTheDocument()
      expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    })

    test('ユーザー一覧が取得され表示される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/users')
      })

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      expect(screen.getAllByText('オフラインユーザー').length).toBeGreaterThan(0)
      expect(screen.getAllByText('山田太郎').length).toBeGreaterThan(0)
    })

    test('ローディング中の表示', () => {
      // fetchを遅延させる
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true, users: mockUsers }),
                } as Response),
              100
            )
          )
      )

      render(<UserManagement />)

      expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    })

    test('ユーザーが0件の場合のメッセージ表示', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: [] }),
      } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getByText('ユーザーがいません')).toBeInTheDocument()
      })
    })

    test('オンライン状態が正しく表示される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      // オンラインユーザーには「アクティブ」表示
      expect(screen.getByText('アクティブ')).toBeInTheDocument()

      // UserAvatarにオンライン状態が渡されているか確認
      const avatars = screen.getAllByTestId('user-avatar')
      const onlineAvatar = avatars.find((el) => el.getAttribute('data-name') === 'オンラインユーザー')
      expect(onlineAvatar).toHaveAttribute('data-online', 'true')
    })
  })

  /**
   * 検索機能
   */
  describe('検索機能', () => {
    test('名前で検索できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: '山田' } })

      await waitFor(() => {
        expect(screen.getAllByText('山田太郎').length).toBeGreaterThan(0)
        expect(screen.queryAllByText('オンラインユーザー').length).toBe(0)
      })
    })

    test('メールアドレスで検索できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: 'offline@' } })

      await waitFor(() => {
        expect(screen.getAllByText('オフラインユーザー').length).toBeGreaterThan(0)
        expect(screen.queryAllByText('オンラインユーザー').length).toBe(0)
      })
    })

    test('検索結果が0件の場合のメッセージ表示', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: '存在しないユーザー' } })

      await waitFor(() => {
        expect(screen.getByText('該当するユーザーが見つかりません')).toBeInTheDocument()
      })
    })
  })

  /**
   * DM作成機能
   */
  describe('DM作成機能', () => {
    test('DMボタンをクリックするとDMが作成される', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, channels: mockChannels }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, dmChannel: { id: 'dm-123' } }),
        } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      // DMボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const dmButton = buttons.find((btn) => btn.querySelector('[data-testid="message-circle-icon"]'))
      if (dmButton) {
        fireEvent.click(dmButton)
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/dm/online-user-auth-id'),
          expect.any(Object)
        )
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/workspace/dm/online-user-auth-id')
      })
    })

    test('DM作成が失敗した場合、エラーメッセージが表示される', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, channels: mockChannels }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'DM作成エラー' }),
        } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      const buttons = screen.getAllByTestId('button')
      const dmButton = buttons.find((btn) => btn.querySelector('[data-testid="message-circle-icon"]'))
      if (dmButton) {
        fireEvent.click(dmButton)
      }

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('DMの作成に失敗しました: DM作成エラー')
      })
    })
  })

  /**
   * チャンネル招待機能
   */
  describe('チャンネル招待機能', () => {
    test('招待ボタンをクリックすると招待ダイアログが表示される', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, channels: mockChannels }),
        } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      // 招待ボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const inviteButton = buttons.find((btn) => btn.querySelector('[data-testid="user-plus-icon"]'))
      if (inviteButton) {
        fireEvent.click(inviteButton)
      }

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
        expect(screen.getByTestId('dialog-title')).toHaveTextContent('チャンネルに招待')
      })
    })

    test('招待ダイアログでチャンネルを選択して招待できる', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, channels: mockChannels }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      // 招待ボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const inviteButton = buttons.find((btn) => btn.querySelector('[data-testid="user-plus-icon"]'))
      if (inviteButton) {
        fireEvent.click(inviteButton)
      }

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })

      // チャンネルを選択（モックでは自動的に test-channel-id が選択される）
      const select = screen.getByTestId('select')
      fireEvent.click(select)

      // 招待するボタンをクリック
      const dialogButtons = screen.getAllByTestId('button')
      const submitButton = dialogButtons.find((btn) => btn.textContent?.includes('招待する'))
      if (submitButton) {
        fireEvent.click(submitButton)
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/channel-members',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          expect.stringContaining('をチャンネルに招待しました')
        )
      })
    })

    test('招待ダイアログでキャンセルできる', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, channels: mockChannels }),
        } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      // 招待ボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const inviteButton = buttons.find((btn) => btn.querySelector('[data-testid="user-plus-icon"]'))
      if (inviteButton) {
        fireEvent.click(inviteButton)
      }

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })

      // キャンセルボタンをクリック
      const dialogButtons = screen.getAllByTestId('button')
      const cancelButton = dialogButtons.find((btn) => btn.textContent?.includes('キャンセル'))
      if (cancelButton) {
        fireEvent.click(cancelButton)
      }

      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
      })
    })

    test('招待が失敗した場合、エラーメッセージが表示される', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, channels: mockChannels }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: '招待エラー' }),
        } as Response)

      render(<UserManagement />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      // 招待ボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const inviteButton = buttons.find((btn) => btn.querySelector('[data-testid="user-plus-icon"]'))
      if (inviteButton) {
        fireEvent.click(inviteButton)
      }

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })

      // チャンネルを選択
      const select = screen.getByTestId('select')
      fireEvent.click(select)

      // 招待するボタンをクリック
      const dialogButtons = screen.getAllByTestId('button')
      const submitButton = dialogButtons.find((btn) => btn.textContent?.includes('招待する'))
      if (submitButton) {
        fireEvent.click(submitButton)
      }

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('招待に失敗しました: 招待エラー')
      })
    })
  })

  /**
   * コールバック機能
   */
  describe('コールバック機能', () => {
    test('DM作成後にonUserUpdateが呼ばれる', async () => {
      const mockOnUserUpdate = jest.fn()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, channels: mockChannels }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, dmChannel: { id: 'dm-123' } }),
        } as Response)

      render(<UserManagement onUserUpdate={mockOnUserUpdate} />)

      await waitFor(() => {
        expect(screen.getAllByText('オンラインユーザー').length).toBeGreaterThan(0)
      })

      // DMボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const dmButton = buttons.find((btn) => btn.querySelector('[data-testid="message-circle-icon"]'))
      if (dmButton) {
        fireEvent.click(dmButton)
      }

      await waitFor(() => {
        expect(mockOnUserUpdate).toHaveBeenCalled()
      })
    })
  })
})
