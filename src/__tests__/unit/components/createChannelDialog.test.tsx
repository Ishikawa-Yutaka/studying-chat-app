/**
 * CreateChannelDialogコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/createChannelDialog.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * チャンネル作成ダイアログコンポーネントの動作を確認します。
 *
 * テストする機能:
 * - ダイアログの表示/非表示
 * - フォーム入力
 * - バリデーション
 * - チャンネル作成API呼び出し
 * - エラーハンドリング
 * - 作成後のリダイレクト
 * - フォームリセット
 */

// next/navigationのモック
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateChannelDialog from '@/components/workspace/createChannelDialog'

describe('CreateChannelDialog - チャンネル作成ダイアログ', () => {
  // テスト用のモック関数
  const mockOnOpenChange = jest.fn()
  const mockOnChannelCreated = jest.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onChannelCreated: mockOnChannelCreated,
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
        channel: {
          id: 'channel-123',
          name: 'テストチャンネル',
          description: 'テスト用の説明',
        },
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
    test('ダイアログが開いている時、タイトルが表示される', () => {
      render(<CreateChannelDialog {...defaultProps} />)

      expect(screen.getByText('新しいチャンネルを作成')).toBeInTheDocument()
    })

    test('ダイアログが閉じている時、コンテンツが表示されない', () => {
      render(<CreateChannelDialog {...defaultProps} open={false} />)

      expect(
        screen.queryByText('新しいチャンネルを作成')
      ).not.toBeInTheDocument()
    })

    test('説明文が表示される', () => {
      render(<CreateChannelDialog {...defaultProps} />)

      expect(
        screen.getByText(/チャンネル名と説明を入力してください/)
      ).toBeInTheDocument()
    })

    test('チャンネル名入力フィールドが表示される', () => {
      render(<CreateChannelDialog {...defaultProps} />)

      expect(screen.getByLabelText(/チャンネル名/)).toBeInTheDocument()
    })

    test('説明入力フィールドが表示される', () => {
      render(<CreateChannelDialog {...defaultProps} />)

      expect(screen.getByLabelText(/説明（任意）/)).toBeInTheDocument()
    })

    test('作成ボタンが表示される', () => {
      render(<CreateChannelDialog {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: 'チャンネルを作成' })
      ).toBeInTheDocument()
    })

    test('キャンセルボタンが表示される', () => {
      render(<CreateChannelDialog {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: 'キャンセル' })
      ).toBeInTheDocument()
    })
  })

  /**
   * フォーム入力テスト
   */
  describe('フォーム入力', () => {
    test('チャンネル名を入力できる', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/) as HTMLInputElement

      await user.type(nameInput, 'プロジェクト相談')

      expect(nameInput.value).toBe('プロジェクト相談')
    })

    test('説明を入力できる', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const descInput = screen.getByLabelText(
        /説明（任意）/
      ) as HTMLTextAreaElement

      await user.type(descInput, 'プロジェクトに関する相談用チャンネル')

      expect(descInput.value).toBe('プロジェクトに関する相談用チャンネル')
    })

    test('チャンネル名にmaxLength制限がある（50文字）', () => {
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/) as HTMLInputElement

      expect(nameInput).toHaveAttribute('maxLength', '50')
    })

    test('説明にmaxLength制限がある（200文字）', () => {
      render(<CreateChannelDialog {...defaultProps} />)

      const descInput = screen.getByLabelText(
        /説明（任意）/
      ) as HTMLTextAreaElement

      expect(descInput).toHaveAttribute('maxLength', '200')
    })
  })

  /**
   * バリデーションテスト
   */
  describe('バリデーション', () => {
    test('チャンネル名が空の場合、エラーメッセージが表示される', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('チャンネル名を入力してください')
        ).toBeInTheDocument()
      })
    })

    test('空白のみのチャンネル名でエラーメッセージが表示される', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, '   ')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('チャンネル名を入力してください')
        ).toBeInTheDocument()
      })
    })

    test('バリデーションエラー時、APIは呼ばれない', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled()
      })
    })
  })

  /**
   * チャンネル作成成功テスト
   */
  describe('チャンネル作成成功', () => {
    test('チャンネルを作成できる', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const descInput = screen.getByLabelText(/説明（任意）/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'プロジェクト相談')
      await user.type(descInput, 'プロジェクトに関する相談')
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/channels',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'プロジェクト相談',
              description: 'プロジェクトに関する相談',
            }),
          })
        )
      })
    })

    test('作成成功後、モーダルが閉じる', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テストチャンネル')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    test('作成成功後、onChannelCreatedコールバックが呼ばれる', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テストチャンネル')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnChannelCreated).toHaveBeenCalledTimes(1)
      })
    })

    test('作成成功後、新しいチャンネルページにリダイレクトする', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テストチャンネル')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/workspace/channel/channel-123')
      })
    })

    test('説明が空の場合、undefinedが送信される', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テストチャンネル')
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/channels',
          expect.objectContaining({
            body: JSON.stringify({
              name: 'テストチャンネル',
              description: undefined,
            }),
          })
        )
      })
    })
  })

  /**
   * ローディング状態のテスト
   */
  describe('ローディング状態', () => {
    test('送信中は「作成中...」と表示される', async () => {
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
                      channel: { id: 'channel-123', name: 'テスト' },
                    }),
                }),
              100
            )
          )
      )

      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テスト')
      await user.click(submitButton)

      // ローディング中の表示を確認
      await waitFor(() => {
        expect(screen.getByText('作成中...')).toBeInTheDocument()
      })
    })

    test('送信中は入力フィールドが無効化される', async () => {
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
                      channel: { id: 'channel-123', name: 'テスト' },
                    }),
                }),
              100
            )
          )
      )

      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テスト')
      await user.click(submitButton)

      await waitFor(() => {
        expect(nameInput).toBeDisabled()
      })
    })

    test('送信中はキャンセルボタンが無効化される', async () => {
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
                      channel: { id: 'channel-123', name: 'テスト' },
                    }),
                }),
              100
            )
          )
      )

      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' })

      await user.type(nameInput, 'テスト')
      await user.click(submitButton)

      await waitFor(() => {
        expect(cancelButton).toBeDisabled()
      })
    })
  })

  /**
   * エラーハンドリングテスト
   */
  describe('エラーハンドリング', () => {
    test('API呼び出し失敗時、エラーメッセージが表示される', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'チャンネル名が既に使用されています',
        }),
      } as any)

      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テスト')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('チャンネル名が既に使用されています')
        ).toBeInTheDocument()
      })
    })

    test('ネットワークエラー時、エラーメッセージが表示される', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テスト')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    test('エラー後も入力フィールドは有効なまま', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Error'))

      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テスト')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      expect(nameInput).not.toBeDisabled()
    })
  })

  /**
   * キャンセル・フォームリセットテスト
   */
  describe('キャンセル・フォームリセット', () => {
    test('キャンセルボタンをクリックするとモーダルが閉じる', async () => {
      const user = userEvent.setup()
      render(<CreateChannelDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' })

      await user.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    test('キャンセル時、フォームがリセットされる', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<CreateChannelDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/チャンネル名/) as HTMLInputElement
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' })

      // 入力
      await user.type(nameInput, 'テスト')
      expect(nameInput.value).toBe('テスト')

      // キャンセル
      await user.click(cancelButton)

      // 再オープン
      rerender(<CreateChannelDialog {...defaultProps} open={false} />)
      rerender(<CreateChannelDialog {...defaultProps} open={true} />)

      // リセットされている
      const newNameInput = screen.getByLabelText(
        /チャンネル名/
      ) as HTMLInputElement
      expect(newNameInput.value).toBe('')
    })

    test('エラーメッセージがある状態でキャンセルすると、エラーもクリアされる', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<CreateChannelDialog {...defaultProps} />)

      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      // バリデーションエラー発生
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('チャンネル名を入力してください')
        ).toBeInTheDocument()
      })

      // キャンセル
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' })
      await user.click(cancelButton)

      // 再オープン
      rerender(<CreateChannelDialog {...defaultProps} open={false} />)
      rerender(<CreateChannelDialog {...defaultProps} open={true} />)

      // エラーメッセージが消えている
      expect(
        screen.queryByText('チャンネル名を入力してください')
      ).not.toBeInTheDocument()
    })
  })

  /**
   * onChannelCreatedコールバックなしのテスト
   */
  describe('onChannelCreatedコールバックなし', () => {
    test('onChannelCreatedがundefinedでもエラーにならない', async () => {
      const user = userEvent.setup()
      render(
        <CreateChannelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          // onChannelCreated を渡さない
        />
      )

      const nameInput = screen.getByLabelText(/チャンネル名/)
      const submitButton = screen.getByRole('button', {
        name: 'チャンネルを作成',
      })

      await user.type(nameInput, 'テスト')
      await user.click(submitButton)

      // エラーが発生しないことを確認
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled()
      })
    })
  })
})
