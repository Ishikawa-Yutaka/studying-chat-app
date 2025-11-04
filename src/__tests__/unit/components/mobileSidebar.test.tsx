/**
 * MobileSidebarコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/mobileSidebar.tsx
 *
 * このテストでは、モバイル用サイドバーコンポーネントの
 * 動作を確認します。
 *
 * テストする機能:
 * - サイドバーの表示/非表示
 * - オーバーレイクリックで閉じる
 * - 閉じるボタンで閉じる
 * - ESCキーで閉じる
 * - スクロール制御
 */

// Lucide React アイコンのモック
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
}))

// UIコンポーネントのモック
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className} data-testid="close-button">
      {children}
    </button>
  ),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MobileSidebar from '@/components/workspace/mobileSidebar'

describe('MobileSidebar - モバイルサイドバー', () => {
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    mockOnOpenChange.mockClear()
    // body styleをリセット
    document.body.style.overflow = ''
  })

  /**
   * 基本的な表示
   */
  describe('基本的な表示', () => {
    test('open=trueの時、サイドバーが表示される', () => {
      render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      expect(screen.getByText('サイドバーコンテンツ')).toBeInTheDocument()
    })

    test('open=falseの時、サイドバーは表示されない', () => {
      render(
        <MobileSidebar open={false} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      expect(screen.queryByText('サイドバーコンテンツ')).not.toBeInTheDocument()
    })

    test('子要素が正しくレンダリングされる', () => {
      render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>テストコンテンツ1</div>
          <div>テストコンテンツ2</div>
        </MobileSidebar>
      )

      expect(screen.getByText('テストコンテンツ1')).toBeInTheDocument()
      expect(screen.getByText('テストコンテンツ2')).toBeInTheDocument()
    })

    test('閉じるボタンが表示される', () => {
      render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })
  })

  /**
   * インタラクション
   */
  describe('インタラクション', () => {
    test('閉じるボタンをクリックするとonOpenChangeが呼ばれる', () => {
      render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      const closeButton = screen.getByTestId('close-button')
      fireEvent.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    test('オーバーレイをクリックするとonOpenChangeが呼ばれる', () => {
      const { container } = render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      // オーバーレイ（最初のdiv）をクリック
      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50')
      if (overlay) {
        fireEvent.click(overlay)
      }

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    test('ESCキーを押すとonOpenChangeが呼ばれる', () => {
      render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    test('ESCキー以外では何も起こらない', () => {
      render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      fireEvent.keyDown(window, { key: 'Enter' })

      expect(mockOnOpenChange).not.toHaveBeenCalled()
    })

    test('閉じている時にESCキーを押しても何も起こらない', () => {
      render(
        <MobileSidebar open={false} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(mockOnOpenChange).not.toHaveBeenCalled()
    })
  })

  /**
   * スクロール制御
   */
  describe('スクロール制御', () => {
    test('サイドバーが開いている時、bodyのスクロールが無効になる', () => {
      render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      expect(document.body.style.overflow).toBe('hidden')
    })

    test('サイドバーが閉じている時、bodyのスクロールが有効', () => {
      const { rerender } = render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      // 開いている状態を確認
      expect(document.body.style.overflow).toBe('hidden')

      // 閉じる
      rerender(
        <MobileSidebar open={false} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      // スクロールが復元される
      expect(document.body.style.overflow).toBe('')
    })

    test('コンポーネントがアンマウントされた時、bodyのスクロールが復元される', () => {
      const { unmount } = render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      expect(document.body.style.overflow).toBe('hidden')

      unmount()

      expect(document.body.style.overflow).toBe('')
    })
  })

  /**
   * アクセシビリティ
   */
  describe('アクセシビリティ', () => {
    test('サイドバーにrole="dialog"が設定されている', () => {
      const { container } = render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      const dialog = container.querySelector('[role="dialog"]')
      expect(dialog).toBeInTheDocument()
    })

    test('サイドバーにaria-modal="true"が設定されている', () => {
      const { container } = render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      const dialog = container.querySelector('[aria-modal="true"]')
      expect(dialog).toBeInTheDocument()
    })

    test('サイドバーにaria-labelが設定されている', () => {
      const { container } = render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      const dialog = container.querySelector('[aria-label="ナビゲーションメニュー"]')
      expect(dialog).toBeInTheDocument()
    })

    test('オーバーレイにaria-hidden="true"が設定されている', () => {
      const { container } = render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      const overlay = container.querySelector('[aria-hidden="true"]')
      expect(overlay).toBeInTheDocument()
    })

    test('閉じるボタンにsr-onlyのテキストがある', () => {
      render(
        <MobileSidebar open={true} onOpenChange={mockOnOpenChange}>
          <div>サイドバーコンテンツ</div>
        </MobileSidebar>
      )

      expect(screen.getByText('閉じる')).toBeInTheDocument()
    })
  })
})
