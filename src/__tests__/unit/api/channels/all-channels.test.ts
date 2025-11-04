/**
 * /api/channels/all エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/channels/all/route.ts
 *
 * このテストでは、全チャンネル一覧取得APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - 全チャンネル取得（GET）
 * - 参加状態の判定（isJoined）
 * - DMチャンネルの除外
 * - 認証チェック
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/channels/all/route';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('GET /api/channels/all - 全チャンネル一覧取得', () => {
  // テスト用データ
  const mockUser = {
    id: 'user-123',
    authId: 'auth-123',
    name: 'テストユーザー',
    email: 'test@example.com',
    avatarUrl: null,
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChannels = [
    {
      id: 'channel-1',
      name: '一般',
      description: '一般的な話題',
      creatorId: 'creator-1',
      createdAt: new Date('2024-01-01'),
      members: [
        { userId: 'user-123' }, // テストユーザーが参加
        { userId: 'user-456' },
      ],
    },
    {
      id: 'channel-2',
      name: '開発',
      description: '開発に関する話題',
      creatorId: 'creator-2',
      createdAt: new Date('2024-01-02'),
      members: [
        { userId: 'user-456' }, // テストユーザーは未参加
      ],
    },
    {
      id: 'channel-3',
      name: 'テスト',
      description: null,
      creatorId: 'creator-3',
      createdAt: new Date('2024-01-03'),
      members: [], // 誰も参加していない
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトの認証モック
    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    });
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('全チャンネルを正常に取得できる', async () => {
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.channels).toHaveLength(3);
      expect(data.count).toBe(3);

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith({
        where: { type: 'channel' },
        select: {
          id: true,
          name: true,
          description: true,
          creatorId: true,
          createdAt: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    test('参加状態（isJoined）が正しく設定される', async () => {
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      // 参加中のチャンネル
      expect(data.channels[0].isJoined).toBe(true);
      expect(data.channels[0].id).toBe('channel-1');

      // 未参加のチャンネル
      expect(data.channels[1].isJoined).toBe(false);
      expect(data.channels[1].id).toBe('channel-2');

      // メンバーなしのチャンネル
      expect(data.channels[2].isJoined).toBe(false);
      expect(data.channels[2].id).toBe('channel-3');
    });

    test('メンバー数が正しく返される', async () => {
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      expect(data.channels[0].memberCount).toBe(2);
      expect(data.channels[1].memberCount).toBe(1);
      expect(data.channels[2].memberCount).toBe(0);
    });

    test('チャンネルが名前順（昇順）でソートされる', async () => {
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      await GET(request);

      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            name: 'asc',
          },
        })
      );
    });

    test('チャンネルが0件の場合、空配列を返す', async () => {
      mockPrisma.channel.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.channels).toEqual([]);
      expect(data.count).toBe(0);
    });

    test('必要なフィールドが全て含まれている', async () => {
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      const channel = data.channels[0];
      expect(channel).toHaveProperty('id');
      expect(channel).toHaveProperty('name');
      expect(channel).toHaveProperty('description');
      expect(channel).toHaveProperty('memberCount');
      expect(channel).toHaveProperty('creatorId');
      expect(channel).toHaveProperty('isJoined');
      expect(channel).toHaveProperty('createdAt');
    });

    test('descriptionがnullのチャンネルも正しく取得できる', async () => {
      mockPrisma.channel.findMany.mockResolvedValue([mockChannels[2]] as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      expect(data.channels[0].description).toBeNull();
    });
  });

  /**
   * 認証エラー
   */
  describe('認証エラー', () => {
    test('未認証ユーザーの場合、401エラーを返す', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です',
        status: 401,
      });

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('認証が必要です');

      // Prismaは呼ばれない
      expect(mockPrisma.channel.findMany).not.toHaveBeenCalled();
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('データベースエラー時、500エラーを返す', async () => {
      mockPrisma.channel.findMany.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('全チャンネルの取得に失敗しました');
      expect(data.details).toBe('DB error');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, channels, countフィールドを含む', async () => {
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('channels');
      expect(data).toHaveProperty('count');
      expect(data.success).toBe(true);
    });

    test('countはchannels配列の長さと一致する', async () => {
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      expect(data.count).toBe(data.channels.length);
      expect(data.count).toBe(3);
    });

    test('エラー時、success, error, detailsフィールドを含む', async () => {
      mockPrisma.channel.findMany.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(data.success).toBe(false);
    });
  });

  /**
   * DMチャンネル除外テスト
   */
  describe('DMチャンネル除外', () => {
    test('type="channel"のみ取得され、DMは除外される', async () => {
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/all');
      await GET(request);

      // where条件でtype: 'channel'が指定されている
      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'channel' },
        })
      );
    });
  });
});
