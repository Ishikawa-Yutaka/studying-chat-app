/**
 * ChannelListコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/channelList.tsx
 *
 * このテストでは、サイドバーに表示されるチャンネル一覧コンポーネントの
 * 動作を確認します。
 *
 * テストする機能:
 * - チャンネル一覧の表示
 * - アクティブなチャンネルのハイライト
 * - チャンネルリンクの動作
 * - チャンネル作成・検索ボタン
 * - チャンネル退出・削除ボタンの表示条件
 * - 「さらに表示」機能
 * - 空の状態表示
 */

// Next.jsのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}))

// lucide-reactのモック
jest.mock('lucide-react', () => ({
  Hash: () => <div data-testid="hash-icon">Hash</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
  LogOut: () => <div data-testid="logout-icon">LogOut</div>,
}))

// ダイアログコンポーネントのモック
jest.mock('@/components/workspace/createChannelDialog', () => ({
  __esModule: true,
  default: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="create-channel-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}))

jest.mock('@/components/channel/joinChannelDialog', () => ({
  __esModule: true,
  default: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="join-channel-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}))

// AlertDialogコンポーネントのモック
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="alert-cancel">{children}</button>
  ),
  AlertDialogAction: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="alert-action">{children}</button>
  ),
}))

// global.fetchのモック
global.fetch = jest.fn()

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChannelList from '@/components/workspace/channelList'
import { useRouter } from 'next/navigation'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// テスト用のチャンネルデータ
const mockChannels = [
  {
    id: 'channel-1',
    name: '一般',
    description: '一般的な話題',
    creatorId: 'user-1',
  },
  {
    id: 'channel-2',
    name: '開発',
    description: '開発に関する話題',
    creatorId: 'user-2',
  },
  {
    id: 'channel-3',
    name: '雑談',
    description: '雑談用',
    creatorId: null, // 作成者が削除されたチャンネル
  },
]

describe('ChannelList - チャンネル一覧コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * 基本的な表示のテスト
   */
  describe('基本的な表示', () => {
    test('チャンネル一覧が正しく表示される', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      expect(screen.getByText('一般')).toBeInTheDocument()
      expect(screen.getByText('開発')).toBeInTheDocument()
      expect(screen.getByText('雑談')).toBeInTheDocument()
    })

    test('チャンネルが0件の場合、「チャンネルがありません」と表示される', () => {
      render(
        <ChannelList
          channels={[]}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      expect(screen.getByText('チャンネルがありません')).toBeInTheDocument()
    })

    test('「参加チャンネル」というヘッダーが表示される', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      expect(screen.getByText('参加チャンネル')).toBeInTheDocument()
    })
  })

  /**
   * アクティブなチャンネルのハイライト
   */
  describe('アクティブなチャンネルのハイライト', () => {
    test('現在のpathnameに一致するチャンネルがハイライトされる', () => {
      const { container } = render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace/channel/channel-1"
          currentUserId="user-1"
        />
      )

      // アクティブなチャンネルはbg-accentクラスを持つ
      const activeElements = container.querySelectorAll('.bg-accent')
      expect(activeElements.length).toBeGreaterThan(0)
    })
  })

  /**
   * チャンネルリンクの動作
   */
  describe('チャンネルリンク', () => {
    test('各チャンネルに正しいリンクが設定されている', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      const channelLink = screen
        .getByText('一般')
        .closest('a')
      expect(channelLink).toHaveAttribute('href', '/workspace/channel/channel-1')
    })

    test('リンククリック時にonLinkClickコールバックが呼ばれる', () => {
      const mockOnLinkClick = jest.fn()

      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
          onLinkClick={mockOnLinkClick}
        />
      )

      const channelLink = screen.getByText('一般').closest('a')
      if (channelLink) {
        fireEvent.click(channelLink)
      }

      expect(mockOnLinkClick).toHaveBeenCalled()
    })
  })

  /**
   * チャンネル作成・検索ボタン
   */
  describe('チャンネル作成・検索ボタン', () => {
    test('チャンネル作成ボタンをクリックすると作成ダイアログが開く', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      // Plusアイコンを探してクリック
      const plusIcon = screen.getByTestId('plus-icon')
      const createButton = plusIcon.closest('button')
      if (createButton) {
        fireEvent.click(createButton)
      }

      expect(screen.getByTestId('create-channel-dialog')).toBeInTheDocument()
    })

    test('チャンネル検索ボタンをクリックすると検索ダイアログが開く', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      const searchIcon = screen.getByTestId('search-icon')
      const searchButton = searchIcon.closest('button')
      if (searchButton) {
        fireEvent.click(searchButton)
      }

      expect(screen.getByTestId('join-channel-dialog')).toBeInTheDocument()
    })
  })

  /**
   * チャンネル退出機能
   */
  describe('チャンネル退出機能', () => {
    test('退出ボタンが全てのチャンネルに表示される', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      const logoutIcons = screen.getAllByTestId('logout-icon')
      expect(logoutIcons).toHaveLength(mockChannels.length)
    })

    test('退出ボタンをクリックすると確認ダイアログが表示される', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      const logoutIcon = screen.getAllByTestId('logout-icon')[0]
      const leaveButton = logoutIcon.closest('button')
      if (leaveButton) {
        fireEvent.click(leaveButton)
      }

      expect(
        screen.getByText('チャンネルから退出しますか？')
      ).toBeInTheDocument()
    })

    test('退出確認ダイアログで「退出する」をクリックするとAPI呼び出しが行われる', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, channelName: '一般' }),
      } as Response)

      const mockOnChannelLeft = jest.fn()

      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
          onChannelLeft={mockOnChannelLeft}
        />
      )

      // 退出ボタンをクリック
      const logoutIcon = screen.getAllByTestId('logout-icon')[0]
      const leaveButton = logoutIcon.closest('button')
      if (leaveButton) {
        fireEvent.click(leaveButton)
      }

      // 確認ダイアログで「退出する」をクリック
      const confirmButton = screen.getByText('退出する')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/channels/leave/channel-1',
          { method: 'DELETE' }
        )
      })

      expect(mockOnChannelLeft).toHaveBeenCalledWith('channel-1')
    })

    test('退出時にエラーが発生した場合、アラートが表示される', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'エラーが発生しました' }),
      } as Response)

      // window.alertのモック
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation()

      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      const logoutIcon = screen.getAllByTestId('logout-icon')[0]
      const leaveButton = logoutIcon.closest('button')
      if (leaveButton) {
        fireEvent.click(leaveButton)
      }

      const confirmButton = screen.getByText('退出する')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('エラーが発生しました')
      })

      mockAlert.mockRestore()
    })
  })

  /**
   * チャンネル削除機能（作成者のみ）
   */
  describe('チャンネル削除機能', () => {
    test('自分が作成したチャンネルには削除ボタンが表示される', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      // 削除アイコンが存在することを確認
      const trashIcons = screen.getAllByTestId('trash-icon')
      expect(trashIcons.length).toBeGreaterThan(0)
    })

    test('他人が作成したチャンネルの削除ボタンは非表示になる', () => {
      const { container } = render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      // invisibleクラスを持つ削除ボタンが存在することを確認
      const invisibleButtons = container.querySelectorAll('.invisible')
      expect(invisibleButtons.length).toBeGreaterThan(0)
    })

    test('作成者がnullのチャンネルは全員が削除できる', () => {
      render(
        <ChannelList
          channels={[mockChannels[2]]} // creatorId=null
          pathname="/workspace"
          currentUserId="user-999"
        />
      )

      const trashIcons = screen.getAllByTestId('trash-icon')
      expect(trashIcons.length).toBe(1)

      // 削除ボタンがinvisibleクラスを持たないことを確認
      const trashIcon = trashIcons[0]
      const deleteButton = trashIcon.closest('button')
      expect(deleteButton).not.toHaveClass('invisible')
    })

    test('削除ボタンをクリックすると削除確認ダイアログが表示される', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      const trashIcon = screen.getAllByTestId('trash-icon')[0]
      const deleteButton = trashIcon.closest('button')
      if (deleteButton && !deleteButton.classList.contains('invisible')) {
        fireEvent.click(deleteButton)
      }

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('本当に削除しますか？')
    })
  })

  /**
   * 「さらに表示」機能
   */
  describe('さらに表示機能', () => {
    test('チャンネルが5件以下の場合、「さらに表示」ボタンは表示されない', () => {
      render(
        <ChannelList
          channels={mockChannels.slice(0, 5)}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      expect(screen.queryByText(/さらに表示/)).not.toBeInTheDocument()
    })

    test('チャンネルが6件以上の場合、「さらに表示」ボタンが表示される', () => {
      const manyChannels = [
        ...mockChannels,
        { id: 'ch-4', name: 'チャンネル4', creatorId: 'user-1' },
        { id: 'ch-5', name: 'チャンネル5', creatorId: 'user-1' },
        { id: 'ch-6', name: 'チャンネル6', creatorId: 'user-1' },
      ]

      render(
        <ChannelList
          channels={manyChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      expect(screen.getByText(/さらに表示/)).toBeInTheDocument()
    })

    test('「さらに表示」ボタンをクリックすると全てのチャンネルが表示される', () => {
      const manyChannels = [
        ...mockChannels,
        { id: 'ch-4', name: 'チャンネル4', creatorId: 'user-1' },
        { id: 'ch-5', name: 'チャンネル5', creatorId: 'user-1' },
        { id: 'ch-6', name: 'チャンネル6', creatorId: 'user-1' },
      ]

      render(
        <ChannelList
          channels={manyChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      const showMoreButton = screen.getByText(/さらに表示/)
      fireEvent.click(showMoreButton)

      // 全てのチャンネルが表示される
      expect(screen.getByText('チャンネル6')).toBeInTheDocument()

      // ボタンのテキストが変わる
      expect(screen.getByText('表示を減らす')).toBeInTheDocument()
    })
  })

  /**
   * Hashアイコンの表示
   */
  describe('Hashアイコン', () => {
    test('各チャンネルにHashアイコンが表示される', () => {
      render(
        <ChannelList
          channels={mockChannels}
          pathname="/workspace"
          currentUserId="user-1"
        />
      )

      const hashIcons = screen.getAllByTestId('hash-icon')
      expect(hashIcons).toHaveLength(mockChannels.length)
    })
  })
})
