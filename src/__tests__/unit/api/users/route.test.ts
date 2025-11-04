/**
 * /api/users エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/users/route.ts
 *
 * このテストでは、ワークスペース内全ユーザー一覧取得APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - ユーザー一覧取得（GET）
 * - データベースエラー処理
 * - レスポンス形式の検証
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/route';
import { prisma } from '@/lib/prisma';

// Prismaのモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('GET /api/users - ユーザー一覧取得', () => {
  // テスト用ユーザーデータ
  const mockUsers = [
    {
      id: 'user-1',
      authId: 'auth-user-1',
      name: 'Alice',
      email: 'alice@example.com',
      avatarUrl: 'https://example.com/alice.jpg',
      lastSeen: new Date('2025-01-01T10:00:00Z'),
      createdAt: new Date('2024-12-01T00:00:00Z'),
    },
    {
      id: 'user-2',
      authId: 'auth-user-2',
      name: 'Bob',
      email: 'bob@example.com',
      avatarUrl: null,
      lastSeen: new Date('2025-01-02T10:00:00Z'),
      createdAt: new Date('2024-12-02T00:00:00Z'),
    },
    {
      id: 'user-3',
      authId: 'auth-user-3',
      name: 'Charlie',
      email: 'charlie@example.com',
      avatarUrl: 'https://example.com/charlie.jpg',
      lastSeen: null,
      createdAt: new Date('2024-12-03T00:00:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('ユーザー一覧を正しく取得できる', async () => {
      // Prismaのモックを設定
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/users');

      // API実行
      const response = await GET(request);
      const data = await response.json();

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          authId: true,
          avatarUrl: true,
          lastSeen: true,
          createdAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // レスポンスステータス確認
      expect(response.status).toBe(200);

      // レスポンスデータ確認
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
      expect(data.users).toHaveLength(3);

      // 各ユーザーのフィールドを確認（Dateは文字列に変換される）
      expect(data.users[0].id).toBe('user-1');
      expect(data.users[0].name).toBe('Alice');
      expect(data.users[0].email).toBe('alice@example.com');
    });

    test('ユーザーが0件の場合、空配列を返す', async () => {
      // Prismaのモックを設定（空配列）
      mockPrisma.user.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        users: [],
        count: 0,
      });
    });

    test('名前順（昇順）でソートされている', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/users');
      await GET(request);

      // orderByが正しく指定されているか確認
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            name: 'asc',
          },
        })
      );
    });

    test('必要なフィールドが全て含まれている', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      // 各ユーザーが必要なフィールドを持っているか確認
      expect(data.users[0]).toHaveProperty('id');
      expect(data.users[0]).toHaveProperty('authId');
      expect(data.users[0]).toHaveProperty('name');
      expect(data.users[0]).toHaveProperty('email');
      expect(data.users[0]).toHaveProperty('avatarUrl');
      expect(data.users[0]).toHaveProperty('lastSeen');
      expect(data.users[0]).toHaveProperty('createdAt');
    });

    test('avatarUrlがnullのユーザーも正しく取得できる', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUsers[1]]); // Bob (avatarUrl: null)

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(data.users[0].avatarUrl).toBeNull();
    });

    test('lastSeenがnullのユーザーも正しく取得できる', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUsers[2]]); // Charlie (lastSeen: null)

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(data.users[0].lastSeen).toBeNull();
    });
  });

  /**
   * 異常系テスト
   */
  describe('異常系', () => {
    test('データベースエラー時、500エラーを返す', async () => {
      // Prismaがエラーをスローするようにモック
      const dbError = new Error('Database connection failed');
      mockPrisma.user.findMany.mockRejectedValue(dbError);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      // ステータスコード確認
      expect(response.status).toBe(500);

      // エラーレスポンス確認
      expect(data).toEqual({
        success: false,
        error: 'ユーザー一覧の取得に失敗しました',
        details: 'Database connection failed',
      });
    });

    test('未知のエラー時も500エラーを返す', async () => {
      // Error以外のオブジェクトをスロー
      mockPrisma.user.findMany.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'ユーザー一覧の取得に失敗しました',
        details: 'Unknown error',
      });
    });

    test('Prismaタイムアウトエラー時、適切なエラーメッセージを返す', async () => {
      const timeoutError = new Error('Query timeout');
      mockPrisma.user.findMany.mockRejectedValue(timeoutError);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Query timeout');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('success, users, countフィールドを含む', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('count');
    });

    test('countはusers配列の長さと一致する', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(data.count).toBe(data.users.length);
      expect(data.count).toBe(3);
    });

    test('Content-Typeがapplication/jsonである', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  /**
   * パフォーマンステスト
   */
  describe('パフォーマンス', () => {
    test('大量のユーザー（100件）を取得できる', async () => {
      // 100件のユーザーデータを生成
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        authId: `auth-user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        avatarUrl: null,
        lastSeen: new Date(),
        createdAt: new Date(),
      }));

      mockPrisma.user.findMany.mockResolvedValue(manyUsers);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(data.count).toBe(100);
      expect(data.users).toHaveLength(100);
    });
  });
});
