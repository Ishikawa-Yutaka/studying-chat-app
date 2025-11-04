/**
 * /api/user/delete エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/user/delete/route.ts
 *
 * このテストでは、アカウント削除APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - アカウント削除（DELETE）
 * - 認証チェック
 * - Prismaユーザー削除
 * - Supabaseログアウト
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { DELETE } from '@/app/api/user/delete/route';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase/server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('DELETE /api/user/delete - アカウント削除', () => {
  // テスト用データ
  const mockSupabaseUser = {
    id: 'auth-123',
    email: 'test@example.com',
  };

  const mockPrismaUser = {
    id: 'user-123',
    authId: 'auth-123',
    name: 'テストユーザー',
    email: 'test@example.com',
    avatarUrl: null,
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupabaseAuth = {
    getUser: jest.fn(),
    signOut: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのSupabaseモック
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null,
    });

    mockSupabaseAuth.signOut.mockResolvedValue({
      error: null,
    });

    mockCreateClient.mockResolvedValue({
      auth: mockSupabaseAuth,
    } as any);
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('アカウントを正常に削除できる', async () => {
      mockPrisma.user.delete.mockResolvedValue(mockPrismaUser);

      const response = await DELETE();
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('アカウントを削除しました');

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { authId: 'auth-123' },
      });

      // Supabaseログアウトが呼ばれているか確認
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    test('Supabaseログアウトエラーは無視される', async () => {
      mockPrisma.user.delete.mockResolvedValue(mockPrismaUser);
      mockSupabaseAuth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' },
      });

      const response = await DELETE();
      const data = await response.json();

      // ログアウトエラーでも成功扱い
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('アカウントを削除しました');
    });
  });

  /**
   * 認証エラー
   */
  describe('認証エラー', () => {
    test('未認証ユーザーの場合、401エラーを返す', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('認証が必要です');

      // Prismaは呼ばれない
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });

  /**
   * リソースが見つからないエラー
   */
  describe('リソースが見つからない', () => {
    test('Prismaユーザーが見つからない場合、404エラーを返す', async () => {
      const notFoundError = new Error('Record to delete does not exist');
      mockPrisma.user.delete.mockRejectedValue(notFoundError);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('ユーザーが見つかりません');
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('ユーザー削除時のエラーで500エラーを返す', async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error('DB error'));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('アカウントの削除に失敗しました');
      expect(data.details).toBe('DB error');
    });

    test('データベース接続エラー時、500エラーを返す', async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error('Connection timeout'));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('アカウントの削除に失敗しました');
      expect(data.details).toBe('Connection timeout');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, messageフィールドを含む', async () => {
      mockPrisma.user.delete.mockResolvedValue(mockPrismaUser);

      const response = await DELETE();
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data.success).toBe(true);
    });

    test('エラー時、success, errorフィールドを含む', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const response = await DELETE();
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(data).not.toHaveProperty('message');
    });

    test('データベースエラー時、detailsフィールドを含む', async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error('DB error'));

      const response = await DELETE();
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(data.success).toBe(false);
    });
  });

  /**
   * Cascade削除の動作確認
   */
  describe('Cascade削除の動作', () => {
    test('ユーザー削除時、authIdを使用して削除される', async () => {
      mockPrisma.user.delete.mockResolvedValue(mockPrismaUser);

      await DELETE();

      // authIdで削除されることを確認
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { authId: 'auth-123' },
      });
    });
  });
});
