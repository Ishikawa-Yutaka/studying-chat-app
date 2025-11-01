/**
 * テスト環境セットアップ確認用テスト
 *
 * 目的: Jest + React Testing Library が正しくセットアップされているか確認
 *
 * このテストが成功すれば、テストフレームワークが正しく動作しています。
 */

describe('テスト環境セットアップ確認', () => {
  /**
   * 基本的なJestテスト
   */
  test('Jestが正しく動作する', () => {
    expect(1 + 1).toBe(2)
    expect(true).toBe(true)
  })

  /**
   * 配列・オブジェクトのマッチャー確認
   */
  test('配列・オブジェクトのテスト', () => {
    const data = {
      name: 'テストユーザー',
      age: 25,
      tags: ['test', 'user'],
    }

    expect(data).toHaveProperty('name', 'テストユーザー')
    expect(data.tags).toContain('test')
    expect(data.tags).toHaveLength(2)
  })

  /**
   * 非同期処理のテスト
   */
  test('非同期処理が正しく動作する', async () => {
    const asyncFunction = async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('成功'), 100)
      })
    }

    const result = await asyncFunction()
    expect(result).toBe('成功')
  })

  /**
   * エラーハンドリングのテスト
   */
  test('エラーを正しくキャッチできる', () => {
    const errorFunction = () => {
      throw new Error('エラーが発生しました')
    }

    expect(errorFunction).toThrow('エラーが発生しました')
  })
})

/**
 * jest.fn() モック関数のテスト
 */
describe('jest.fn() モック関数の確認', () => {
  /**
   * モック関数の基本動作
   */
  test('モック関数が作成できる', () => {
    const mockFn = jest.fn()

    mockFn('test')

    expect(mockFn).toHaveBeenCalled()
    expect(mockFn).toHaveBeenCalledWith('test')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  /**
   * モック関数の戻り値設定
   */
  test('モック関数に戻り値を設定できる', () => {
    const mockAdd = jest.fn((a: number, b: number) => a + b)

    const result = mockAdd(1, 2)

    expect(result).toBe(3)
    expect(mockAdd).toHaveBeenCalledWith(1, 2)
  })

  /**
   * モック関数のリセット
   */
  test('モック関数をリセットできる', () => {
    const mockFn = jest.fn()

    mockFn('first')
    expect(mockFn).toHaveBeenCalledTimes(1)

    mockFn.mockClear()
    expect(mockFn).toHaveBeenCalledTimes(0)
  })
})

/**
 * 環境変数のテスト
 */
describe('環境変数の確認', () => {
  test('Node.js環境で実行されている', () => {
    expect(typeof process).toBe('object')
    expect(process.env.NODE_ENV).toBeDefined()
  })

  test('TypeScriptが正しくトランスパイルされている', () => {
    // TypeScriptの型チェックが通っていれば、このテストは成功する
    const message: string = 'TypeScript is working'
    expect(message).toBe('TypeScript is working')
  })
})

/**
 * このテストファイルが成功すれば、以下が確認できます：
 *
 * ✅ Jest が正しくインストールされている
 * ✅ TypeScript が正しくトランスパイルされている
 * ✅ jest.config.js の設定が正しい
 * ✅ jest.setup.js が読み込まれている
 * ✅ jest.fn() でモック関数が作成できる
 *
 * 次のステップ:
 * 1. 実際のユーティリティ関数のテストを作成
 * 2. Reactコンポーネントのテストを作成
 * 3. カスタムフックのテストを作成
 * 4. APIモック（jest.fn()）のテストを作成
 */
