/**
 * auth-server のユニットテスト
 *
 * テスト対象: src/lib/auth-server.ts
 *
 * このテストでは、サーバー側の認証チェック機能を確認します。
 *
 * テストする機能:
 * - getCurrentUser: 現在のユーザー取得
 * - checkChannelMembership: チャンネルメンバーシップ確認
 *
 * @jest-environment node
 */

import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// モック設定
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    channelMember: {
      findFirst: jest.fn(),
    },
  },
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('auth-server（サーバー側認証）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * getCurrentUser 関数
   */
  describe('getCurrentUser（現在のユーザー取得）', () => {
    const mockAuthUser = {
      id: 'auth-123',
      email: 'test@example.com',
    };

    const mockPrismaUser = {
      id: 'user-456',
      authId: 'auth-123',
      name: 'Test User',
      email: 'test@example.com',
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    test('正常系: ユーザー情報を取得できる', async () => {
      // Supabase認証モック
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAuthUser },
            error: null,
          }),
        },
      } as any);

      // Prismaモック
      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);

      const result = await getCurrentUser();

      expect(result.user).toEqual(mockPrismaUser);
      expect(result.error).toBeNull();
      expect(result.status).toBe(200);
    });

    test('Supabase認証エラー: 401エラーを返す', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
          }),
        },
      } as any);

      const result = await getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toBe('認証が必要です。ログインしてください。');
      expect(result.status).toBe(401);
    });

    test('認証ユーザーがnull: 401エラーを返す', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any);

      const result = await getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toBe('認証が必要です。ログインしてください。');
      expect(result.status).toBe(401);
    });

    test('Prismaでユーザーが見つからない: 404エラーを返す', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAuthUser },
            error: null,
          }),
        },
      } as any);

      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toBe('ユーザーが見つかりません');
      expect(result.status).toBe(404);
    });

    test('Prismaでエラー発生: 500エラーを返す', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAuthUser },
            error: null,
          }),
        },
      } as any);

      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toBe('認証処理に失敗しました');
      expect(result.status).toBe(500);
    });

    test('Supabaseクライアント作成でエラー: 500エラーを返す', async () => {
      mockCreateClient.mockRejectedValue(new Error('Supabase error'));

      const result = await getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toBe('認証処理に失敗しました');
      expect(result.status).toBe(500);
    });

    test('Prismaにauthidで正しくクエリを実行する', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAuthUser },
            error: null,
          }),
        },
      } as any);

      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);

      await getCurrentUser();

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { authId: 'auth-123' },
      });
    });
  });

  /**
   * checkChannelMembership 関数
   */
  describe('checkChannelMembership（チャンネルメンバーシップ確認）', () => {
    const mockMembership = {
      id: 'membership-123',
      userId: 'user-456',
      channelId: 'channel-789',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    test('正常系: メンバーである場合、isMemberがtrueを返す', async () => {
      mockPrisma.channelMember.findFirst.mockResolvedValue(mockMembership);

      const result = await checkChannelMembership('user-456', 'channel-789');

      expect(result.isMember).toBe(true);
      expect(result.error).toBeNull();
      expect(result.status).toBe(200);
    });

    test('メンバーでない場合: 403エラーを返す', async () => {
      mockPrisma.channelMember.findFirst.mockResolvedValue(null);

      const result = await checkChannelMembership('user-456', 'channel-789');

      expect(result.isMember).toBe(false);
      expect(result.error).toBe('このチャンネルにアクセスする権限がありません');
      expect(result.status).toBe(403);
    });

    test('Prismaでエラー発生: 500エラーを返す', async () => {
      mockPrisma.channelMember.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await checkChannelMembership('user-456', 'channel-789');

      expect(result.isMember).toBe(false);
      expect(result.error).toBe('メンバーシップの確認に失敗しました');
      expect(result.status).toBe(500);
    });

    test('正しいパラメータでPrismaクエリを実行する', async () => {
      mockPrisma.channelMember.findFirst.mockResolvedValue(mockMembership);

      await checkChannelMembership('user-456', 'channel-789');

      expect(mockPrisma.channelMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-456',
          channelId: 'channel-789',
        },
      });
    });

    test('異なるユーザーとチャンネルの組み合わせでも動作する', async () => {
      mockPrisma.channelMember.findFirst.mockResolvedValue({
        ...mockMembership,
        userId: 'user-111',
        channelId: 'channel-222',
      });

      const result = await checkChannelMembership('user-111', 'channel-222');

      expect(result.isMember).toBe(true);
      expect(mockPrisma.channelMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-111',
          channelId: 'channel-222',
        },
      });
    });
  });

  /**
   * エラーハンドリング統合テスト
   */
  describe('エラーハンドリング統合', () => {
    test('getCurrentUser: すべてのエラーケースで必ずステータスコードを返す', async () => {
      // 401エラー
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
          }),
        },
      } as any);

      let result = await getCurrentUser();
      expect(result.status).toBeDefined();
      expect(result.status).toBe(401);

      // 404エラー
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'auth-123' } },
            error: null,
          }),
        },
      } as any);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      result = await getCurrentUser();
      expect(result.status).toBeDefined();
      expect(result.status).toBe(404);

      // 500エラー
      mockPrisma.user.findFirst.mockRejectedValue(new Error('DB error'));

      result = await getCurrentUser();
      expect(result.status).toBeDefined();
      expect(result.status).toBe(500);
    });

    test('checkChannelMembership: すべてのエラーケースで必ずステータスコードを返す', async () => {
      // 403エラー
      mockPrisma.channelMember.findFirst.mockResolvedValue(null);

      let result = await checkChannelMembership('user-1', 'channel-1');
      expect(result.status).toBeDefined();
      expect(result.status).toBe(403);

      // 500エラー
      mockPrisma.channelMember.findFirst.mockRejectedValue(new Error('DB error'));

      result = await checkChannelMembership('user-1', 'channel-1');
      expect(result.status).toBeDefined();
      expect(result.status).toBe(500);
    });
  });
});
