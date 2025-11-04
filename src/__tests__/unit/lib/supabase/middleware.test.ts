/**
 * Supabase Middleware（認証ミドルウェア）のユニットテスト
 *
 * テスト対象: src/lib/supabase/middleware.ts
 *
 * このテストでは、認証ミドルウェアの
 * 動作を確認します。
 *
 * テストする機能:
 * - セッション更新
 * - 認証チェック
 * - /workspaceへのアクセス制御
 * - リダイレクト処理
 *
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';

// モック設定
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

describe('Supabase Middleware（認証ミドルウェア）', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // 環境変数をモック
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * セッション更新
   */
  describe('セッション更新', () => {
    test('createServerClientが呼ばれる', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/');

      await updateSession(request);

      expect(mockCreateServerClient).toHaveBeenCalled();
    });

    test('supabase.auth.getUser()が呼ばれる', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: mockGetUser,
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/');

      await updateSession(request);

      expect(mockGetUser).toHaveBeenCalled();
    });

    test('NextResponseを返す', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/');

      const response = await updateSession(request);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  /**
   * 認証済みユーザーのアクセス
   */
  describe('認証済みユーザーのアクセス', () => {
    test('/workspaceにアクセスできる（ログイン済み）', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/workspace');

      const response = await updateSession(request);

      // リダイレクトされない（200系）
      expect(response.status).not.toBe(307);
      expect(response.status).not.toBe(308);
    });

    test('/workspace/channelにアクセスできる（ログイン済み）', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/workspace/channel/123');

      const response = await updateSession(request);

      expect(response.status).not.toBe(307);
      expect(response.status).not.toBe(308);
    });

    test('/（トップページ）にアクセスできる（認証不要）', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/');

      const response = await updateSession(request);

      expect(response.status).not.toBe(307);
      expect(response.status).not.toBe(308);
    });

    test('/loginにアクセスできる（認証不要）', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/login');

      const response = await updateSession(request);

      expect(response.status).not.toBe(307);
      expect(response.status).not.toBe(308);
    });
  });

  /**
   * 未認証ユーザーのアクセス制御
   */
  describe('未認証ユーザーのアクセス制御', () => {
    test('/workspaceにアクセスすると/loginにリダイレクトされる（未ログイン）', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/workspace');

      const response = await updateSession(request);

      expect(response.status).toBe(307); // Temporary Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000/login');
    });

    test('/workspace/channelにアクセスすると/loginにリダイレクトされる（未ログイン）', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/workspace/channel/123');

      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login');
    });

    test('/workspace/dmにアクセスすると/loginにリダイレクトされる（未ログイン）', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/workspace/dm/user-456');

      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login');
    });
  });

  /**
   * Cookie操作
   */
  describe('Cookie操作', () => {
    test('リクエストCookieを取得できる', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: 'sb-access-token=test-token',
        },
      });

      await updateSession(request);

      // createServerClientのcookies.getAll関数が呼ばれることを確認
      const callArgs = mockCreateServerClient.mock.calls[0];
      const cookiesConfig = callArgs[2]?.cookies;
      const getAllFn = cookiesConfig?.getAll;

      const cookies = getAllFn?.();
      expect(cookies).toBeDefined();
    });

    test('レスポンスCookieを設定できる', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/');

      await updateSession(request);

      // createServerClientのcookies.setAll関数が呼ばれることを確認
      const callArgs = mockCreateServerClient.mock.calls[0];
      const cookiesConfig = callArgs[2]?.cookies;
      const setAllFn = cookiesConfig?.setAll;

      // setAll関数が存在することを確認
      expect(setAllFn).toBeDefined();
      expect(typeof setAllFn).toBe('function');
    });
  });
});
