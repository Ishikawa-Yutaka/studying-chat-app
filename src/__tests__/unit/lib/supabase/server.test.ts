/**
 * Supabase Server（サーバー用）のユニットテスト
 *
 * テスト対象: src/lib/supabase/server.ts
 *
 * このテストでは、サーバー用Supabaseクライアントの
 * 作成を確認します。
 *
 * テストする機能:
 * - クライアントの作成
 * - Cookie操作
 * - 環境変数の読み込み
 *
 * @jest-environment node
 */

import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// モック設定
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('Supabase Server（サーバー用）', () => {
  const originalEnv = process.env;

  const mockCookieStore = {
    getAll: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // 環境変数をモック
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };

    // cookiesのモック
    mockCookies.mockResolvedValue(mockCookieStore as any);

    // デフォルトのcookie操作モック
    mockCookieStore.getAll.mockReturnValue([
      { name: 'sb-access-token', value: 'test-token' },
    ]);

    // デフォルトのクライアントモック
    mockCreateServerClient.mockReturnValue({
      auth: {},
      from: jest.fn(),
    } as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * クライアント作成
   */
  describe('クライアント作成', () => {
    test('cookiesが呼ばれる', async () => {
      await createClient();

      expect(mockCookies).toHaveBeenCalled();
    });

    test('createServerClientが正しいパラメータで呼ばれる', async () => {
      await createClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
    });

    test('環境変数からSupabase URLを読み込む', async () => {
      await createClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        expect.any(String),
        expect.any(Object)
      );
    });

    test('環境変数からAnon Keyを読み込む', async () => {
      await createClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        expect.any(String),
        'test-anon-key',
        expect.any(Object)
      );
    });

    test('クライアントオブジェクトを返す', async () => {
      const mockClient = {
        auth: { getUser: jest.fn() },
        from: jest.fn(),
      };

      mockCreateServerClient.mockReturnValue(mockClient as any);

      const client = await createClient();

      expect(client).toBe(mockClient);
    });
  });

  /**
   * Cookie操作
   */
  describe('Cookie操作', () => {
    test('getAll関数がcookieStore.getAll()を呼ぶ', async () => {
      await createClient();

      // createServerClientに渡されたcookies.getAll関数を取得して実行
      const callArgs = mockCreateServerClient.mock.calls[0];
      const cookiesConfig = callArgs[2]?.cookies;
      const getAllFn = cookiesConfig?.getAll;

      const result = getAllFn?.();

      expect(mockCookieStore.getAll).toHaveBeenCalled();
      expect(result).toEqual([{ name: 'sb-access-token', value: 'test-token' }]);
    });

    test('setAll関数がcookieStore.set()を呼ぶ', async () => {
      await createClient();

      const callArgs = mockCreateServerClient.mock.calls[0];
      const cookiesConfig = callArgs[2]?.cookies;
      const setAllFn = cookiesConfig?.setAll;

      const cookiesToSet = [
        { name: 'cookie1', value: 'value1', options: {} },
        { name: 'cookie2', value: 'value2', options: { httpOnly: true } },
      ];

      setAllFn?.(cookiesToSet);

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie1', 'value1', {});
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie2', 'value2', { httpOnly: true });
    });

    test('setAll関数でエラーが発生しても例外をスローしない（try-catch動作確認）', async () => {
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cookie set error');
      });

      await createClient();

      const callArgs = mockCreateServerClient.mock.calls[0];
      const cookiesConfig = callArgs[2]?.cookies;
      const setAllFn = cookiesConfig?.setAll;

      const cookiesToSet = [
        { name: 'cookie1', value: 'value1', options: {} },
      ];

      // エラーがスローされないことを確認
      expect(() => {
        setAllFn?.(cookiesToSet);
      }).not.toThrow();
    });
  });

  /**
   * エラーハンドリング
   */
  describe('エラーハンドリング', () => {
    test('cookieStore.setでエラーが発生してもtry-catchで捕捉される', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Server component cannot set cookies');
      });

      await createClient();

      const callArgs = mockCreateServerClient.mock.calls[0];
      const cookiesConfig = callArgs[2]?.cookies;
      const setAllFn = cookiesConfig?.setAll;

      const cookiesToSet = [
        { name: 'test-cookie', value: 'test-value', options: {} },
      ];

      // エラーがスローされないことを確認
      expect(() => {
        setAllFn?.(cookiesToSet);
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});
