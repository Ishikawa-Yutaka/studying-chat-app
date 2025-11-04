/**
 * /api/dm/leave/[channelId] エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/dm/leave/[channelId]/route.ts
 *
 * このテストでは、DM退出APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - DM退出（DELETE）
 * - 認証チェック
 * - DMチャンネル専用チェック
 * - メンバーシップ確認
 * - チャンネル自動削除（メンバー0人時）
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/dm/leave/[channelId]/route';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    channel: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    channelMember: {
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase/server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('DELETE /api/dm/leave/[channelId] - DM退出', () => {
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

  const mockPartnerUser = {
    id: 'partner-456',
    authId: 'auth-partner-456',
    name: '相手ユーザー',
  };

  const mockDmChannel = {
    id: 'dm-channel-123',
    name: null,
    description: null,
    type: 'dm',
    creatorId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [
      {
        id: 'member-123',
        userId: 'user-123',
        channelId: 'dm-channel-123',
        joinedAt: new Date(),
        user: {
          id: 'user-123',
          name: 'テストユーザー',
          authId: 'auth-123',
        },
      },
      {
        id: 'member-456',
        userId: 'partner-456',
        channelId: 'dm-channel-123',
        joinedAt: new Date(),
        user: mockPartnerUser,
      },
    ],
  };

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
    test('DMから正常に退出できる', async () => {
      // モック設定
      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(mockDmChannel as any);
      mockPrisma.channelMember.delete.mockResolvedValue({} as any);
      mockPrisma.channelMember.count.mockResolvedValue(1); // 相手が残っている

      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      // API実行
      const response = await DELETE(request, context);
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('DMから退出しました');
      expect(data.partnerName).toBe('相手ユーザー');

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.channelMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-123' },
      });

      // チャンネルは削除されないことを確認
      expect(mockPrisma.channel.delete).not.toHaveBeenCalled();
    });

    test('最後のメンバーが退出した場合、チャンネルも削除される', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(mockDmChannel as any);
      mockPrisma.channelMember.delete.mockResolvedValue({} as any);
      mockPrisma.channelMember.count.mockResolvedValue(0); // 残りメンバー0人
      mockPrisma.channel.delete.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // メンバー削除後、チャンネルも削除されることを確認
      expect(mockPrisma.channelMember.delete).toHaveBeenCalled();
      expect(mockPrisma.channelMember.count).toHaveBeenCalledWith({
        where: { channelId: 'dm-channel-123' },
      });
      expect(mockPrisma.channel.delete).toHaveBeenCalledWith({
        where: { id: 'dm-channel-123' },
      });
    });

    test('相手の名前が取得できない場合、"不明"と表示される', async () => {
      const channelWithoutPartner = {
        ...mockDmChannel,
        members: [
          {
            id: 'member-123',
            userId: 'user-123',
            channelId: 'dm-channel-123',
            joinedAt: new Date(),
            user: {
              id: 'user-123',
              name: 'テストユーザー',
              authId: 'auth-123',
            },
          },
        ],
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(channelWithoutPartner as any);
      mockPrisma.channelMember.delete.mockResolvedValue({} as any);
      mockPrisma.channelMember.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(data.partnerName).toBe('不明');
    });
  });

  /**
   * バリデーションエラー
   */
  describe('バリデーションエラー', () => {
    test('channelIdが空の場合、400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/dm/leave/');
      const context = {
        params: Promise.resolve({ channelId: '' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('チャンネルIDが必要です');
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

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。ログインしてください。');
    });
  });

  /**
   * リソースが見つからないエラー
   */
  describe('リソースが見つからない', () => {
    test('Prismaユーザーが見つからない場合、404エラーを返す', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ユーザー情報が見つかりません');
    });

    test('チャンネルが存在しない場合、404エラーを返す', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/dm/leave/non-existent');
      const context = {
        params: Promise.resolve({ channelId: 'non-existent' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('DMが見つかりません');
    });
  });

  /**
   * ビジネスロジックエラー
   */
  describe('ビジネスロジックエラー', () => {
    test('通常のチャンネル（DMでない）の場合、403エラーを返す', async () => {
      const normalChannel = {
        ...mockDmChannel,
        type: 'channel',
        name: '一般チャンネル',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(normalChannel as any);

      const request = new NextRequest('http://localhost:3000/api/dm/leave/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('このAPIはDMチャンネル専用です');
    });

    test('DMのメンバーでない場合、403エラーを返す', async () => {
      const channelWithoutUser = {
        ...mockDmChannel,
        members: [
          {
            id: 'member-456',
            userId: 'partner-456',
            channelId: 'dm-channel-123',
            joinedAt: new Date(),
            user: mockPartnerUser,
          },
        ],
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(channelWithoutUser as any);

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('このDMのメンバーではありません');
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('ユーザー取得時のエラーで500エラーを返す', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('DMからの退出に失敗しました');
      expect(data.details).toBe('DB error');
    });

    test('メンバー削除時のエラーで500エラーを返す', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(mockDmChannel as any);
      mockPrisma.channelMember.delete.mockRejectedValue(new Error('Delete failed'));

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('DMからの退出に失敗しました');
      expect(data.details).toBe('Delete failed');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, message, partnerNameフィールドを含む', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(mockDmChannel as any);
      mockPrisma.channelMember.delete.mockResolvedValue({} as any);
      mockPrisma.channelMember.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('partnerName');
      expect(data.success).toBe(true);
    });

    test('エラー時、success, errorフィールドを含む', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/dm/leave/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(data).not.toHaveProperty('partnerName');
    });
  });
});
