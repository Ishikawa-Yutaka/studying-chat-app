/**
 * /api/channels/[channelId] DELETE エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/channels/[channelId]/route.ts
 *
 * このテストでは、チャンネル削除APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - チャンネル削除（DELETE）
 * - 認証チェック
 * - 作成者権限チェック
 * - DMは削除不可
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/channels/[channelId]/route';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('DELETE /api/channels/[channelId] - チャンネル削除', () => {
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
    type: 'channel',
    creatorId: 'user-123', // テストユーザーが作成者
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('作成者がチャンネルを正常に削除できる', async () => {
      // モック設定
      mockGetCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
        status: 200,
      });
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channel.delete.mockResolvedValue(mockChannel as any);

      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      // API実行
      const response = await DELETE(request, context);
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('チャンネルを削除しました');
      expect(data.channelName).toBe('一般');

      // Prismaが正しく呼ばれているか確認
      expect(mockPrisma.channel.delete).toHaveBeenCalledWith({
        where: { id: 'channel-123' },
      });
    });

    test('作成者が削除済み（null）の場合、全メンバーが削除できる', async () => {
      const channelWithoutCreator = {
        ...mockChannel,
        creatorId: null, // 作成者削除済み
      };

      mockGetCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
        status: 200,
      });
      mockPrisma.channel.findUnique.mockResolvedValue(channelWithoutCreator as any);
      mockPrisma.channel.delete.mockResolvedValue(channelWithoutCreator as any);

      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  /**
   * バリデーションエラー
   */
  describe('バリデーションエラー', () => {
    test('channelIdが空の場合、400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/channels/');
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
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です',
        status: 401,
      });

      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です');
    });

    test('認証エラーがある場合、適切なステータスコードを返す', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: 'セッションが無効です',
        status: 403,
      });

      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('セッションが無効です');
    });
  });

  /**
   * リソースが見つからないエラー
   */
  describe('リソースが見つからない', () => {
    test('存在しないチャンネルIDの場合、404エラーを返す', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
        status: 200,
      });
      mockPrisma.channel.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/channels/non-existent');
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
    test('作成者でないユーザーが削除しようとすると403エラーを返す', async () => {
      const otherUser = {
        ...mockUser,
        id: 'other-user-456',
        name: '他のユーザー',
      };

      mockGetCurrentUser.mockResolvedValue({
        user: otherUser,
        error: null,
        status: 200,
      });
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);

      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('チャンネルを削除する権限がありません。作成者のみが削除できます。');
    });

    test('DMタイプのチャンネルは削除できない', async () => {
      const dmChannel = {
        ...mockChannel,
        type: 'dm',
      };

      mockGetCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
        status: 200,
      });
      mockPrisma.channel.findUnique.mockResolvedValue(dmChannel as any);

      const request = new NextRequest('http://localhost:3000/api/channels/dm-channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'dm-channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ダイレクトメッセージは削除できません。退出機能を使用してください。');
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('チャンネル取得時のエラーで500エラーを返す', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
        status: 200,
      });
      mockPrisma.channel.findUnique.mockRejectedValue(new Error('DB connection error'));

      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('チャンネルの削除に失敗しました');
      expect(data.details).toBe('DB connection error');
    });

    test('チャンネル削除時のエラーで500エラーを返す', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
        status: 200,
      });
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channel.delete.mockRejectedValue(new Error('Delete failed'));

      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('チャンネルの削除に失敗しました');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, message, channelNameフィールドを含む', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: mockUser,
        error: null,
        status: 200,
      });
      mockPrisma.channel.findUnique.mockResolvedValue(mockChannel as any);
      mockPrisma.channel.delete.mockResolvedValue(mockChannel as any);

      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('channelName');
    });

    test('エラー時、success, errorフィールドを含む', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です',
        status: 401,
      });

      const request = new NextRequest('http://localhost:3000/api/channels/channel-123');
      const context = {
        params: Promise.resolve({ channelId: 'channel-123' }),
      };

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).not.toHaveProperty('channelName');
    });
  });
});
