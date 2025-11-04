/**
 * /api/channels/available エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/channels/available/route.ts
 *
 * このテストでは、参加可能なチャンネル一覧取得APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - 参加可能なチャンネル取得（GET）
 * - 認証チェック
 * - ユーザーID一致チェック
 * - 参加済みチャンネルの除外
 * - DMチャンネルの除外
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/channels/available/route';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    channelMember: {
      findMany: jest.fn(),
    },
    channel: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase/server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('GET /api/channels/available - 参加可能なチャンネル一覧取得', () => {
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

  const mockJoinedChannels = [
    { channelId: 'channel-1' },
    { channelId: 'channel-2' },
  ];

  const mockAvailableChannels = [
    {
      id: 'channel-3',
      name: '開発',
      description: '開発に関する話題',
      createdAt: new Date('2024-01-03'),
      members: [
        {
          user: {
            id: 'other-user-1',
            name: '他のユーザー1',
            email: 'other1@example.com',
          },
        },
      ],
    },
    {
      id: 'channel-4',
      name: 'テスト',
      description: null,
      createdAt: new Date('2024-01-02'),
      members: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのSupabaseモック
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        }),
      },
    } as any);
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('参加可能なチャンネルを正常に取得できる', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue(mockAvailableChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.channels).toHaveLength(2);
      expect(data.count).toBe(2);

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.channelMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: { channelId: true },
      });

      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith({
        where: {
          type: 'channel',
          id: {
            notIn: ['channel-1', 'channel-2'],
          },
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    test('メンバー数が正しく返される', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue(mockAvailableChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(data.channels[0].memberCount).toBe(1);
      expect(data.channels[1].memberCount).toBe(0);
    });

    test('チャンネルが作成日時降順（新しい順）でソートされる', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue(mockAvailableChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      await GET(request);

      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'desc',
          },
        })
      );
    });

    test('参加可能なチャンネルが0件の場合、空配列を返す', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.channels).toEqual([]);
      expect(data.count).toBe(0);
    });

    test('ユーザーが1つもチャンネルに参加していない場合、全チャンネルが返される', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue([]); // 参加チャンネルなし
      mockPrisma.channel.findMany.mockResolvedValue(mockAvailableChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.channels).toHaveLength(2);

      // notInに空配列が渡される
      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: {
              notIn: [],
            },
          }),
        })
      );
    });

    test('必要なフィールドが全て含まれている', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue(mockAvailableChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      const channel = data.channels[0];
      expect(channel).toHaveProperty('id');
      expect(channel).toHaveProperty('name');
      expect(channel).toHaveProperty('description');
      expect(channel).toHaveProperty('memberCount');
      expect(channel).toHaveProperty('createdAt');
    });

    test('descriptionがnullのチャンネルも正しく取得できる', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue([mockAvailableChannels[1]] as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(data.channels[0].description).toBeNull();
    });
  });

  /**
   * バリデーションエラー
   */
  describe('バリデーションエラー', () => {
    test('userIdが欠けている場合、400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/channels/available');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('ユーザーIDが必要です');

      // Prismaは呼ばれない
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  /**
   * 認証エラー
   */
  describe('認証エラー', () => {
    test('未認証ユーザーの場合、401エラーを返す', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。ログインしてください。');
    });

    test('リクエストのuserIdと認証userIdが不一致の場合、403エラーを返す', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'different-auth-id', email: 'other@example.com' } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('不正なリクエストです');
    });
  });

  /**
   * リソースが見つからないエラー
   */
  describe('リソースが見つからない', () => {
    test('Prismaユーザーが見つからない場合、404エラーを返す', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ユーザーが見つかりません');
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('ユーザー取得時のエラーで500エラーを返す', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('参加可能なチャンネルの取得に失敗しました');
      expect(data.details).toBe('DB error');
    });

    test('チャンネル取得時のエラーで500エラーを返す', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockRejectedValue(new Error('Channel fetch failed'));

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('参加可能なチャンネルの取得に失敗しました');
      expect(data.details).toBe('Channel fetch failed');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, channels, countフィールドを含む', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue(mockAvailableChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('channels');
      expect(data).toHaveProperty('count');
      expect(data.success).toBe(true);
    });

    test('countはchannels配列の長さと一致する', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue(mockAvailableChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(data.count).toBe(data.channels.length);
      expect(data.count).toBe(2);
    });

    test('エラー時、success, error, detailsフィールドを含む', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
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
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channelMember.findMany.mockResolvedValue(mockJoinedChannels as any);
      mockPrisma.channel.findMany.mockResolvedValue(mockAvailableChannels as any);

      const request = new NextRequest('http://localhost:3000/api/channels/available?userId=auth-123');
      await GET(request);

      // where条件でtype: 'channel'が指定されている
      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'channel',
          }),
        })
      );
    });
  });
});
