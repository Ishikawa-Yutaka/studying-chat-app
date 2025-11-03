/**
 * MessageViewコンポーネントのユニットテスト
 *
 * テスト対象: src/components/channel/messageView.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * メッセージ表示コンポーネントの動作を確認します。
 *
 * テストする機能:
 * - メッセージの表示（自分・他人の区別）
 * - 送信者情報の表示（名前、タイムスタンプ）
 * - 削除済みユーザー対応
 * - スレッド返信のフィルタリング
 * - ファイル添付の表示
 * - スレッドボタンの表示・動作
 * - 空の状態
 */

// 依存コンポーネントのモック
jest.mock('@/components/userAvatar', () => ({
  UserAvatar: ({ name, size, showOnlineStatus, isOnline }: any) => (
    <div data-testid="user-avatar" data-name={name} data-size={size}>
      {name}のアバター
    </div>
  ),
}))

jest.mock('@/components/channel/filePreviewModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, fileUrl, fileName }: any) =>
    isOpen ? (
      <div data-testid="file-preview-modal">
        <button onClick={onClose}>Close</button>
        <div>{fileName}</div>
      </div>
    ) : null,
}))

// lucide-reactのモック
jest.mock('lucide-react', () => ({
  MessageSquare: () => <div data-testid="message-square-icon">MessageSquare</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MessageView from '@/components/channel/messageView'

// テスト用のメッセージデータ
const mockUser1 = {
  id: 'user-1',
  authId: 'auth-1',
  name: 'テストユーザー1',
  avatarUrl: 'https://example.com/avatar1.png',
  isOnline: true,
}

const mockUser2 = {
  id: 'user-2',
  authId: 'auth-2',
  name: 'テストユーザー2',
  avatarUrl: 'https://example.com/avatar2.png',
  isOnline: false,
}

const mockMessage1 = {
  id: 'msg-1',
  sender: mockUser1,
  content: 'こんにちは！',
  createdAt: new Date('2024-01-01T10:00:00Z'),
}

const mockMessage2 = {
  id: 'msg-2',
  sender: mockUser2,
  content: 'よろしくお願いします',
  createdAt: new Date('2024-01-01T10:01:00Z'),
}

const mockDeletedUserMessage = {
  id: 'msg-deleted',
  sender: null,
  content: '削除されたユーザーのメッセージ',
  createdAt: new Date('2024-01-01T10:02:00Z'),
}

describe('MessageView - メッセージ表示コンポーネント', () => {
  /**
   * 各テストの前に実行される初期化処理
   */
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * 基本的な表示のテスト
   */
  describe('基本的な表示', () => {
    test('メッセージが正しく表示される', () => {
      render(
        <MessageView messages={[mockMessage1]} myUserId="auth-1" />
      )

      // メッセージ内容が表示されているか
      expect(screen.getByText('こんにちは！')).toBeInTheDocument()
    })

    test('複数のメッセージが表示される', () => {
      render(
        <MessageView
          messages={[mockMessage1, mockMessage2]}
          myUserId="auth-1"
        />
      )

      expect(screen.getByText('こんにちは！')).toBeInTheDocument()
      expect(screen.getByText('よろしくお願いします')).toBeInTheDocument()
    })

    test('メッセージが0件の場合、何も表示されない', () => {
      const { container } = render(
        <MessageView messages={[]} myUserId="auth-1" />
      )

      // メッセージコンテナ内に要素がないことを確認
      const messageContainer = container.querySelector('.space-y-4')
      expect(messageContainer?.children.length).toBe(1) // div ref のみ
    })
  })

  /**
   * 送信者情報の表示テスト
   */
  describe('送信者情報の表示', () => {
    test('他人のメッセージは送信者名が表示される', () => {
      render(
        <MessageView messages={[mockMessage2]} myUserId="auth-1" />
      )

      expect(screen.getByText('テストユーザー2')).toBeInTheDocument()
    })

    test('自分のメッセージは「自分」と表示される', () => {
      render(
        <MessageView messages={[mockMessage1]} myUserId="auth-1" />
      )

      expect(screen.getByText('自分')).toBeInTheDocument()
    })

    test('タイムスタンプが表示される', () => {
      render(
        <MessageView messages={[mockMessage1]} myUserId="auth-1" />
      )

      // 日本語ロケールでフォーマットされた日時が表示されているか
      const timeElement = screen.getByText(/2024/)
      expect(timeElement).toBeInTheDocument()
    })

    test('UserAvatarコンポーネントが呼ばれる', () => {
      render(
        <MessageView messages={[mockMessage1]} myUserId="auth-1" />
      )

      const avatars = screen.getAllByTestId('user-avatar')
      expect(avatars.length).toBeGreaterThan(0)
    })
  })

  /**
   * 自分のメッセージと他人のメッセージの区別
   */
  describe('メッセージの配置とスタイル', () => {
    test('自分のメッセージは右寄せになる', () => {
      const { container } = render(
        <MessageView messages={[mockMessage1]} myUserId="auth-1" />
      )

      const messageWrapper = container.querySelector('.justify-end')
      expect(messageWrapper).toBeInTheDocument()
    })

    test('他人のメッセージは左寄せになる', () => {
      const { container } = render(
        <MessageView messages={[mockMessage2]} myUserId="auth-1" />
      )

      // justify-endクラスがない = 左寄せ
      const messageWrappers = container.querySelectorAll('.flex.items-start')
      const hasJustifyEnd = Array.from(messageWrappers).some((wrapper) =>
        wrapper.classList.contains('justify-end')
      )
      expect(hasJustifyEnd).toBe(false)
    })

    test('自分のメッセージは青色の背景になる', () => {
      const { container } = render(
        <MessageView messages={[mockMessage1]} myUserId="auth-1" />
      )

      const messageContent = container.querySelector('.bg-blue-500')
      expect(messageContent).toBeInTheDocument()
    })

    test('他人のメッセージは灰色の背景になる', () => {
      const { container } = render(
        <MessageView messages={[mockMessage2]} myUserId="auth-1" />
      )

      const messageContent = container.querySelector('.bg-gray-200')
      expect(messageContent).toBeInTheDocument()
    })
  })

  /**
   * 削除済みユーザー対応のテスト
   */
  describe('削除済みユーザー対応', () => {
    test('senderがnullの場合、「削除済みユーザー」と表示される', () => {
      render(
        <MessageView
          messages={[mockDeletedUserMessage]}
          myUserId="auth-1"
        />
      )

      expect(screen.getByText('削除済みユーザー')).toBeInTheDocument()
    })

    test('削除済みユーザーのメッセージ内容は正しく表示される', () => {
      render(
        <MessageView
          messages={[mockDeletedUserMessage]}
          myUserId="auth-1"
        />
      )

      expect(
        screen.getByText('削除されたユーザーのメッセージ')
      ).toBeInTheDocument()
    })
  })

  /**
   * スレッド返信のフィルタリングテスト
   */
  describe('スレッド返信のフィルタリング', () => {
    test('parentMessageIdがあるメッセージは表示されない', () => {
      const threadReply = {
        id: 'msg-thread',
        sender: mockUser1,
        content: 'スレッド返信',
        createdAt: new Date('2024-01-01T10:03:00Z'),
        parentMessageId: 'msg-1',
      }

      render(
        <MessageView
          messages={[mockMessage1, threadReply]}
          myUserId="auth-1"
        />
      )

      // 通常のメッセージは表示される
      expect(screen.getByText('こんにちは！')).toBeInTheDocument()

      // スレッド返信は表示されない
      expect(screen.queryByText('スレッド返信')).not.toBeInTheDocument()
    })
  })

  /**
   * ファイル添付の表示テスト
   */
  describe('ファイル添付の表示', () => {
    test('画像ファイルが表示される', () => {
      const messageWithImage = {
        ...mockMessage1,
        fileUrl: 'https://example.com/image.png',
        fileName: 'test-image.png',
        fileType: 'image/png',
        fileSize: 1024,
      }

      render(
        <MessageView messages={[messageWithImage]} myUserId="auth-1" />
      )

      // img要素が存在するか
      const img = screen.getByAltText('test-image.png')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/image.png')
    })

    test('動画ファイルが表示される', () => {
      const messageWithVideo = {
        ...mockMessage1,
        fileUrl: 'https://example.com/video.mp4',
        fileName: 'test-video.mp4',
        fileType: 'video/mp4',
        fileSize: 2048,
      }

      const { container } = render(
        <MessageView messages={[messageWithVideo]} myUserId="auth-1" />
      )

      // video要素が存在するか
      const video = container.querySelector('video')
      expect(video).toBeInTheDocument()
      expect(video).toHaveAttribute('src', 'https://example.com/video.mp4')
    })

    test('その他のファイル（PDF等）が表示される', () => {
      const messageWithPdf = {
        ...mockMessage1,
        fileUrl: 'https://example.com/document.pdf',
        fileName: 'test-document.pdf',
        fileType: 'application/pdf',
        fileSize: 4096,
      }

      render(
        <MessageView messages={[messageWithPdf]} myUserId="auth-1" />
      )

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument()
    })

    test('ファイルサイズが正しくフォーマットされる', () => {
      const messageWithFile = {
        ...mockMessage1,
        fileUrl: 'https://example.com/file.pdf',
        fileName: 'file.pdf',
        fileType: 'application/pdf',
        fileSize: 1048576, // 1MB
      }

      render(
        <MessageView messages={[messageWithFile]} myUserId="auth-1" />
      )

      expect(screen.getByText(/1\.0MB/)).toBeInTheDocument()
    })

    test('画像クリックでプレビューモーダルが開く', () => {
      const messageWithImage = {
        ...mockMessage1,
        fileUrl: 'https://example.com/image.png',
        fileName: 'test-image.png',
        fileType: 'image/png',
        fileSize: 1024,
      }

      render(
        <MessageView messages={[messageWithImage]} myUserId="auth-1" />
      )

      const img = screen.getByAltText('test-image.png')
      fireEvent.click(img)

      // モーダルが表示される
      expect(screen.getByTestId('file-preview-modal')).toBeInTheDocument()
    })
  })

  /**
   * スレッドボタンの表示・動作テスト
   */
  describe('スレッドボタン', () => {
    test('onThreadOpenが渡されている場合、スレッドボタンが表示される', () => {
      const mockOnThreadOpen = jest.fn()

      render(
        <MessageView
          messages={[mockMessage1]}
          myUserId="auth-1"
          onThreadOpen={mockOnThreadOpen}
        />
      )

      expect(screen.getByText('スレッドで返信')).toBeInTheDocument()
    })

    test('onThreadOpenが渡されていない場合、スレッドボタンは表示されない', () => {
      render(<MessageView messages={[mockMessage1]} myUserId="auth-1" />)

      expect(screen.queryByText('スレッドで返信')).not.toBeInTheDocument()
    })

    test('スレッドボタンをクリックするとonThreadOpenが呼ばれる', () => {
      const mockOnThreadOpen = jest.fn()

      render(
        <MessageView
          messages={[mockMessage1]}
          myUserId="auth-1"
          onThreadOpen={mockOnThreadOpen}
        />
      )

      const threadButton = screen.getByText('スレッドで返信')
      fireEvent.click(threadButton)

      expect(mockOnThreadOpen).toHaveBeenCalledWith('msg-1')
    })

    test('返信がある場合、返信数が表示される', () => {
      const messageWithReplies = {
        ...mockMessage1,
        replies: [
          {
            id: 'reply-1',
            sender: mockUser2,
            content: '返信1',
            createdAt: new Date('2024-01-01T10:05:00Z'),
          },
          {
            id: 'reply-2',
            sender: mockUser2,
            content: '返信2',
            createdAt: new Date('2024-01-01T10:06:00Z'),
          },
        ],
      }

      const mockOnThreadOpen = jest.fn()

      render(
        <MessageView
          messages={[messageWithReplies]}
          myUserId="auth-1"
          onThreadOpen={mockOnThreadOpen}
        />
      )

      expect(screen.getByText('2件の返信')).toBeInTheDocument()
    })
  })

  /**
   * ファイルダウンロード機能のテスト
   */
  describe('ファイルダウンロード', () => {
    test('ダウンロードボタンをクリックするとダウンロードが開始される', async () => {
      const messageWithFile = {
        ...mockMessage1,
        fileUrl: 'https://example.com/document.pdf',
        fileName: 'test-document.pdf',
        fileType: 'application/pdf',
        fileSize: 4096,
      }

      // fetch APIのモック
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['test'])),
      } as any)

      // URL.createObjectURLのモック
      global.URL.createObjectURL = jest.fn(() => 'blob:test')
      global.URL.revokeObjectURL = jest.fn()

      // document.body.appendChildとremoveChildのモック
      const appendChild = jest.spyOn(document.body, 'appendChild')
      const removeChild = jest.spyOn(document.body, 'removeChild')

      render(
        <MessageView messages={[messageWithFile]} myUserId="auth-1" />
      )

      const downloadButton = screen.getByTestId('download-icon').parentElement
      if (downloadButton) {
        fireEvent.click(downloadButton)
      }

      // fetchが呼ばれたことを確認
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://example.com/document.pdf'
        )
      })

      // クリーンアップ
      appendChild.mockRestore()
      removeChild.mockRestore()
    })
  })

  /**
   * タイムスタンプのフォーマットテスト
   */
  describe('タイムスタンプのフォーマット', () => {
    test('Date型のタイムスタンプが正しくフォーマットされる', () => {
      render(
        <MessageView messages={[mockMessage1]} myUserId="auth-1" />
      )

      // 日本語ロケールでフォーマットされた日時が含まれているか
      expect(screen.getByText(/2024/)).toBeInTheDocument()
    })

    test('文字列型のタイムスタンプが正しくフォーマットされる', () => {
      const messageWithStringDate = {
        ...mockMessage1,
        createdAt: '2024-01-01T10:00:00Z',
      }

      render(
        <MessageView messages={[messageWithStringDate]} myUserId="auth-1" />
      )

      expect(screen.getByText(/2024/)).toBeInTheDocument()
    })
  })
})
