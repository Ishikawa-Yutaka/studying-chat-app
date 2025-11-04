/**
 * /api/user/[userId] エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/user/[userId]/route.ts
 *
 * このテストでは、特定ユーザー情報取得APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - ユーザー情報取得（GET）
 * - ユーザーが存在しない場合の404エラー
 * - データベースエラー処理
 * - レスポンス形式の検証
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/user/[userId]/route';
import { prisma } from '@/lib/prisma';

// Prismaのモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('GET /api/user/[userId] - ユーザー情報取得', () => {
  // テスト用ユーザーデータ
  const mockUser = {
    id: 'user-123',
    authId: 'auth-123',
    name: 'テストユーザー',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    lastSeen: new Date('2025-01-01T10:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('存在するユーザーIDで正しく情報を取得できる', async () => {
      // Prismaのモックを設定
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // リクエスト作成（パスパラメータを含む）
      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      // API実行
      const response = await GET(request, context);
      const data = await response.json();

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user-123',
        },
        select: {
          id: true,
          name: true,
          email: true,
          authId: true,
          avatarUrl: true,
          lastSeen: true,
        },
      });

      // レスポンスステータス確認
      expect(response.status).toBe(200);

      // レスポンスデータ確認
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-123');
      expect(data.user.name).toBe('テストユーザー');
      expect(data.user.email).toBe('test@example.com');
    });

    test('必要なフィールドが全て含まれている', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      // 必須フィールドの確認
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('authId');
      expect(data.user).toHaveProperty('name');
      expect(data.user).toHaveProperty('email');
      expect(data.user).toHaveProperty('avatarUrl');
      expect(data.user).toHaveProperty('lastSeen');
    });

    test('avatarUrlがnullのユーザーも正しく取得できる', async () => {
      const userWithoutAvatar = {
        ...mockUser,
        avatarUrl: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithoutAvatar);

      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.user.avatarUrl).toBeNull();
    });

    test('lastSeenがnullのユーザーも正しく取得できる', async () => {
      const userWithoutLastSeen = {
        ...mockUser,
        lastSeen: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithoutLastSeen);

      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.user.lastSeen).toBeNull();
    });

    test('異なるユーザーIDでも正しく取得できる', async () => {
      const anotherUser = {
        id: 'user-456',
        authId: 'auth-456',
        name: '別のユーザー',
        email: 'another@example.com',
        avatarUrl: null,
        lastSeen: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(anotherUser);

      const request = new NextRequest('http://localhost:3000/api/user/user-456');
      const context = {
        params: Promise.resolve({ userId: 'user-456' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user-456',
        },
        select: expect.any(Object),
      });

      expect(data.user.id).toBe('user-456');
      expect(data.user.name).toBe('別のユーザー');
    });
  });

  /**
   * 異常系テスト - ユーザーが見つからない
   */
  describe('異常系 - ユーザーが見つからない', () => {
    test('存在しないユーザーIDの場合、404エラーを返す', async () => {
      // Prismaがnullを返す（ユーザーが見つからない）
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/non-existent');
      const context = {
        params: Promise.resolve({ userId: 'non-existent' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      // ステータスコード確認
      expect(response.status).toBe(404);

      // エラーレスポンス確認
      expect(data).toEqual({
        success: false,
        error: 'ユーザーが見つかりません',
      });
    });

    test('空文字のuserIdでも404エラーを返す', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/');
      const context = {
        params: Promise.resolve({ userId: '' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  /**
   * 異常系テスト - データベースエラー
   */
  describe('異常系 - データベースエラー', () => {
    test('データベースエラー時、500エラーを返す', async () => {
      // Prismaがエラーをスロー
      const dbError = new Error('Database connection failed');
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      // ステータスコード確認
      expect(response.status).toBe(500);

      // エラーレスポンス確認
      expect(data).toEqual({
        success: false,
        error: 'ユーザー情報の取得に失敗しました',
      });
    });

    test('未知のエラー時も500エラーを返す', async () => {
      // Error以外のオブジェクトをスロー
      mockPrisma.user.findUnique.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    test('Prismaタイムアウトエラー時も500エラーを返す', async () => {
      const timeoutError = new Error('Query timeout');
      mockPrisma.user.findUnique.mockRejectedValue(timeoutError);

      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'ユーザー情報の取得に失敗しました',
      });
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('success, userフィールドを含む', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('user');
    });

    test('Content-Typeがapplication/jsonである', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/user/user-123');
      const context = {
        params: Promise.resolve({ userId: 'user-123' }),
      };

      const response = await GET(request, context);

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    test('エラー時はuserフィールドを含まない', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/non-existent');
      const context = {
        params: Promise.resolve({ userId: 'non-existent' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).not.toHaveProperty('user');
    });
  });

  /**
   * パラメータ処理テスト
   */
  describe('パラメータ処理', () => {
    test('userIdパラメータを正しく処理できる', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/user/test-user-id-123');
      const context = {
        params: Promise.resolve({ userId: 'test-user-id-123' }),
      };

      await GET(request, context);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'test-user-id-123',
          },
        })
      );
    });

    test('UUID形式のuserIdも正しく処理できる', async () => {
      const uuidUser = {
        ...mockUser,
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockPrisma.user.findUnique.mockResolvedValue(uuidUser);

      const request = new NextRequest(
        'http://localhost:3000/api/user/550e8400-e29b-41d4-a716-446655440000'
      );
      const context = {
        params: Promise.resolve({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
      };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.user.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});
