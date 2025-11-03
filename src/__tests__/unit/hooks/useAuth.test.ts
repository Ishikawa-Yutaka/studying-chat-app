/**
 * useAuthカスタムフックのユニットテスト
 *
 * テスト対象: src/hooks/useAuth.ts
 *
 * このテストでは、React Testing LibraryのrenderHookを使用して
 * カスタムフックの動作を確認します。
 *
 * テストする機能:
 * - 初期状態の確認
 * - ユーザー情報の取得
 * - 認証状態の変更監視
 * - ログアウト機能
 * - エラーハンドリング
 */

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// global.fetchのモック（ログアウト時のAPI呼び出し用）
global.fetch = jest.fn()

import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('useAuth - 認証状態管理カスタムフック', () => {
  /**
   * 各テストの前に実行される初期化処理
   */
  beforeEach(() => {
    jest.clearAllMocks()
    // console.logのモックをリセット
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    // console.logのモックを復元
    jest.restoreAllMocks()
  })

  /**
   * 初期状態のテスト
   */
  describe('初期状態', () => {
    test('初期状態ではloading=trueである', () => {
      // モックの設定: getUser()は時間がかかるので、すぐには返さない
      const mockGetUser = jest.fn(() => new Promise(() => {})) // 永久に保留
      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
        },
      } as any)

      const { result } = renderHook(() => useAuth())

      // 初期状態の確認
      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  /**
   * ユーザー情報取得のテスト
   */
  describe('ユーザー情報取得', () => {
    test('ログイン済みユーザーの情報を正しく取得できる', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
        },
      } as any)

      const { result } = renderHook(() => useAuth())

      // ユーザー情報が取得されるまで待つ
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.error).toBeNull()
    })

    test('未ログイン状態の場合、user=nullである', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
        },
      } as any)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeNull()
    })

    test('ユーザー情報取得エラー時はerrorが設定される', async () => {
      const mockError = { message: 'Authentication failed' }

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
        },
      } as any)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.error).toBe('Authentication failed')
    })

    test('予期しないエラー発生時はエラーメッセージが設定される', async () => {
      const mockGetUser = jest.fn().mockRejectedValue(new Error('Network error'))

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
        },
      } as any)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.error).toBe('認証状態の確認に失敗しました')
    })
  })

  /**
   * 認証状態変更監視のテスト
   */
  describe('認証状態変更監視', () => {
    test('onAuthStateChangeが正しく設定される', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
        },
      } as any)

      renderHook(() => useAuth())

      // onAuthStateChangeが呼ばれたことを確認
      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled()
      })

      // コールバック関数が設定されていることを確認
      expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function))
    })

    test('認証状態変更時にuserが更新される', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      let authStateCallback: any

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const mockOnAuthStateChange = jest.fn((callback) => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
        },
      } as any)

      const { result } = renderHook(() => useAuth())

      // 初期状態確認
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()

      // 認証状態変更をシミュレート
      authStateCallback('SIGNED_IN', { user: mockUser })

      // ユーザー情報が更新されたことを確認
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  /**
   * ログアウト機能のテスト
   */
  describe('signOut - ログアウト機能', () => {
    test('正常にログアウトできる', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockSignOut = jest.fn().mockResolvedValue({ error: null })

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
          signOut: mockSignOut,
        },
      } as any)

      // fetchのモック（オンライン状態更新API）
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response)

      const { result } = renderHook(() => useAuth())

      // ユーザー情報が読み込まれるまで待つ
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // ログアウト実行
      await result.current.signOut()

      // signOutが呼ばれたことを確認
      expect(mockSignOut).toHaveBeenCalled()

      // オンライン状態更新APIが呼ばれたことを確認
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/user/update-online-status',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    test('ログアウトエラー時はerrorが設定される', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockError = { message: 'Sign out failed' }
      const mockSignOut = jest.fn().mockResolvedValue({ error: mockError })

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
          signOut: mockSignOut,
        },
      } as any)

      // fetchのモック
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // ログアウト実行
      await result.current.signOut()

      // エラーが設定されたことを確認
      await waitFor(() => {
        expect(result.current.error).toBe('Sign out failed')
      })
    })

    test('オンライン状態更新APIが失敗してもログアウトは続行される', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockSignOut = jest.fn().mockResolvedValue({ error: null })

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
          signOut: mockSignOut,
        },
      } as any)

      // fetchのモック（エラーを返す）
      mockFetch.mockRejectedValue(new Error('API error'))

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // ログアウト実行
      await result.current.signOut()

      // signOutが呼ばれたことを確認（エラーが出てもログアウトは実行される）
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  /**
   * クリーンアップのテスト
   */
  describe('クリーンアップ', () => {
    test('アンマウント時にsubscriptionがunsubscribeされる', async () => {
      const mockUnsubscribe = jest.fn()

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const mockOnAuthStateChange = jest.fn(() => ({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      }))

      mockCreateClient.mockReturnValue({
        auth: {
          getUser: mockGetUser,
          onAuthStateChange: mockOnAuthStateChange,
        },
      } as any)

      const { unmount } = renderHook(() => useAuth())

      // アンマウント
      unmount()

      // unsubscribeが呼ばれたことを確認
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
