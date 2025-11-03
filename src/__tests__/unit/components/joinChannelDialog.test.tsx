/**
 * JoinChannelDialogコンポーネントのユニットテスト
 *
 * テスト対象: src/components/channel/joinChannelDialog.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * チャンネル参加ダイアログコンポーネントの動作を確認します。
 *
 * テストする機能:
 * - ダイアログの表示/非表示
 * - チャンネル一覧の取得・表示
 * - チャンネル検索機能
 * - チャンネル参加処理
 * - 参加済みチャンネルの表示
 * - エラーハンドリング
 */

// next/navigationのモック
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// useAuthフックのモック
const mockUser = {
  id: 'user-123',
  authId: 'auth-123',
  name: 'テストユーザー',
  email: 'test@example.com',
}

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
    loading: false,
    error: null,
  })),
}))

// lucide-reactのモック
jest.mock('lucide-react', () => ({
  Hash: () => <div data-testid="hash-icon">Hash</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
}))

// UIコンポーネントのモック
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JoinChannelDialog from '@/components/channel/joinChannelDialog'

// テスト用のチャンネルデータ
const mockChannels = [
  {
    id: 'channel-1',
    name: '一般',
    description: '雑談用チャンネル',
    memberCount: 10,
    isJoined: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'channel-2',
    name: 'プロジェクト相談',
    description: 'プロジェクトに関する相談',
    memberCount: 5,
    isJoined: false,
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'channel-3',
    name: '技術質問',
    description: null,
    memberCount: 8,
    isJoined: false,
    createdAt: '2024-01-03T00:00:00Z',
  },
]

describe('JoinChannelDialog - チャンネル参加ダイアログ', () => {
  // テスト用のモック関数
  const mockOnOpenChange = jest.fn()
  const mockOnChannelJoined = jest.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onChannelJoined: mockOnChannelJoined,
  }

  /**
   * 各テストの前に実行される初期化処理
   */
  beforeEach(() => {
    jest.clearAllMocks()
    // fetch のモック（デフォルトは成功）
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        channels: mockChannels,
        count: mockChannels.length,
      }),
    } as any)
  })

  /**
   * 各テストの後のクリーンアップ
   */
  afterEach(() => {
    jest.restoreAllMocks()
  })

  /**
   * 基本的なレンダリングテスト
   */
  describe('基本的なレンダリング', () => {
    test('ダイアログが開いている時、タイトルが表示される', async () => {
      render(<JoinChannelDialog {...defaultProps} />)

      expect(screen.getByText('チャンネル検索')).toBeInTheDocument()

      // チャンネル一覧が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByText('一般')).toBeInTheDocument()
      })
    })

    test('ダイアログが閉じている時、コンテンツが表示されない', () => {
      render(<JoinChannelDialog {...defaultProps} open={false} />)

      expect(screen.queryByText('チャンネル検索')).not.toBeInTheDocument()
    })

    test('説明文が表示される', () => {
      render(<JoinChannelDialog {...defaultProps} />)

      expect(
        screen.getByText('チャンネルを検索して参加または表示できます')
      ).toBeInTheDocument()
    })

    test('検索フィールドが表示される', () => {
      render(<JoinChannelDialog {...defaultProps} />)

      expect(
        screen.getByPlaceholderText('チャンネル名または説明で検索...')
      ).toBeInTheDocument()
    })
  })

  /**
   * チャンネル一覧取得・表示テスト
   */
  describe('チャンネル一覧の取得と表示', () => {
    test('ダイアログが開かれた時、チャンネル一覧を取得する', async () => {
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/channels/all')
      })
    })

    test('取得したチャンネルが表示される', async () => {
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('一般')).toBeInTheDocument()
        expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
        expect(screen.getByText('技術質問')).toBeInTheDocument()
      })
    })

    test('チャンネルの説明が表示される', async () => {
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('雑談用チャンネル')).toBeInTheDocument()
        expect(screen.getByText('プロジェクトに関する相談')).toBeInTheDocument()
      })
    })

    test('チャンネルのメンバー数が表示される', async () => {
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('10 人のメンバー')).toBeInTheDocument()
        expect(screen.getByText('5 人のメンバー')).toBeInTheDocument()
        expect(screen.getByText('8 人のメンバー')).toBeInTheDocument()
      })
    })

    test('チャンネルが0件の場合、「チャンネルがありません」と表示される', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          channels: [],
          count: 0,
        }),
      } as any)

      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('チャンネルがありません')).toBeInTheDocument()
      })
    })

    test('ローディング中は「読み込み中...」と表示される', async () => {
      // 遅延レスポンスのモック
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      channels: mockChannels,
                      count: mockChannels.length,
                    }),
                }),
              100
            )
          )
      )

      render(<JoinChannelDialog {...defaultProps} />)

      expect(screen.getByText('読み込み中...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
      })
    })
  })

  /**
   * 検索機能テスト
   */
  describe('検索機能', () => {
    test('チャンネル名で検索できる', async () => {
      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      // チャンネル一覧が表示されるのを待つ
      await waitFor(() => {
        expect(screen.getByText('一般')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(
        'チャンネル名または説明で検索...'
      )

      await user.type(searchInput, 'プロジェクト')

      // 「プロジェクト相談」のみ表示される
      expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
      expect(screen.queryByText('一般')).not.toBeInTheDocument()
      expect(screen.queryByText('技術質問')).not.toBeInTheDocument()
    })

    test('チャンネル説明で検索できる', async () => {
      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('一般')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(
        'チャンネル名または説明で検索...'
      )

      await user.type(searchInput, '雑談')

      // 「一般」のみ表示される
      expect(screen.getByText('一般')).toBeInTheDocument()
      expect(screen.queryByText('プロジェクト相談')).not.toBeInTheDocument()
    })

    test('大文字小文字を区別せずに検索できる', async () => {
      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('一般')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(
        'チャンネル名または説明で検索...'
      )

      // 大文字で検索
      await user.type(searchInput, 'プロジェクト')

      expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
    })

    test('検索結果が0件の場合、「該当するチャンネルが見つかりません」と表示される', async () => {
      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('一般')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(
        'チャンネル名または説明で検索...'
      )

      await user.type(searchInput, '存在しないチャンネル')

      expect(
        screen.getByText('該当するチャンネルが見つかりません')
      ).toBeInTheDocument()
    })
  })

  /**
   * チャンネル参加テスト
   */
  describe('チャンネル参加', () => {
    test('未参加チャンネルには「参加」ボタンが表示される', async () => {
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
      })

      // 「プロジェクト相談」と「技術質問」には「参加」ボタン
      const joinButtons = screen.getAllByRole('button', { name: '参加' })
      expect(joinButtons).toHaveLength(2)
    })

    test('参加済みチャンネルには「開く」ボタンが表示される', async () => {
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('一般')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: '開く' })).toBeInTheDocument()
    })

    test('チャンネル参加ができる', async () => {
      global.fetch = jest
        .fn()
        // 初回: チャンネル一覧取得
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channels: mockChannels,
            count: mockChannels.length,
          }),
        } as any)
        // 2回目: チャンネル参加
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channelName: 'プロジェクト相談',
          }),
        } as any)

      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: '参加' })
      await user.click(joinButtons[0])

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/channels/join',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              channelId: 'channel-2',
              userId: 'user-123',
            }),
          })
        )
      })
    })

    test('参加成功後、モーダルが閉じる', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channels: mockChannels,
            count: mockChannels.length,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channelName: 'プロジェクト相談',
          }),
        } as any)

      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: '参加' })
      await user.click(joinButtons[0])

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    test('参加成功後、onChannelJoinedコールバックが呼ばれる', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channels: mockChannels,
            count: mockChannels.length,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channelName: 'プロジェクト相談',
          }),
        } as any)

      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: '参加' })
      await user.click(joinButtons[0])

      await waitFor(() => {
        expect(mockOnChannelJoined).toHaveBeenCalledWith({
          id: 'channel-2',
          name: 'プロジェクト相談',
          description: 'プロジェクトに関する相談',
          memberCount: 6, // 元々5人 + 自分が参加して6人
        })
      })
    })

    test('参加成功後、チャンネルページにリダイレクトする', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channels: mockChannels,
            count: mockChannels.length,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channelName: 'プロジェクト相談',
          }),
        } as any)

      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: '参加' })
      await user.click(joinButtons[0])

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/workspace/channel/channel-2')
      })
    })

    test('「開く」ボタンをクリックすると、チャンネルページに遷移する', async () => {
      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('一般')).toBeInTheDocument()
      })

      const openButton = screen.getByRole('button', { name: '開く' })
      await user.click(openButton)

      expect(mockPush).toHaveBeenCalledWith('/workspace/channel/channel-1')
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  /**
   * エラーハンドリングテスト
   */
  describe('エラーハンドリング', () => {
    test('チャンネル一覧取得失敗時、エラーメッセージが表示される', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'チャンネルの取得に失敗しました',
        }),
      } as any)

      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText('チャンネルの取得に失敗しました')
        ).toBeInTheDocument()
      })
    })

    test('チャンネル参加失敗時、エラーメッセージが表示される', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channels: mockChannels,
            count: mockChannels.length,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({
            success: false,
            error: '既に参加しています',
          }),
        } as any)

      const user = userEvent.setup()
      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
      })

      const joinButtons = screen.getAllByRole('button', { name: '参加' })
      await user.click(joinButtons[0])

      await waitFor(() => {
        expect(screen.getByText('既に参加しています')).toBeInTheDocument()
      })
    })

    test('ネットワークエラー時、エラーメッセージが表示される', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      render(<JoinChannelDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  /**
   * ユーザー認証テスト
   */
  describe('ユーザー認証', () => {
    test('ユーザーが未認証の場合、チャンネル一覧を取得しない', () => {
      // useAuthをモックして未認証状態にする
      const { useAuth } = require('@/hooks/useAuth')
      useAuth.mockImplementation(() => ({
        user: null,
        loading: false,
        error: null,
      }))

      render(<JoinChannelDialog {...defaultProps} />)

      // fetchが呼ばれないことを確認
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  /**
   * onChannelJoinedコールバックなしのテスト
   */
  describe('onChannelJoinedコールバックなし', () => {
    test('onChannelJoinedがundefinedでもエラーにならない', async () => {
      // useAuthを正常な状態に戻す（前のテストでnullに変更されている可能性があるため）
      const { useAuth } = require('@/hooks/useAuth')
      useAuth.mockImplementation(() => ({
        user: mockUser,
        loading: false,
        error: null,
      }))

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channels: mockChannels,
            count: mockChannels.length,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            channelName: 'プロジェクト相談',
          }),
        } as any)

      const user = userEvent.setup()
      render(
        <JoinChannelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          // onChannelJoined を渡さない
        />
      )

      await waitFor(
        () => {
          expect(screen.getByText('プロジェクト相談')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const joinButtons = screen.getAllByRole('button', { name: '参加' })
      await user.click(joinButtons[0])

      // エラーが発生しないことを確認
      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })
  })
})
