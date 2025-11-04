/**
 * /api/channels/leave/[channelId] エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/channels/leave/[channelId]/route.ts
 *
 * このテストでは、チャンネル退出APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - チャンネル退出（DELETE）
 * - 認証チェック
 * - メンバーシップ確認
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/channels/leave/[channelId]/route';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findUnique: jest.fn(),
    },
    channelMember: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('DELETE /api/channels/leave/[channelId] - チャンネル退出', () => {
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

  const mockChannel = {
    id: 'channel-123',
    name: '一般',
    members: [
      { userId: 'user-123' }, // テストユーザーが参加
      { userId: 'user-456' },
    ],
  };

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
    test('チャンネルから正常に退出できる', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channelMember.deleteMany.mockResolvedValue({ count: 1 } as any);

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('チャンネルから退出しました');
      expect(data.channelName).toBe('一般');

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.channelMember.deleteMany).toHaveBeenCalledWith({
        where: {
          channelId: 'channel-123',
          userId: 'user-123',
        },
      });
    });

    test('複数メンバーがいるチャンネルから退出しても、他のメンバーは残る', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channelMember.deleteMany.mockResolvedValue({ count: 1 } as any);

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // 自分のメンバーシップのみ削除
      expect(mockPrisma.channelMember.deleteMany).toHaveBeenCalledWith({
        where: {
          channelId: 'channel-123',
          userId: 'user-123',
        },
      });
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

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です');

      // Prismaは呼ばれない
      expect(mockPrisma.channel.findUnique).not.toHaveBeenCalled();
    });
  });

  /**
   * リソースが見つからないエラー
   */
  describe('リソースが見つからない', () => {
    test('チャンネルが存在しない場合、404エラーを返す', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/channels/leave/non-existent');
      const context = {
        params: Promise.resolve({ channelId: 'non-existent' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('チャンネルが見つかりません');
    });
  });

  /**
   * 権限エラー
   */
  describe('権限エラー', () => {
    test('チャンネルのメンバーでない場合、403エラーを返す', async () => {
      const channelWithoutUser = {
        ...mockChannel,
        members: [
          { userId: 'user-456' }, // 他のユーザーのみ
        ],
      };

      mockPrisma.channel.findUnique.mockResolvedValue(channelWithoutUser as any);

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('このチャンネルのメンバーではありません');

      // deleteManyは呼ばれない
      expect(mockPrisma.channelMember.deleteMany).not.toHaveBeenCalled();
    });

    test('メンバーが0人のチャンネルの場合、403エラーを返す', async () => {
      const emptyChannel = {
        ...mockChannel,
        members: [],
      };

      mockPrisma.channel.findUnique.mockResolvedValue(emptyChannel as any);

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('このチャンネルのメンバーではありません');
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('チャンネル取得時のエラーで500エラーを返す', async () => {
      mockPrisma.channel.findUnique.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('チャンネルからの退出に失敗しました');
      expect(data.details).toBe('DB error');
    });

    test('メンバー削除時のエラーで500エラーを返す', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channelMember.deleteMany.mockRejectedValue(new Error('Delete failed'));

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('チャンネルからの退出に失敗しました');
      expect(data.details).toBe('Delete failed');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, channelName, messageフィールドを含む', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channelMember.deleteMany.mockResolvedValue({ count: 1 } as any);

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('channelName');
      expect(data).toHaveProperty('message');
      expect(data.success).toBe(true);
    });

    test('エラー時、success, errorフィールドを含む', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(data).not.toHaveProperty('channelName');
    });
  });
});
