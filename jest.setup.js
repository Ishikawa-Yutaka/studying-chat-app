/**
 * Jestセットアップファイル
 *
 * 目的: テスト実行前に必要な初期化処理を行う
 *
 * このファイルは各テストファイルが実行される「前」に自動的に読み込まれます。
 * jest.config.js の setupFilesAfterEnv で指定されています。
 */

/**
 * Polyfills for MSW (Mock Service Worker)
 *
 * 注: 現在は jest.fn() を使用しているため、MSW関連のpolyfillはコメントアウトしています。
 * 将来MSWを使用する場合は、以下のコメントを外してください。
 *
 * 必要なpolyfill:
 * 1. whatwg-fetch - fetch API
 * 2. TextEncoder/TextDecoder
 * 3. Web Streams API (ReadableStream, WritableStream, TransformStream)
 *
 * 参考: docs/TESTING_MOCK_COMPARISON.md
 */

// import 'whatwg-fetch'
// import { TextEncoder, TextDecoder } from 'util'
// global.TextEncoder = TextEncoder
// global.TextDecoder = TextDecoder
// import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill'
// global.ReadableStream = ReadableStream
// global.WritableStream = WritableStream
// global.TransformStream = TransformStream

/**
 * @testing-library/jest-dom のインポート
 *
 * これにより、Jestで使えるマッチャー（検証関数）が追加されます。
 *
 * 追加されるマッチャーの例:
 * - expect(element).toBeInTheDocument() - 要素がDOMに存在するか
 * - expect(element).toHaveTextContent('テキスト') - 要素が指定テキストを含むか
 * - expect(element).toBeVisible() - 要素が表示されているか
 * - expect(element).toBeDisabled() - 要素が無効化されているか
 * - expect(element).toHaveClass('className') - 要素が指定クラスを持つか
 * - expect(element).toHaveAttribute('attr', 'value') - 要素が指定属性を持つか
 *
 * 使用例:
 * ```typescript
 * import { render, screen } from '@testing-library/react';
 *
 * test('ボタンが表示される', () => {
 *   render(<button>送信</button>);
 *   const button = screen.getByRole('button', { name: '送信' });
 *
 *   // jest-domのカスタムマッチャーを使用
 *   expect(button).toBeInTheDocument(); // ボタンがDOMに存在する
 *   expect(button).toBeVisible(); // ボタンが表示されている
 * });
 * ```
 */
import '@testing-library/jest-dom'

/**
 * グローバルなテスト環境設定
 *
 * 必要に応じて、ここに追加の設定を記述できます。
 * 例:
 * - グローバル変数のモック
 * - 環境変数の設定
 * - テスト用のユーティリティ関数
 */

// 環境変数のモック（例）
// process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
// process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

/**
 * window.matchMedia のモック
 *
 * Next.js/Reactコンポーネントで window.matchMedia を使用している場合、
 * Jestのjsdomではサポートされていないためエラーになります。
 * このモックにより、テスト実行時にエラーを回避できます。
 *
 * 用途: レスポンシブデザインのテスト、ダークモード切り替えなど
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false, // デフォルトはマッチしない
    media: query,
    onchange: null,
    addListener: jest.fn(), // 非推奨だが互換性のため
    removeListener: jest.fn(), // 非推奨だが互換性のため
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

/**
 * IntersectionObserver のモック
 *
 * Next.jsの画像遅延読み込みなどで使用されるIntersectionObserver API。
 * jsdomではサポートされていないため、モックを提供します。
 *
 * 用途: 無限スクロール、遅延読み込み、表示検知のテスト
 */
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

/**
 * ResizeObserver のモック
 *
 * 要素のサイズ変更を監視するResizeObserver API。
 * 一部のUIライブラリで使用されます。
 *
 * 用途: レスポンシブコンポーネントのテスト
 */
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

/**
 * console.error/warn の抑制（オプション）
 *
 * テスト中に予期される警告・エラーメッセージを抑制したい場合に使用。
 * ただし、必要なエラーまで隠してしまう可能性があるため、慎重に使用してください。
 */
// const originalError = console.error
// beforeAll(() => {
//   console.error = (...args) => {
//     // 特定のエラーメッセージを無視
//     if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
//       return
//     }
//     originalError.call(console, ...args)
//   }
// })
//
// afterAll(() => {
//   console.error = originalError
// })

/**
 * MSW (Mock Service Worker) サーバーの初期化
 *
 * 注: 現在は jest.fn() を使用しているため、MSWサーバーはコメントアウトしています。
 * 将来MSWを使用する場合は、以下のコメントを外してください。
 *
 * 前提条件:
 * 1. 上記のpolyfillがすべて有効化されていること
 * 2. transformIgnorePatterns が設定されていること（ES Modules対応）
 *
 * 参考: docs/TESTING_MOCK_COMPARISON.md
 */
// require('./src/__mocks__/server')
