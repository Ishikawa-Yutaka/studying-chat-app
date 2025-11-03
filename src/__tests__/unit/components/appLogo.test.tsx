/**
 * AppLogoコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/appLogo.tsx
 *
 * このテストでは、アプリロゴコンポーネントの
 * 表示を確認します。
 */

// Lucide React アイコンのモック
jest.mock('lucide-react', () => ({
  MessageSquare: () => <div data-testid="message-square-icon">Icon</div>,
}))

// next/link のモック
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
})

import { render, screen } from '@testing-library/react'
import AppLogo from '@/components/workspace/appLogo'

describe('AppLogo - アプリロゴ', () => {
  test('ロゴが表示される', () => {
    render(<AppLogo />)

    expect(screen.getByText('チャットアプリ')).toBeInTheDocument()
  })

  test('MessageSquareアイコンが表示される', () => {
    render(<AppLogo />)

    expect(screen.getByTestId('message-square-icon')).toBeInTheDocument()
  })

  test('/workspaceへのリンクが設定されている', () => {
    const { container } = render(<AppLogo />)

    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/workspace')
  })

  test('適切なスタイルクラスが適用されている', () => {
    const { container } = render(<AppLogo />)

    const link = container.querySelector('a')
    expect(link).toHaveClass('flex', 'items-center', 'gap-2', 'font-semibold')
  })

  test('テキストに適切なスタイルが適用されている', () => {
    render(<AppLogo />)

    const text = screen.getByText('チャットアプリ')
    expect(text).toHaveClass('text-lg', 'font-bold')
  })
})
