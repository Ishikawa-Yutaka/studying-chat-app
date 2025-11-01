/**
 * メール認証関数のユニットテスト
 *
 * テスト対象: src/utils/email-auth.ts
 *
 * このテストでは、Supabaseクライアントをモックして、
 * 実際のサーバーに接続せずに認証関数の動作を確認します。
 *
 * テストする関数:
 * - signUp: ユーザー登録
 * - signIn: ログイン
 * - signOut: ログアウト
 * - getCurrentUser: 現在のユーザー取得
 * - isAuthenticated: ログイン状態確認
 */

// モジュールのモック設定
// Supabaseクライアントを実際のものではなく、テスト用のモックに置き換える
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

import { signUp, signIn, signOut, getCurrentUser, isAuthenticated } from '@/utils/email-auth'
import { createClient } from '@/lib/supabase/client'

/**
 * Supabaseクライアントのモック型定義
 *
 * createClient()が返すモックオブジェクトの型
 * jest.fn()で作成されたモック関数として扱う
 */
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('email-auth.ts - メール認証関数のテスト', () => {
  /**
   * 各テストの前に実行される初期化処理
   *
 * すべてのモックをリセットして、テスト間の影響をなくす
   */
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * signUp関数のテスト
   */
  describe('signUp - ユーザー登録', () => {
    /**
     * 正常系: ユーザー登録が成功するケース
     */
    test('正常にユーザー登録できる', async () => {
      // モックデータの準備
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'テストユーザー' },
      }

      const mockAuthResponse = {
        data: {
          user: mockUser,
          session: { access_token: 'mock-token' },
        },
        error: null,
      }

      // Supabaseクライアントのモック設定
      // signUp()が呼ばれたときに、上記のmockAuthResponseを返すように設定
      const mockSignUp = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          signUp: mockSignUp,
        },
      } as any)

      // テスト実行
      const result = await signUp('test@example.com', 'password123', 'テストユーザー')

      // 検証1: signUp関数が正しい引数で呼ばれたか
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'テストユーザー',
          },
        },
      })

      // 検証2: 正しい結果が返されたか
      expect(result).toEqual(mockAuthResponse.data)
    })

    /**
     * 異常系: ユーザー登録が失敗するケース
     */
    test('登録エラー時は例外をスローする', async () => {
      // エラーレスポンスのモック
      const mockError = {
        data: null,
        error: { message: 'Email already registered' },
      }

      const mockSignUp = jest.fn().mockResolvedValue(mockError)
      mockCreateClient.mockReturnValue({
        auth: {
          signUp: mockSignUp,
        },
      } as any)

      // エラーがスローされることを確認
      await expect(signUp('test@example.com', 'password123', 'テストユーザー')).rejects.toThrow(
        'Email already registered'
      )
    })
  })

  /**
   * signIn関数のテスト
   */
  describe('signIn - ログイン', () => {
    /**
     * 正常系: ログインが成功するケース
     */
    test('正常にログインできる', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockAuthResponse = {
        data: {
          user: mockUser,
          session: { access_token: 'mock-token' },
        },
        error: null,
      }

      const mockSignInWithPassword = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          signInWithPassword: mockSignInWithPassword,
        },
      } as any)

      const result = await signIn('test@example.com', 'password123')

      // 検証1: signInWithPassword関数が正しい引数で呼ばれたか
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })

      // 検証2: 正しい結果が返されたか
      expect(result).toEqual(mockAuthResponse.data)
    })

    /**
     * 異常系: ログインが失敗するケース
     */
    test('ログインエラー時は例外をスローする', async () => {
      const mockError = {
        data: null,
        error: { message: 'Invalid login credentials' },
      }

      const mockSignInWithPassword = jest.fn().mockResolvedValue(mockError)
      mockCreateClient.mockReturnValue({
        auth: {
          signInWithPassword: mockSignInWithPassword,
        },
      } as any)

      await expect(signIn('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid login credentials'
      )
    })
  })

  /**
   * signOut関数のテスト
   */
  describe('signOut - ログアウト', () => {
    /**
     * 正常系: ログアウトが成功するケース
     */
    test('正常にログアウトできる', async () => {
      const mockAuthResponse = {
        error: null,
      }

      const mockSignOut = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          signOut: mockSignOut,
        },
      } as any)

      // エラーがスローされないことを確認
      await expect(signOut()).resolves.not.toThrow()

      // signOut関数が呼ばれたことを確認
      expect(mockSignOut).toHaveBeenCalled()
    })

    /**
     * 異常系: ログアウトが失敗するケース
     */
    test('ログアウトエラー時は例外をスローする', async () => {
      const mockError = {
        error: { message: 'Failed to sign out' },
      }

      const mockSignOut = jest.fn().mockResolvedValue(mockError)
      mockCreateClient.mockReturnValue({
        auth: {
          signOut: mockSignOut,
        },
      } as any)

      await expect(signOut()).rejects.toThrow('Failed to sign out')
    })
  })

  /**
   * getCurrentUser関数のテスト
   */
  describe('getCurrentUser - 現在のユーザー取得', () => {
    /**
     * 正常系: ユーザー情報取得が成功するケース
     */
    test('正常にユーザー情報を取得できる', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'テストユーザー' },
      }

      const mockAuthResponse = {
        data: { user: mockUser },
        error: null,
      }

      const mockGetUser = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      } as any)

      const result = await getCurrentUser()

      // ユーザー情報が正しく返されたか確認
      expect(result).toEqual(mockUser)
      expect(mockGetUser).toHaveBeenCalled()
    })

    /**
     * 異常系: ユーザー情報取得が失敗するケース
     */
    test('取得エラー時は例外をスローする', async () => {
      const mockError = {
        data: { user: null },
        error: { message: 'User not found' },
      }

      const mockGetUser = jest.fn().mockResolvedValue(mockError)
      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      } as any)

      await expect(getCurrentUser()).rejects.toThrow('User not found')
    })
  })

  /**
   * isAuthenticated関数のテスト
   */
  describe('isAuthenticated - ログイン状態確認', () => {
    /**
     * 正常系: ユーザーがログインしている場合
     */
    test('ユーザーがログインしている場合はtrueを返す', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockAuthResponse = {
        data: { user: mockUser },
        error: null,
      }

      const mockGetUser = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      } as any)

      const result = await isAuthenticated()

      expect(result).toBe(true)
    })

    /**
     * 異常系: ユーザーがログインしていない場合
     */
    test('ユーザーがログインしていない場合はfalseを返す', async () => {
      const mockAuthResponse = {
        data: { user: null },
        error: null,
      }

      const mockGetUser = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      } as any)

      const result = await isAuthenticated()

      expect(result).toBe(false)
    })

    /**
     * 異常系: エラーが発生した場合
     */
    test('エラー発生時はfalseを返す', async () => {
      const mockError = {
        data: { user: null },
        error: { message: 'Network error' },
      }

      const mockGetUser = jest.fn().mockResolvedValue(mockError)
      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      } as any)

      const result = await isAuthenticated()

      // isAuthenticated()はエラー時にfalseを返す仕様
      expect(result).toBe(false)
    })
  })
})
