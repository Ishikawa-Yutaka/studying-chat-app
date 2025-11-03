/**
 * ThemeProviderコンポーネントのユニットテスト
 *
 * テスト対象: src/components/theme-provider.tsx
 *
 * このテストでは、テーマプロバイダーコンポーネントの
 * 基本的な動作を確認します。
 */

// next-themesのモック
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: any) => <div data-testid="theme-provider">{children}</div>,
}))

import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'

describe('ThemeProvider - テーマプロバイダー', () => {
  test('子要素が正しくレンダリングされる', () => {
    render(
      <ThemeProvider>
        <div>テストコンテンツ</div>
      </ThemeProvider>
    )

    expect(screen.getByText('テストコンテンツ')).toBeInTheDocument()
  })

  test('ThemeProviderがレンダリングされる', () => {
    render(
      <ThemeProvider>
        <div>テストコンテンツ</div>
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
  })

  test('複数の子要素をレンダリングできる', () => {
    render(
      <ThemeProvider>
        <div>子要素1</div>
        <div>子要素2</div>
        <div>子要素3</div>
      </ThemeProvider>
    )

    expect(screen.getByText('子要素1')).toBeInTheDocument()
    expect(screen.getByText('子要素2')).toBeInTheDocument()
    expect(screen.getByText('子要素3')).toBeInTheDocument()
  })
})
