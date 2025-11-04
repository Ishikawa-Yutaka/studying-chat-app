/**
 * /api/channels/join エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/channels/join/route.ts
 *
 * このテストでは、チャンネル参加APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - チャンネル参加（POST）
 * - 認証チェック
 * - バリデーション
 * - 重複参加チェック
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/channels/join/route';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    channel: {
      findUnique: jest.fn(),
    },
    channelMember: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabase/server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('POST /api/channels/join - チャンネル参加', () => {
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

  const mockChannel = {
    id: 'channel-123',
    name: '一般',
    description: '一般チャンネル',
    type: 'channel',
    creatorId: 'creator-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [], // 参加していない
  };

  const mockMember = {
    id: 'member-123',
    userId: 'user-123',
    channelId: 'channel-123',
    joinedAt: new Date(),
    user: {
      id: 'user-123',
      name: 'テストユーザー',
      email: 'test@example.com',
    },
    channel: {
      id: 'channel-123',
      name: '一般',
      description: '一般チャンネル',
    },
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
    test('チャンネルに正常に参加できる', async () => {
      // モック設定
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channelMember.create.mockResolvedValue(mockMember as any);

      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-123',
          userId: 'auth-123',
        }),
      });

      // API実行
      const response = await POST(request);
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('チャンネルに参加しました');
      expect(data.channelId).toBe('channel-123');
      expect(data.channelName).toBe('一般');
      expect(data.member).toBeDefined();

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.channelMember.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          channelId: 'channel-123',
        },
        include: expect.any(Object),
      });
    });
  });

  /**
   * バリデーションエラー
   */
  describe('バリデーションエラー', () => {
    test('channelIdが欠けている場合、400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('チャンネルIDとユーザーIDが必要です');
    });

    test('userIdが欠けている場合、400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('チャンネルIDとユーザーIDが必要です');
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

      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-123',
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
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

      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-123',
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
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

      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-123',
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ユーザーが見つかりません');
    });

    test('チャンネルが存在しない場合、404エラーを返す', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'non-existent',
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('チャンネルが見つかりません');
    });
  });

  /**
   * ビジネスロジックエラー
   */
  describe('ビジネスロジックエラー', () => {
    test('DMチャンネルには参加できない', async () => {
      const dmChannel = {
        ...mockChannel,
        type: 'dm',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(dmChannel as any);

      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'dm-channel-123',
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('DMチャンネルには参加できません');
    });

    test('既に参加している場合、409エラーを返す', async () => {
      const channelWithMember = {
        ...mockChannel,
        members: [{ id: 'existing-member', userId: 'user-123' }],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(channelWithMember as any);

      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-123',
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('既にこのチャンネルに参加しています');
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('データベースエラー時、500エラーを返す', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-123',
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('チャンネルへの参加に失敗しました');
      expect(data.details).toBe('DB error');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、必要なフィールドを全て含む', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPrismaUser);
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channelMember.create.mockResolvedValue(mockMember as any);

      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-123',
          userId: 'auth-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('member');
      expect(data).toHaveProperty('channelId');
      expect(data).toHaveProperty('channelName');
    });

    test('エラー時、success, errorフィールドを含む', async () => {
      const request = new NextRequest('http://localhost:3000/api/channels/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
    });
  });
});
