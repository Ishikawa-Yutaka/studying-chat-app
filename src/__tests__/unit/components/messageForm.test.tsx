/**
 * MessageFormコンポーネントのユニットテスト
 *
 * テスト対象: src/components/channel/messageForm.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * メッセージ送信フォームコンポーネントの動作を確認します。
 *
 * テストする機能:
 * - メッセージの入力・送信
 * - フォームのバリデーション（空メッセージ防止）
 * - ファイル添付機能
 * - ファイルのバリデーション
 * - アップロード中の状態管理
 * - 送信後のフォームクリア
 * - エラーハンドリング
 */

// lucide-reactのモック
jest.mock('lucide-react', () => ({
  Send: () => <div data-testid="send-icon">Send</div>,
  Paperclip: () => <div data-testid="paperclip-icon">Paperclip</div>,
  X: () => <div data-testid="x-icon">X</div>,
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageForm from '@/components/channel/messageForm'

describe('MessageForm - メッセージ送信フォーム', () => {
  // テスト用のモック関数
  const mockHandleSendMessage = jest.fn()
  const defaultProps = {
    channelDisplayName: 'テストチャンネル',
    handleSendMessage: mockHandleSendMessage,
  }

  /**
   * 各テストの前に実行される初期化処理
   */
  beforeEach(() => {
    jest.clearAllMocks()
    // alert のモック
    global.alert = jest.fn()
    // fetch のモック（デフォルトは成功）
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        file: {
          url: 'https://example.com/uploaded-file.png',
          name: 'test-file.png',
          type: 'image/png',
          size: 1024,
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
    test('コンポーネントが正しくレンダリングされる', () => {
      render(<MessageForm {...defaultProps} />)

      // プレースホルダーにチャンネル名が含まれているか
      expect(
        screen.getByPlaceholderText('テストチャンネルにメッセージを送信')
      ).toBeInTheDocument()

      // 送信ボタンが存在するか
      expect(screen.getByTestId('send-icon')).toBeInTheDocument()

      // ファイル添付ボタンが存在するか
      const paperclipIcons = screen.getAllByTestId('paperclip-icon')
      expect(paperclipIcons.length).toBeGreaterThan(0)
    })

    test('初期状態では送信ボタンが無効化されている', () => {
      render(<MessageForm {...defaultProps} />)

      const submitButton = screen.getByTestId('send-icon').closest('button')
      expect(submitButton).toBeDisabled()
    })
  })

  /**
   * メッセージ入力のテスト
   */
  describe('メッセージ入力', () => {
    test('テキストを入力できる', async () => {
      const user = userEvent.setup()
      render(<MessageForm {...defaultProps} />)

      const input = screen.getByPlaceholderText(
        'テストチャンネルにメッセージを送信'
      ) as HTMLInputElement

      await user.type(input, 'こんにちは')

      expect(input.value).toBe('こんにちは')
    })

    test('テキストを入力すると送信ボタンが有効になる', async () => {
      const user = userEvent.setup()
      render(<MessageForm {...defaultProps} />)

      const input = screen.getByPlaceholderText(
        'テストチャンネルにメッセージを送信'
      )
      const submitButton = screen.getByTestId('send-icon').closest('button')

      // 初期状態は無効
      expect(submitButton).toBeDisabled()

      // テキスト入力
      await user.type(input, 'テストメッセージ')

      // 有効化される
      expect(submitButton).not.toBeDisabled()
    })

    test('空白のみのメッセージでは送信ボタンが無効のまま', async () => {
      const user = userEvent.setup()
      render(<MessageForm {...defaultProps} />)

      const input = screen.getByPlaceholderText(
        'テストチャンネルにメッセージを送信'
      )
      const submitButton = screen.getByTestId('send-icon').closest('button')

      // 空白のみ入力
      await user.type(input, '   ')

      // 送信ボタンは無効のまま
      expect(submitButton).toBeDisabled()
    })
  })

  /**
   * メッセージ送信のテスト
   */
  describe('メッセージ送信', () => {
    test('メッセージを送信できる', async () => {
      const user = userEvent.setup()
      render(<MessageForm {...defaultProps} />)

      const input = screen.getByPlaceholderText(
        'テストチャンネルにメッセージを送信'
      )

      // メッセージ入力
      await user.type(input, 'テストメッセージ')

      // フォーム送信
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // handleSendMessageが呼ばれたか
      await waitFor(() => {
        expect(mockHandleSendMessage).toHaveBeenCalledWith(
          'テストメッセージ',
          undefined
        )
      })
    })

    test('送信後に入力フィールドがクリアされる', async () => {
      const user = userEvent.setup()
      render(<MessageForm {...defaultProps} />)

      const input = screen.getByPlaceholderText(
        'テストチャンネルにメッセージを送信'
      ) as HTMLInputElement

      // メッセージ入力
      await user.type(input, 'テストメッセージ')

      // フォーム送信
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // 入力フィールドがクリアされる
      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    test('空のメッセージは送信されない', async () => {
      render(<MessageForm {...defaultProps} />)

      // フォーム送信（何も入力しない）
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // handleSendMessageは呼ばれない
      expect(mockHandleSendMessage).not.toHaveBeenCalled()
    })

    test('文字列の正規化が行われる（NFC）', async () => {
      const user = userEvent.setup()
      render(<MessageForm {...defaultProps} />)

      const input = screen.getByPlaceholderText(
        'テストチャンネルにメッセージを送信'
      )

      // メッセージ入力
      await user.type(input, 'テスト')

      // フォーム送信
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // 正規化されたテキストが送信される
      await waitFor(() => {
        expect(mockHandleSendMessage).toHaveBeenCalledWith(
          'テスト'.normalize('NFC'),
          undefined
        )
      })
    })
  })

  /**
   * ファイル添付のテスト
   */
  describe('ファイル添付', () => {
    test('ファイル選択ボタンをクリックできる', () => {
      render(<MessageForm {...defaultProps} />)

      const fileButton = screen
        .getAllByTestId('paperclip-icon')[0]
        .closest('button')
      expect(fileButton).toBeInTheDocument()

      if (fileButton) {
        fireEvent.click(fileButton)
      }

      // エラーが発生しないことを確認
      expect(fileButton).toBeInTheDocument()
    })

    test('ファイルを選択するとプレビューが表示される', async () => {
      render(<MessageForm {...defaultProps} />)

      // ファイル入力要素を取得
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement

      // 画像ファイルをシミュレート
      const file = new File(['test'], 'test-image.png', { type: 'image/png' })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)

      // ファイル名が表示される
      await waitFor(() => {
        expect(screen.getByText('test-image.png')).toBeInTheDocument()
      })

      // ファイルサイズが表示される
      expect(screen.getByText(/KB/)).toBeInTheDocument()
    })

    test('ファイル選択後、キャンセルボタンでクリアできる', async () => {
      render(<MessageForm {...defaultProps} />)

      // ファイル入力要素を取得
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement

      // ファイルをシミュレート
      const file = new File(['test'], 'test-file.pdf', {
        type: 'application/pdf',
      })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)

      // ファイル名が表示される
      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument()
      })

      // キャンセルボタンをクリック
      const cancelButton = screen.getByTestId('x-icon').closest('button')
      if (cancelButton) {
        fireEvent.click(cancelButton)
      }

      // ファイル名が消える
      await waitFor(() => {
        expect(screen.queryByText('test-file.pdf')).not.toBeInTheDocument()
      })
    })

    test('ファイルのみで送信できる（テキストなし）', async () => {
      render(<MessageForm {...defaultProps} />)

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)

      // ファイルが選択されるまで待つ
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument()
      })

      // 送信ボタンが有効になる
      const submitButton = screen.getByTestId('send-icon').closest('button')
      expect(submitButton).not.toBeDisabled()

      // フォーム送信
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // ファイルアップロードが実行される
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/upload',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })

      // handleSendMessageが呼ばれる
      await waitFor(() => {
        expect(mockHandleSendMessage).toHaveBeenCalledWith(
          '（ファイル送信）',
          {
            url: 'https://example.com/uploaded-file.png',
            name: 'test-file.png',
            type: 'image/png',
            size: 1024,
          }
        )
      })
    })

    test('無効なファイルタイプの場合、アラートが表示される', async () => {
      render(<MessageForm {...defaultProps} />)

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement

      // 無効なファイルタイプ
      const file = new File(['test'], 'test.exe', { type: 'application/exe' })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)

      // アラートが表示される
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalled()
      })
    })

    test('大きすぎるファイルの場合、アラートが表示される', async () => {
      render(<MessageForm {...defaultProps} />)

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement

      // 11MBのファイル（制限を超える）
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', {
        type: 'image/png',
      })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      })
      fireEvent.change(fileInput)

      // アラートが表示される
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalled()
      })
    })
  })

  /**
   * アップロード中の状態管理テスト
   */
  describe('アップロード中の状態', () => {
    test('ファイルアップロード中はローディング表示になる', async () => {
      // アップロードに時間がかかる場合のモック
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
                      file: {
                        url: 'https://example.com/file.png',
                        name: 'file.png',
                        type: 'image/png',
                        size: 1024,
                      },
                    }),
                }),
              100
            )
          )
      )

      render(<MessageForm {...defaultProps} />)

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument()
      })

      // フォーム送信
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // ローディング中はボタンが無効化される
      await waitFor(() => {
        const submitButton = screen.getByTestId('send-icon').closest('button')
        // ローディングスピナーまたは無効化を確認
        const hasSpinner = document.querySelector('.animate-spin')
        expect(hasSpinner || submitButton?.hasAttribute('disabled')).toBeTruthy()
      })
    })

    test('アップロード中は入力フィールドが無効化される', async () => {
      // アップロードに時間がかかる場合のモック
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
                      file: {
                        url: 'https://example.com/file.png',
                        name: 'file.png',
                        type: 'image/png',
                        size: 1024,
                      },
                    }),
                }),
              100
            )
          )
      )

      render(<MessageForm {...defaultProps} />)

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument()
      })

      // フォーム送信
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // 入力フィールドが無効化される
      await waitFor(() => {
        const input = screen.getByPlaceholderText(
          'テストチャンネルにメッセージを送信'
        )
        expect(input).toBeDisabled()
      })
    })
  })

  /**
   * エラーハンドリングのテスト
   */
  describe('エラーハンドリング', () => {
    test('ファイルアップロード失敗時にエラーアラートが表示される', async () => {
      // アップロード失敗のモック
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'アップロードに失敗しました',
        }),
      } as any)

      render(<MessageForm {...defaultProps} />)

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument()
      })

      // フォーム送信
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // エラーアラートが表示される
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'ファイルのアップロードに失敗しました。もう一度お試しください。'
        )
      })
    })

    test('ネットワークエラー時にエラーアラートが表示される', async () => {
      // ネットワークエラーのモック
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      render(<MessageForm {...defaultProps} />)

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement
      const file = new File(['test'], 'test.png', { type: 'image/png' })

      // ファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument()
      })

      // フォーム送信
      const form = screen.getByTestId('send-icon').closest('form')
      if (form) {
        fireEvent.submit(form)
      }

      // エラーアラートが表示される
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'ファイルのアップロードに失敗しました。もう一度お試しください。'
        )
      })
    })
  })
})
