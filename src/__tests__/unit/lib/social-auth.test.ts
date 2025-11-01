/**
 * ソーシャル認証関数のユニットテスト
 *
 * テスト対象: src/lib/social-auth.ts
 *
 * このテストでは、Supabaseクライアントをモックして、
 * 実際のOAuthプロバイダーに接続せずにソーシャル認証関数の動作を確認します。
 *
 * テストする関数:
 * - signInWithSocial: ソーシャル認証でログイン
 * - getProviderIcon: プロバイダーアイコンの取得
 *
 * テストする定数:
 * - SOCIAL_PROVIDERS: ソーシャル認証プロバイダーの表示情報
 */

// モジュールのモック設定
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// console.logのモック（テスト出力を抑制）
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
}

import {
  signInWithSocial,
  getProviderIcon,
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from '@/lib/social-auth'
import { createClient } from '@/lib/supabase/client'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('social-auth.ts - ソーシャル認証関数のテスト', () => {
  /**
   * 各テストの前に実行される初期化処理
   */
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * SOCIAL_PROVIDERS定数のテスト
   */
  describe('SOCIAL_PROVIDERS - プロバイダー表示情報', () => {
    /**
     * すべてのプロバイダーが定義されているか確認
     */
    test('すべてのプロバイダー情報が定義されている', () => {
      expect(SOCIAL_PROVIDERS.google).toBeDefined()
      expect(SOCIAL_PROVIDERS.github).toBeDefined()
      expect(SOCIAL_PROVIDERS.twitter).toBeDefined()
      expect(SOCIAL_PROVIDERS.facebook).toBeDefined()
    })

    /**
     * 各プロバイダーが正しい名前を持つか確認
     */
    test('各プロバイダーに正しい名前が設定されている', () => {
      expect(SOCIAL_PROVIDERS.google.name).toBe('Google')
      expect(SOCIAL_PROVIDERS.github.name).toBe('GitHub')
      expect(SOCIAL_PROVIDERS.twitter.name).toBe('Twitter')
      expect(SOCIAL_PROVIDERS.facebook.name).toBe('Facebook')
    })

    /**
     * 各プロバイダーが色情報を持つか確認
     */
    test('各プロバイダーに色情報が設定されている', () => {
      expect(SOCIAL_PROVIDERS.google.color).toContain('bg-')
      expect(SOCIAL_PROVIDERS.github.color).toContain('bg-')
      expect(SOCIAL_PROVIDERS.twitter.color).toContain('bg-')
      expect(SOCIAL_PROVIDERS.facebook.color).toContain('bg-')
    })
  })

  /**
   * signInWithSocial関数のテスト
   *
   * 注: window.location.originのモックはjest.setup.jsで設定されています
   */
  describe('signInWithSocial - ソーシャル認証ログイン', () => {
    /**
     * 正常系: Googleでのログインが成功するケース
     */
    test('Googleでのログインが正常に動作する', async () => {
      const mockAuthResponse = {
        data: {
          url: 'https://accounts.google.com/o/oauth2/auth?...',
          provider: 'google',
        },
        error: null,
      }

      const mockSignInWithOAuth = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
        },
      } as any)

      await signInWithSocial('google')

      // 検証1: signInWithOAuth関数が正しい引数で呼ばれたか
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          scopes: undefined, // GoogleはデフォルトスコープのみでundefinedUNDEFINED
        },
      })

      // 検証2: console.logが呼ばれたか（ログ出力の確認）
      expect(console.log).toHaveBeenCalledWith('🔄 Googleでのログインを開始...')
      expect(console.log).toHaveBeenCalledWith('✅ Google認証画面にリダイレクト中...')
    })

    /**
     * 正常系: GitHubでのログインが成功するケース
     * GitHubは特殊なスコープ設定が必要
     */
    test('GitHubでのログインが正常に動作する（スコープ設定あり）', async () => {
      const mockAuthResponse = {
        data: {
          url: 'https://github.com/login/oauth/authorize?...',
          provider: 'github',
        },
        error: null,
      }

      const mockSignInWithOAuth = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
        },
      } as any)

      await signInWithSocial('github')

      // 検証: GitHubの場合はスコープが設定されているか
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          scopes: 'read:user user:email', // GitHubには特殊なスコープが必要
        },
      })
    })

    /**
     * 正常系: Twitterでのログインが成功するケース
     */
    test('Twitterでのログインが正常に動作する', async () => {
      const mockAuthResponse = {
        data: {
          url: 'https://twitter.com/i/oauth2/authorize?...',
          provider: 'twitter',
        },
        error: null,
      }

      const mockSignInWithOAuth = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
        },
      } as any)

      await signInWithSocial('twitter')

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'twitter',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          scopes: undefined,
        },
      })
    })

    /**
     * 正常系: Facebookでのログインが成功するケース
     */
    test('Facebookでのログインが正常に動作する', async () => {
      const mockAuthResponse = {
        data: {
          url: 'https://www.facebook.com/v12.0/dialog/oauth?...',
          provider: 'facebook',
        },
        error: null,
      }

      const mockSignInWithOAuth = jest.fn().mockResolvedValue(mockAuthResponse)
      mockCreateClient.mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
        },
      } as any)

      await signInWithSocial('facebook')

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'facebook',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          scopes: undefined,
        },
      })
    })

    /**
     * 異常系: OAuth認証が失敗するケース
     */
    test('OAuth認証エラー時は例外をスローする', async () => {
      const errorObject = { message: 'OAuth provider not configured' }
      const mockError = {
        data: null,
        error: errorObject,
      }

      const mockSignInWithOAuth = jest.fn().mockResolvedValue(mockError)
      mockCreateClient.mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
        },
      } as any)

      // エラーがスローされることを確認（実際にスローされるのはerrorオブジェクト）
      await expect(signInWithSocial('google')).rejects.toEqual(errorObject)

      // エラーログが出力されたか確認
      expect(console.error).toHaveBeenCalledWith('❌ Googleログインエラー:', errorObject)
      expect(console.error).toHaveBeenCalledWith('❌ ソーシャル認証エラー:', errorObject)
    })

    /**
     * 異常系: ネットワークエラーなど予期しないエラーが発生するケース
     */
    test('予期しないエラー時は例外をスローする', async () => {
      const networkError = new Error('Network request failed')

      const mockSignInWithOAuth = jest.fn().mockRejectedValue(networkError)
      mockCreateClient.mockReturnValue({
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
        },
      } as any)

      await expect(signInWithSocial('google')).rejects.toThrow('Network request failed')

      expect(console.error).toHaveBeenCalledWith('❌ ソーシャル認証エラー:', networkError)
    })
  })

  /**
   * getProviderIcon関数のテスト
   */
  describe('getProviderIcon - プロバイダーアイコン取得', () => {
    /**
     * 各プロバイダーに対応するアイコンが返されるか確認
     */
    test('Googleのアイコン名を返す', () => {
      const icon = getProviderIcon('google')
      expect(icon).toBe('Chrome') // Googleアイコンの代替としてChromeを使用
    })

    test('GitHubのアイコン名を返す', () => {
      const icon = getProviderIcon('github')
      expect(icon).toBe('Github')
    })

    test('Twitterのアイコン名を返す', () => {
      const icon = getProviderIcon('twitter')
      expect(icon).toBe('Twitter')
    })

    test('Facebookのアイコン名を返す', () => {
      const icon = getProviderIcon('facebook')
      expect(icon).toBe('Facebook')
    })

    /**
     * すべてのプロバイダーアイコンが文字列であることを確認
     */
    test('すべてのアイコンが文字列型である', () => {
      const providers: SocialProvider[] = ['google', 'github', 'twitter', 'facebook']

      providers.forEach((provider) => {
        const icon = getProviderIcon(provider)
        expect(typeof icon).toBe('string')
        expect(icon.length).toBeGreaterThan(0) // 空文字列ではないことを確認
      })
    })
  })
})
