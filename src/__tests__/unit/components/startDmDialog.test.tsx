/**
 * StartDmDialogコンポーネントのユニットテスト
 *
 * テスト対象: src/components/dm/startDmDialog.tsx
 *
 * このテストでは、DM開始ダイアログコンポーネントの
 * 動作を確認します。
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
    user: { id: 'auth-current-user', name: '現在のユーザー' },
    loading: false,
    error: null,
  })),
}))

// PresenceContextのモック
jest.mock('@/contexts/PresenceContext', () => ({
  usePresenceContext: jest.fn(() => ({
    isUserOnline: jest.fn((userId: string) => userId === 'auth-user-1'),
  })),
}))

// Lucide Reactのモック
jest.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-circle-icon">MessageCircle</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
}))

// UIコンポーネントのモック
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="search-input"
    />
  ),
}))

jest.mock('@/components/userAvatar', () => ({
  UserAvatar: ({ name, isOnline }: any) => (
    <div data-testid="user-avatar" data-online={isOnline}>
      {name}
    </div>
  ),
}))

// global.fetchのモック
global.fetch = jest.fn()

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StartDmDialog from '@/components/dm/startDmDialog'
import { useRouter } from 'next/navigation'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// テスト用ユーザーデータ
const mockUsers = [
  {
    id: 'user-1',
    authId: 'auth-user-1',
    name: 'テストユーザー1',
    email: 'user1@example.com',
    avatarUrl: null,
  },
  {
    id: 'user-2',
    authId: 'auth-user-2',
    name: 'テストユーザー2',
    email: 'user2@example.com',
    avatarUrl: null,
  },
  {
    id: 'user-3',
    authId: 'auth-user-3',
    name: '山田太郎',
    email: 'yamada@example.com',
    avatarUrl: null,
  },
]

describe('StartDmDialog - DM開始ダイアログ', () => {
  let mockPush: jest.Mock

  beforeEach(() => {
    mockFetch.mockClear()
    mockPush = jest.fn()
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)
  })

  /**
   * 基本的な表示
   */
  describe('基本的な表示', () => {
    test('open=falseの時、ダイアログは表示されない', () => {
      render(<StartDmDialog open={false} onOpenChange={jest.fn()} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    test('open=trueの時、ダイアログが表示される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('ユーザー検索')
    })

    test('モーダルが開いた時にユーザー一覧を取得する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/users')
      })
    })

    test('ユーザー一覧が表示される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
      })

      expect(screen.getByText('テストユーザー2')).toBeInTheDocument()
      expect(screen.getByText('山田太郎')).toBeInTheDocument()
    })
  })

  /**
   * 検索機能
   */
  describe('検索機能', () => {
    test('検索入力欄が表示される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument()
      })
    })

    test('名前で検索できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
      })

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: '山田' } })

      await waitFor(() => {
        expect(screen.getByText('山田太郎')).toBeInTheDocument()
        expect(screen.queryByText('テストユーザー1')).not.toBeInTheDocument()
      })
    })

    test('メールアドレスで検索できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, users: mockUsers }),
      } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
      })

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: 'user1@' } })

      await waitFor(() => {
        expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
        expect(screen.queryByText('テストユーザー2')).not.toBeInTheDocument()
      })
    })
  })

  /**
   * DM作成機能
   */
  describe('DM作成機能', () => {
    test('ユーザーをクリックするとDMが作成される', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            dmChannel: { id: 'dm-123', partner: mockUsers[0] },
          }),
        } as Response)

      const mockOnDmCreated = jest.fn()

      render(
        <StartDmDialog
          open={true}
          onOpenChange={jest.fn()}
          onDmCreated={mockOnDmCreated}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
      })

      // ユーザーをクリック
      const buttons = screen.getAllByTestId('button')
      const userButton = buttons.find((btn) =>
        btn.textContent?.includes('テストユーザー1')
      )
      if (userButton) {
        fireEvent.click(userButton)
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/dm/auth-user-1'),
          expect.any(Object)
        )
      })

      await waitFor(() => {
        expect(mockOnDmCreated).toHaveBeenCalled()
      })
    })

    test('DM作成後、DMページに遷移する', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            dmChannel: { id: 'dm-123', partner: mockUsers[0] },
          }),
        } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
      })

      const buttons = screen.getAllByTestId('button')
      const userButton = buttons.find((btn) =>
        btn.textContent?.includes('テストユーザー1')
      )
      if (userButton) {
        fireEvent.click(userButton)
      }

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/workspace/dm/auth-user-1')
      })
    })
  })

  /**
   * エラーハンドリング
   */
  describe('エラーハンドリング', () => {
    test('ユーザー一覧の取得に失敗した場合、エラーメッセージが表示される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'ユーザー一覧の取得に失敗しました' }),
      } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('ユーザー一覧の取得に失敗しました')).toBeInTheDocument()
      })
    })

    test('DM作成に失敗した場合、エラーメッセージが表示される', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'DMの作成に失敗しました' }),
        } as Response)

      render(<StartDmDialog open={true} onOpenChange={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('テストユーザー1')).toBeInTheDocument()
      })

      const buttons = screen.getAllByTestId('button')
      const userButton = buttons.find((btn) =>
        btn.textContent?.includes('テストユーザー1')
      )
      if (userButton) {
        fireEvent.click(userButton)
      }

      await waitFor(() => {
        expect(screen.getByText('DMの作成に失敗しました')).toBeInTheDocument()
      })
    })
  })
})
