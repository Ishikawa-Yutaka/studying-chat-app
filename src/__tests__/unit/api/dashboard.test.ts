/**
 * /api/dashboard エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/dashboard/route.ts
 *
 * このテストでは、ダッシュボード統計取得APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - ダッシュボード統計取得（GET）
 * - 認証チェック
 * - 参加チャンネル・DM一覧取得
 * - DM相手ごとのメッセージ統計
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dashboard/route';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channelMember: {
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    channel: {
      findMany: jest.fn(),
    },
    message: {
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('GET /api/dashboard - ダッシュボード統計取得', () => {
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

  const mockPartnerUser = {
    id: 'user-456',
    authId: 'auth-456',
    name: 'DM相手',
    email: 'partner@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  const mockChannelMemberships = [
    {
      userId: 'user-123',
      channelId: 'channel-1',
      channel: {
        id: 'channel-1',
        name: '一般',
        description: '一般的な話題',
        type: 'channel',
        members: [
          { userId: 'user-123', user: mockUser },
          { userId: 'user-456', user: mockPartnerUser },
        ],
      },
    },
    {
      userId: 'user-123',
      channelId: 'dm-1',
      channel: {
        id: 'dm-1',
        name: null,
        description: null,
        type: 'dm',
        members: [
          { userId: 'user-123', user: mockUser },
          { userId: 'user-456', user: mockPartnerUser },
        ],
      },
    },
  ];

  const mockAllChannels = [
    {
      id: 'channel-1',
      name: '一般',
      description: '一般的な話題',
      type: 'channel',
      members: [
        { userId: 'user-123', user: mockUser },
        { userId: 'user-456', user: mockPartnerUser },
      ],
    },
    {
      id: 'channel-2',
      name: 'ランダム',
      description: 'ランダムな話題',
      type: 'channel',
      members: [
        { userId: 'user-456', user: mockPartnerUser },
      ],
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

    // デフォルトのPrismaモック
    mockPrisma.channelMember.findMany.mockResolvedValue(mockChannelMemberships as any);
    mockPrisma.user.count.mockResolvedValue(10);
    mockPrisma.channel.findMany.mockResolvedValue(mockAllChannels as any);

    // メッセージカウントのモック（DM統計用）
    (mockPrisma.message.count as jest.Mock)
      .mockResolvedValueOnce(5)  // sentCount
      .mockResolvedValueOnce(3); // receivedCount
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('ダッシュボード統計を正常に取得できる', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.allChannels).toBeDefined();
      expect(data.myChannels).toBeDefined();
      expect(data.directMessages).toBeDefined();
      expect(data.dmStats).toBeDefined();
    });

    test('stats: 自分が参加しているチャンネル数が正しく計算される', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      // channelCount: 参加している通常チャンネル数（DM以外）
      expect(data.stats.channelCount).toBe(1); // mockChannelMemberships の type='channel' は1つ
      expect(data.stats.dmPartnerCount).toBe(1); // DM相手は1人
      expect(data.stats.totalUserCount).toBe(10); // ワークスペース全体のユーザー数
    });

    test('allChannels: 全チャンネル（参加・未参加問わず）が返される', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(data.allChannels).toHaveLength(2); // mockAllChannels の2件
      expect(data.allChannels[0]).toEqual({
        id: 'channel-1',
        name: '一般',
        description: '一般的な話題',
        memberCount: 2,
      });
      expect(data.allChannels[1]).toEqual({
        id: 'channel-2',
        name: 'ランダム',
        description: 'ランダムな話題',
        memberCount: 1,
      });
    });

    test('myChannels: 自分が参加しているチャンネルのみ返される', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(data.myChannels).toHaveLength(1);
      expect(data.myChannels[0]).toEqual({
        id: 'channel-1',
        name: '一般',
        description: '一般的な話題',
        memberCount: 2,
      });
    });

    test('directMessages: DM相手の情報が正しく返される', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(data.directMessages).toHaveLength(1);
      expect(data.directMessages[0]).toEqual({
        id: 'dm-1',
        partnerId: 'auth-456', // Supabase AuthID
        partnerName: 'DM相手',
        partnerEmail: 'partner@example.com',
        partnerAvatarUrl: 'https://example.com/avatar.jpg',
      });
    });

    test('dmStats: DM相手ごとのメッセージ統計が正しく計算される', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(data.dmStats).toHaveLength(1);
      expect(data.dmStats[0]).toEqual({
        partnerId: 'auth-456',
        partnerName: 'DM相手',
        partnerEmail: 'partner@example.com',
        partnerAvatarUrl: 'https://example.com/avatar.jpg',
        sentCount: 5,        // 自分が送信したメッセージ数
        receivedCount: 3,    // 相手から受信したメッセージ数
        totalCount: 8,       // 合計メッセージ数
      });

      // メッセージカウントクエリが正しく呼ばれているか確認
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          channelId: 'dm-1',
          senderId: 'user-123',
        },
      });

      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          channelId: 'dm-1',
          senderId: { not: 'user-123' },
        },
      });
    });

    test('type="channel"のチャンネルのみ全チャンネル一覧に含まれる', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      await GET(request);

      // Prisma query確認
      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith({
        where: {
          type: 'channel', // DMは除外
        },
        include: expect.any(Object),
      });
    });

    test('参加チャンネルが0件でも正常に動作する', async () => {
      mockPrisma.channelMember.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.channelCount).toBe(0);
      expect(data.stats.dmPartnerCount).toBe(0);
      expect(data.myChannels).toHaveLength(0);
      expect(data.directMessages).toHaveLength(0);
      expect(data.dmStats).toHaveLength(0);
    });

    test('DM相手が複数いる場合、全員分の統計が返される', async () => {
      const multiDmMemberships = [
        {
          userId: 'user-123',
          channelId: 'dm-1',
          channel: {
            id: 'dm-1',
            type: 'dm',
            members: [
              { userId: 'user-123', user: mockUser },
              { userId: 'user-456', user: { ...mockPartnerUser, authId: 'auth-456' } },
            ],
          },
        },
        {
          userId: 'user-123',
          channelId: 'dm-2',
          channel: {
            id: 'dm-2',
            type: 'dm',
            members: [
              { userId: 'user-123', user: mockUser },
              { userId: 'user-789', user: { authId: 'auth-789', name: 'DM相手2', email: 'partner2@example.com', avatarUrl: null } },
            ],
          },
        },
      ];

      mockPrisma.channelMember.findMany.mockResolvedValue(multiDmMemberships as any);
      (mockPrisma.message.count as jest.Mock)
        .mockResolvedValueOnce(5)  // dm-1 sentCount
        .mockResolvedValueOnce(3)  // dm-1 receivedCount
        .mockResolvedValueOnce(2)  // dm-2 sentCount
        .mockResolvedValueOnce(1); // dm-2 receivedCount

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(data.dmStats).toHaveLength(2);
      expect(data.stats.dmPartnerCount).toBe(2);
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

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('認証が必要です');

      // Prismaは呼ばれない
      expect(mockPrisma.channelMember.findMany).not.toHaveBeenCalled();
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('channelMember取得時のエラーで500エラーを返す', async () => {
      mockPrisma.channelMember.findMany.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('ダッシュボード統計の取得に失敗しました');
      expect(data.details).toBe('DB error');
    });

    test('user.count時のエラーで500エラーを返す', async () => {
      mockPrisma.user.count.mockRejectedValue(new Error('Count error'));

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('ダッシュボード統計の取得に失敗しました');
      expect(data.details).toBe('Count error');
    });

    test('channel.findMany時のエラーで500エラーを返す', async () => {
      mockPrisma.channel.findMany.mockRejectedValue(new Error('Channel error'));

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('ダッシュボード統計の取得に失敗しました');
      expect(data.details).toBe('Channel error');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, stats, allChannels, myChannels, directMessages, dmStatsフィールドを含む', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('allChannels');
      expect(data).toHaveProperty('myChannels');
      expect(data).toHaveProperty('directMessages');
      expect(data).toHaveProperty('dmStats');
      expect(data.success).toBe(true);
    });

    test('エラー時、success, error, detailsフィールドを含む', async () => {
      mockPrisma.channelMember.findMany.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(data.success).toBe(false);
      expect(data).not.toHaveProperty('stats');
    });

    test('stats: channelCount, dmPartnerCount, totalUserCountフィールドを含む', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      expect(data.stats).toHaveProperty('channelCount');
      expect(data.stats).toHaveProperty('dmPartnerCount');
      expect(data.stats).toHaveProperty('totalUserCount');
    });

    test('dmStats: partnerId, partnerName, sentCount, receivedCount, totalCountフィールドを含む', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      if (data.dmStats.length > 0) {
        expect(data.dmStats[0]).toHaveProperty('partnerId');
        expect(data.dmStats[0]).toHaveProperty('partnerName');
        expect(data.dmStats[0]).toHaveProperty('partnerEmail');
        expect(data.dmStats[0]).toHaveProperty('partnerAvatarUrl');
        expect(data.dmStats[0]).toHaveProperty('sentCount');
        expect(data.dmStats[0]).toHaveProperty('receivedCount');
        expect(data.dmStats[0]).toHaveProperty('totalCount');
      }
    });
  });

  /**
   * DM相手検出ロジック
   */
  describe('DM相手検出', () => {
    test('DMチャンネルから自分以外のユーザーを正しく検出する', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      // DM相手が正しく検出されている
      expect(data.directMessages[0].partnerId).toBe('auth-456');
      expect(data.directMessages[0].partnerName).toBe('DM相手');
    });

    test('DMメンバーが1人しかいない場合（異常データ）、DM相手が検出されない', async () => {
      const invalidDmMembership = [
        {
          userId: 'user-123',
          channelId: 'dm-invalid',
          channel: {
            id: 'dm-invalid',
            type: 'dm',
            members: [
              { userId: 'user-123', user: mockUser }, // 自分だけ
            ],
          },
        },
      ];

      mockPrisma.channelMember.findMany.mockResolvedValue(invalidDmMembership as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard');

      const response = await GET(request);
      const data = await response.json();

      // DM相手が検出されないため、directMessagesは空
      expect(data.directMessages).toHaveLength(0);
      expect(data.dmStats).toHaveLength(0);
    });
  });
});
