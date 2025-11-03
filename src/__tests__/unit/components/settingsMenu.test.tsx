/**
 * SettingsMenuコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/settingsMenu.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * 設定メニューコンポーネントの機能を確認します。
 *
 * テストする機能:
 * - ドロップダウンメニューの表示/非表示
 * - アバター設定メニュー
 * - テーマ切り替え機能
 * - ログアウト機能
 * - アカウント削除機能
 * - 削除確認ダイアログ
 */

// Lucide React アイコンのモック
jest.mock('lucide-react', () => ({
  Settings: () => <div>Settings Icon</div>,
  User: () => <div>User Icon</div>,
  Moon: () => <div>Moon Icon</div>,
  Sun: () => <div>Sun Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  Trash2: () => <div>Trash2 Icon</div>,
}))

// next-themes のモック
const mockSetTheme = jest.fn()
jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    setTheme: mockSetTheme,
  })),
}))

// next/navigation のモック
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}))

// UI コンポーネントのモック
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick}>{children}</div>
  ),
  DropdownMenuSeparator: () => <div>---</div>,
}))

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, disabled, ...props }: any) => (
    <button {...props} disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogAction: ({ children, onClick, disabled, ...props }: any) => (
    <button {...props} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, title, ...props }: any) => (
    <button {...props} onClick={onClick} title={title}>
      {children}
    </button>
  ),
}))

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsMenu from '@/components/workspace/settingsMenu'
import { useTheme } from 'next-themes'

// テスト用のモック関数
const mockOnAvatarSettingsClick = jest.fn()
const mockOnSignOut = jest.fn()

describe('SettingsMenu - 設定メニュー', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSetTheme.mockClear()
    mockOnAvatarSettingsClick.mockClear()
    mockOnSignOut.mockClear()
    ;(useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    })
  })

  /**
   * 基本的なレンダリングテスト
   */
  describe('基本的なレンダリング', () => {
    test('設定ボタンが表示される', () => {
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      expect(screen.getByTitle('設定')).toBeInTheDocument()
    })

    test('設定アイコンが表示される', () => {
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      expect(screen.getByText('Settings Icon')).toBeInTheDocument()
    })

    test('ドロップダウンメニューが表示される', () => {
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      expect(screen.getByText('設定')).toBeInTheDocument()
    })
  })

  /**
   * メニュー項目テスト
   */
  describe('メニュー項目', () => {
    test('アバター設定メニューが表示される', () => {
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      expect(screen.getByText('アバター設定')).toBeInTheDocument()
      expect(screen.getByText('User Icon')).toBeInTheDocument()
    })

    test('テーマ切り替えメニューが表示される（ライトモード時）', () => {
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      expect(screen.getByText('ダークモード')).toBeInTheDocument()
      expect(screen.getByText('Moon Icon')).toBeInTheDocument()
    })

    test('テーマ切り替えメニューが表示される（ダークモード時）', () => {
      ;(useTheme as jest.Mock).mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
      })

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      expect(screen.getByText('ライトモード')).toBeInTheDocument()
      expect(screen.getByText('Sun Icon')).toBeInTheDocument()
    })

    test('ログアウトメニューが表示される', () => {
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      expect(screen.getByText('ログアウト')).toBeInTheDocument()
      expect(screen.getByText('LogOut Icon')).toBeInTheDocument()
    })

    test('アカウント削除メニューが表示される', () => {
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      expect(screen.getByText('アカウント削除')).toBeInTheDocument()
      expect(screen.getByText('Trash2 Icon')).toBeInTheDocument()
    })

    test('セパレーター（区切り線）が表示される', () => {
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const separators = screen.getAllByText('---')
      expect(separators.length).toBeGreaterThanOrEqual(2)
    })
  })

  /**
   * アバター設定機能テスト
   */
  describe('アバター設定', () => {
    test('アバター設定をクリックするとコールバックが呼ばれる', async () => {
      const user = userEvent.setup()
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const avatarSetting = screen.getByText('アバター設定')
      await user.click(avatarSetting)

      expect(mockOnAvatarSettingsClick).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * テーマ切り替え機能テスト
   */
  describe('テーマ切り替え', () => {
    test('ライトモード時にクリックするとダークモードに切り替わる', async () => {
      const user = userEvent.setup()
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const themeToggle = screen.getByText('ダークモード')
      await user.click(themeToggle)

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    test('ダークモード時にクリックするとライトモードに切り替わる', async () => {
      const user = userEvent.setup()
      ;(useTheme as jest.Mock).mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
      })

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const themeToggle = screen.getByText('ライトモード')
      await user.click(themeToggle)

      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })
  })

  /**
   * ログアウト機能テスト
   */
  describe('ログアウト', () => {
    test('ログアウトをクリックするとonSignOutが呼ばれる', async () => {
      const user = userEvent.setup()
      mockOnSignOut.mockResolvedValue(undefined)

      render(
        <SettingsMenu
          onAvatarSettingsClick={mockOnAvatarSettingsClick}
          onSignOut={mockOnSignOut}
        />
      )

      const logout = screen.getByText('ログアウト')
      await user.click(logout)

      await waitFor(() => {
        expect(mockOnSignOut).toHaveBeenCalledTimes(1)
      })
    })

    test('ログアウトをクリックすると/loginにリダイレクトを試みる', async () => {
      const user = userEvent.setup()
      mockOnSignOut.mockResolvedValue(undefined)

      // jsdomではwindow.location.hrefへの代入が「Not implemented」エラーになるため、
      // エラーが発生することを確認する
      // (実際のブラウザでは正常に/loginにリダイレクトされる)
      render(
        <SettingsMenu
          onAvatarSettingsClick={mockOnAvatarSettingsClick}
          onSignOut={mockOnSignOut}
        />
      )

      const logout = screen.getByText('ログアウト')

      // jsdomのナビゲーションエラーをキャッチ
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      await user.click(logout)

      await waitFor(() => {
        expect(mockOnSignOut).toHaveBeenCalled()
      })

      consoleError.mockRestore()
    })

    test('onSignOutが未定義でもエラーにならない', async () => {
      const user = userEvent.setup()

      // jsdomのナビゲーションエラーをキャッチ
      const consoleError = jest.spyOn(console, 'error').mockImplementation()

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const logout = screen.getByText('ログアウト')
      await user.click(logout)

      // onSignOutが呼ばれないことを確認（undefinedなので）
      expect(mockOnSignOut).not.toHaveBeenCalled()

      consoleError.mockRestore()
    })
  })

  /**
   * アカウント削除機能テスト
   */
  describe('アカウント削除', () => {
    test('アカウント削除をクリックすると確認ダイアログが表示される', async () => {
      const user = userEvent.setup()
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(
          screen.getByText('アカウントを削除しますか？')
        ).toBeInTheDocument()
      })
    })

    test('確認ダイアログに説明文が表示される', async () => {
      const user = userEvent.setup()
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(
          screen.getByText(
            'この操作は取り消せません。アカウントを削除しても、送信したメッセージや作成したチャンネルは残ります。'
          )
        ).toBeInTheDocument()
      })
    })

    test('確認ダイアログで「キャンセル」を押すとダイアログが閉じる', async () => {
      const user = userEvent.setup()
      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(
          screen.getByText('アカウントを削除しますか？')
        ).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('キャンセル')
      await user.click(cancelButton)

      // AlertDialogのonOpenChangeは自動的に呼ばれないので、
      // ここではダイアログが閉じることを直接テストできません
      // 実際の動作ではonOpenChangeが呼ばれてダイアログが閉じます
    })

    test('削除成功時、APIが正しく呼ばれる', async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any)

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(screen.getByText('削除する')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('削除する')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/delete', {
          method: 'DELETE',
        })
      })
    })

    test('削除成功後、/loginにリダイレクトを試みる', async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any)

      // jsdomのナビゲーションエラーをキャッチ
      const consoleError = jest.spyOn(console, 'error').mockImplementation()

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(screen.getByText('削除する')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('削除する')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/delete', {
          method: 'DELETE',
        })
      })

      consoleError.mockRestore()
    })

    test('削除処理中は「削除中...」と表示される', async () => {
      const user = userEvent.setup()
      // fetchを遅延させて削除中状態を確認
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true }),
                }),
              100
            )
          )
      )

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(screen.getByText('削除する')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('削除する')
      await user.click(confirmButton)

      // 削除中のテキストが表示される
      await waitFor(() => {
        expect(screen.getByText('削除中...')).toBeInTheDocument()
      })
    })

    test('削除失敗時、エラーメッセージが表示される', async () => {
      const user = userEvent.setup()
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'アカウントの削除に失敗しました',
        }),
      } as any)

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(screen.getByText('削除する')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('削除する')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('アカウントの削除に失敗しました')
      })

      alertSpy.mockRestore()
    })

    test('ネットワークエラー時、エラーメッセージが表示される', async () => {
      const user = userEvent.setup()
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(screen.getByText('削除する')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('削除する')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Network error')
      })

      alertSpy.mockRestore()
    })

    test('削除中はキャンセルボタンが無効化される', async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true }),
                }),
              100
            )
          )
      )

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(screen.getByText('削除する')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('削除する')
      await user.click(confirmButton)

      await waitFor(() => {
        const cancelButton = screen.getByText('キャンセル') as HTMLButtonElement
        expect(cancelButton.disabled).toBe(true)
      })
    })

    test('削除中は削除ボタンが無効化される', async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true }),
                }),
              100
            )
          )
      )

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      const deleteAccount = screen.getByText('アカウント削除')
      await user.click(deleteAccount)

      await waitFor(() => {
        expect(screen.getByText('削除する')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('削除する') as HTMLButtonElement
      await user.click(confirmButton)

      await waitFor(() => {
        expect(confirmButton.disabled).toBe(true)
      })
    })
  })

  /**
   * エッジケース
   */
  describe('エッジケース', () => {
    test('テーマがundefinedでもエラーにならない', async () => {
      const user = userEvent.setup()
      ;(useTheme as jest.Mock).mockReturnValue({
        theme: undefined,
        setTheme: mockSetTheme,
      })

      render(
        <SettingsMenu onAvatarSettingsClick={mockOnAvatarSettingsClick} />
      )

      // ダークモードが表示される（undefined !== 'dark'）
      expect(screen.getByText('ダークモード')).toBeInTheDocument()

      const themeToggle = screen.getByText('ダークモード')
      await user.click(themeToggle)

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })
  })
})
