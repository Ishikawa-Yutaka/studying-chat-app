/**
 * Supabase Client（ブラウザ用）のユニットテスト
 *
 * テスト対象: src/lib/supabase/client.ts
 *
 * このテストでは、ブラウザ用Supabaseクライアントの
 * 作成を確認します。
 *
 * テストする機能:
 * - クライアントの作成
 * - 環境変数の読み込み
 * - Realtime設定
 *
 * @jest-environment jsdom
 */

import { createClient } from '@/lib/supabase/client';
import { createBrowserClient } from '@supabase/ssr';

// モック設定
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}));

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>;

describe('Supabase Client（ブラウザ用）', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // 環境変数をモック
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };

    // デフォルトのモック実装
    mockCreateBrowserClient.mockReturnValue({
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
    test('createBrowserClientが正しいパラメータで呼ばれる', () => {
      createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        })
      );
    });

    test('環境変数からSupabase URLを読み込む', () => {
      createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        expect.any(String),
        expect.any(Object)
      );
    });

    test('環境変数からAnon Keyを読み込む', () => {
      createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        expect.any(String),
        'test-anon-key',
        expect.any(Object)
      );
    });

    test('Realtime設定が含まれる', () => {
      createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          realtime: expect.objectContaining({
            params: expect.objectContaining({
              eventsPerSecond: 10,
            }),
          }),
        })
      );
    });

    test('クライアントオブジェクトを返す', () => {
      const mockClient = {
        auth: { getUser: jest.fn() },
        from: jest.fn(),
      };

      mockCreateBrowserClient.mockReturnValue(mockClient as any);

      const client = createClient();

      expect(client).toBe(mockClient);
    });

    test('複数回呼び出すと、毎回新しいクライアントを作成する', () => {
      createClient();
      createClient();
      createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(3);
    });
  });

  /**
   * Realtime設定
   */
  describe('Realtime設定', () => {
    test('eventsPerSecondが10に設定されている', () => {
      createClient();

      const callArgs = mockCreateBrowserClient.mock.calls[0];
      const options = callArgs[2];

      expect(options?.realtime?.params?.eventsPerSecond).toBe(10);
    });
  });

});
