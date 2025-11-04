/**
 * AvatarSettingsDialogコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/avatarSettingsDialog.tsx
 *
 * このテストでは、アバター設定ダイアログコンポーネントの
 * 動作を確認します。
 *
 * テストする機能:
 * - ダイアログの表示/非表示
 * - ファイル選択機能
 * - ファイルバリデーション（サイズ、形式）
 * - プレビュー表示
 * - アップロード処理
 * - エラーハンドリング
 */

// Lucide React アイコンのモック
jest.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  Loader2: () => <div data-testid="loader-icon">Loader2</div>,
  X: () => <div data-testid="x-icon">X</div>,
}))

// UIコンポーネントのモック
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid="button"
      data-type={type}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}))

jest.mock('@/components/userAvatar', () => ({
  UserAvatar: ({ name, avatarUrl, size }: any) => (
    <div data-testid="user-avatar" data-name={name} data-avatar-url={avatarUrl} data-size={size}>
      {name}
    </div>
  ),
}))

// global.fetchのモック
global.fetch = jest.fn()

// URL.createObjectURLのモック
global.URL.createObjectURL = jest.fn(() => 'blob:mock-preview-url')
global.URL.revokeObjectURL = jest.fn()

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AvatarSettingsDialog from '@/components/workspace/avatarSettingsDialog'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('AvatarSettingsDialog - アバター設定ダイアログ', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnAvatarUpdated = jest.fn()

  beforeEach(() => {
    mockFetch.mockClear()
    mockOnOpenChange.mockClear()
    mockOnAvatarUpdated.mockClear()
    ;(global.URL.createObjectURL as jest.Mock).mockClear()
    ;(global.URL.revokeObjectURL as jest.Mock).mockClear()
  })

  /**
   * 基本的な表示
   */
  describe('基本的な表示', () => {
    test('open=falseの時、ダイアログは表示されない', () => {
      render(
        <AvatarSettingsDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    test('open=trueの時、ダイアログが表示される', () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('アバター設定')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent(
        'プロフィール画像をアップロードしてください（最大2MB）'
      )
    })

    test('現在のアバターが表示される', () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          currentAvatarUrl="https://example.com/avatar.jpg"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('data-name', 'テストユーザー')
      expect(avatar).toHaveAttribute('data-avatar-url', 'https://example.com/avatar.jpg')
      expect(avatar).toHaveAttribute('data-size', 'lg')
    })

    test('画像選択ボタンが表示される', () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      const buttons = screen.getAllByTestId('button')
      const selectButton = buttons.find((btn) => btn.textContent?.includes('画像を選択'))
      expect(selectButton).toBeInTheDocument()
    })
  })

  /**
   * ファイル選択機能
   */
  describe('ファイル選択機能', () => {
    test('有効な画像ファイルを選択するとプレビューが表示される', async () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      // ファイル入力要素を取得
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      // モックファイルを作成
      const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

      // ファイルを選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })
      fireEvent.change(fileInput)

      // プレビューが表示される
      await waitFor(() => {
        expect(screen.getByText('プレビュー')).toBeInTheDocument()
      })

      expect(screen.getByAltText('プレビュー')).toBeInTheDocument()
      expect(screen.getByText(/test.jpg/)).toBeInTheDocument()
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(file)
    })

    test('プレビューのクリアボタンでプレビューが削除される', async () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      // ファイルを選択
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })
      fireEvent.change(fileInput)

      // プレビューが表示される
      await waitFor(() => {
        expect(screen.getByText('プレビュー')).toBeInTheDocument()
      })

      // Xボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const clearButton = buttons.find((btn) => btn.querySelector('[data-testid="x-icon"]'))
      if (clearButton) {
        fireEvent.click(clearButton)
      }

      // プレビューが削除される
      await waitFor(() => {
        expect(screen.queryByText('プレビュー')).not.toBeInTheDocument()
      })
    })
  })

  /**
   * ファイルバリデーション
   */
  describe('ファイルバリデーション', () => {
    test('2MBを超えるファイルはエラーメッセージが表示される', async () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      // 3MBのファイル
      const file = new File(['dummy'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('ファイルサイズは2MB以下にしてください')).toBeInTheDocument()
      })
    })

    test('許可されていないファイル形式はエラーメッセージが表示される', async () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      // PDFファイル（許可されていない）
      const file = new File(['dummy'], 'document.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 1024 })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(
          screen.getByText('画像ファイル（JPEG、PNG、WebP、GIF）のみアップロード可能です')
        ).toBeInTheDocument()
      })
    })

    test('JPEG, PNG, WebP, GIFは受け入れられる', async () => {
      const validTypes = [
        { type: 'image/jpeg', name: 'test.jpg' },
        { type: 'image/png', name: 'test.png' },
        { type: 'image/webp', name: 'test.webp' },
        { type: 'image/gif', name: 'test.gif' },
      ]

      for (const fileType of validTypes) {
        const { rerender } = render(
          <AvatarSettingsDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            currentUserName="テストユーザー"
            onAvatarUpdated={mockOnAvatarUpdated}
          />
        )

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        const file = new File(['dummy'], fileType.name, { type: fileType.type })
        Object.defineProperty(file, 'size', { value: 1024 })

        Object.defineProperty(fileInput, 'files', {
          value: [file],
        })
        fireEvent.change(fileInput)

        await waitFor(() => {
          expect(screen.getByText('プレビュー')).toBeInTheDocument()
        })

        // 次のテストのためにアンマウント
        rerender(
          <AvatarSettingsDialog
            open={false}
            onOpenChange={mockOnOpenChange}
            currentUserName="テストユーザー"
            onAvatarUpdated={mockOnAvatarUpdated}
          />
        )
      }
    })
  })

  /**
   * アップロード処理
   */
  describe('アップロード処理', () => {
    test('ファイル選択前はアップロードボタンが無効', () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      const buttons = screen.getAllByTestId('button')
      const uploadButton = buttons.find((btn) => btn.textContent?.includes('アップロード'))

      expect(uploadButton).toBeDisabled()
    })

    test('ファイル選択後、アップロードボタンが有効になる', async () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      // ファイルを選択
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        const buttons = screen.getAllByTestId('button')
        const uploadButton = buttons.find((btn) => btn.textContent?.includes('アップロード'))
        expect(uploadButton).not.toBeDisabled()
      })
    })

    test('アップロード成功時、コールバックが呼ばれダイアログが閉じる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, avatarUrl: 'https://example.com/new-avatar.jpg' }),
      } as Response)

      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      // ファイルを選択
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('プレビュー')).toBeInTheDocument()
      })

      // アップロードボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const uploadButton = buttons.find((btn) => btn.textContent?.includes('アップロード'))
      if (uploadButton) {
        fireEvent.click(uploadButton)
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/avatar/upload',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })

      await waitFor(() => {
        expect(mockOnAvatarUpdated).toHaveBeenCalledWith('https://example.com/new-avatar.jpg')
      })

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    test('アップロード失敗時、エラーメッセージが表示される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'アップロードに失敗しました' }),
      } as Response)

      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      // ファイルを選択
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('プレビュー')).toBeInTheDocument()
      })

      // アップロードボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const uploadButton = buttons.find((btn) => btn.textContent?.includes('アップロード'))
      if (uploadButton) {
        fireEvent.click(uploadButton)
      }

      await waitFor(() => {
        expect(screen.getByText('アップロードに失敗しました')).toBeInTheDocument()
      })
    })
  })

  /**
   * ダイアログの閉じる動作
   */
  describe('ダイアログの閉じる動作', () => {
    test('キャンセルボタンでダイアログが閉じる', () => {
      render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      const buttons = screen.getAllByTestId('button')
      const cancelButton = buttons.find((btn) => btn.textContent?.includes('キャンセル'))

      if (cancelButton) {
        fireEvent.click(cancelButton)
      }

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    test('ダイアログを閉じるとプレビューがクリアされる', async () => {
      const { rerender } = render(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      // ファイルを選択
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('プレビュー')).toBeInTheDocument()
      })

      // キャンセルボタンをクリック
      const buttons = screen.getAllByTestId('button')
      const cancelButton = buttons.find((btn) => btn.textContent?.includes('キャンセル'))
      if (cancelButton) {
        fireEvent.click(cancelButton)
      }

      // ダイアログを再度開く（プレビューがクリアされているはず）
      rerender(
        <AvatarSettingsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          currentUserName="テストユーザー"
          onAvatarUpdated={mockOnAvatarUpdated}
        />
      )

      expect(screen.queryByText('プレビュー')).not.toBeInTheDocument()
    })
  })
})
