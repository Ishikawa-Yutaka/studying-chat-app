/**
 * /api/channel-members エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/channel-members/route.ts
 *
 * このテストでは、チャンネルメンバー管理APIの
 * 動作を確認します。
 *
 * テストする機能:
 * - メンバー追加（POST）
 * - メンバー削除（DELETE）
 * - バリデーション（必須項目チェック）
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/channel-members/route';
import { prisma } from '@/lib/prisma';

// Prismaのモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    channel: {
      findUnique: jest.fn(),
    },
    channelMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/channel-members - チャンネルメンバー管理', () => {
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
    description: '一般チャンネル',
    type: 'channel',
    creatorId: 'creator-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: 'member-123',
    channelId: 'channel-123',
    userId: 'user-123',
    joinedAt: new Date(),
    user: {
      id: 'user-123',
      name: 'テストユーザー',
      email: 'test@example.com',
      authId: 'auth-123',
    },
    channel: {
      id: 'channel-123',
      name: '一般',
      description: '一般チャンネル',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * POST /api/channel-members - メンバー追加
   */
  describe('POST - メンバー追加', () => {
    /**
     * 正常系
     */
    describe('正常系', () => {
      test('チャンネルに新しいメンバーを追加できる', async () => {
        // モックを設定
        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.channel.findUnique.mockResolvedValue(mockChannel);
        mockPrisma.channelMember.findFirst.mockResolvedValue(null); // 既存メンバーなし
        mockPrisma.channelMember.create.mockResolvedValue(mockMember as any);

        // リクエスト作成
        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'POST',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'auth-123',
            inviterId: 'inviter-id',
          }),
        });

        // API実行
        const response = await POST(request);
        const data = await response.json();

        // レスポンス確認
        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.member).toBeDefined();
        expect(data.message).toContain('テストユーザー');
        expect(data.message).toContain('一般');

        // Prismaが正しく呼ばれているか確認
        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: { authId: 'auth-123' },
        });
        expect(mockPrisma.channel.findUnique).toHaveBeenCalledWith({
          where: { id: 'channel-123' },
        });
        expect(mockPrisma.channelMember.create).toHaveBeenCalled();
      });

      test('メンバー追加時に正しいメッセージが返される', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.channel.findUnique.mockResolvedValue(mockChannel);
        mockPrisma.channelMember.findFirst.mockResolvedValue(null);
        mockPrisma.channelMember.create.mockResolvedValue(mockMember as any);

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'POST',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'auth-123',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.message).toBe('テストユーザーを一般に招待しました');
      });
    });

    /**
     * バリデーションエラー
     */
    describe('バリデーションエラー', () => {
      test('channelIdが欠けている場合、400エラーを返す', async () => {
        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'POST',
          body: JSON.stringify({
            userAuthId: 'auth-123',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('チャンネルIDとユーザーIDが必要です');
      });

      test('userAuthIdが欠けている場合、400エラーを返す', async () => {
        const request = new NextRequest('http://localhost:3000/api/channel-members', {
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

      test('両方のパラメータが欠けている場合、400エラーを返す', async () => {
        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'POST',
          body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
      });
    });

    /**
     * リソースが見つからないエラー
     */
    describe('リソースが見つからない', () => {
      test('招待対象のユーザーが存在しない場合、404エラーを返す', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'POST',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'non-existent',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('招待対象のユーザーが見つかりません');
      });

      test('チャンネルが存在しない場合、404エラーを返す', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.channel.findUnique.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'POST',
          body: JSON.stringify({
            channelId: 'non-existent',
            userAuthId: 'auth-123',
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
      test('既にメンバーの場合、400エラーを返す', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.channel.findUnique.mockResolvedValue(mockChannel);
        mockPrisma.channelMember.findFirst.mockResolvedValue(mockMember as any); // 既存メンバーあり

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'POST',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'auth-123',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('このユーザーは既にチャンネルのメンバーです');
      });
    });

    /**
     * データベースエラー
     */
    describe('データベースエラー', () => {
      test('データベースエラー時、500エラーを返す', async () => {
        mockPrisma.user.findFirst.mockRejectedValue(new Error('DB error'));

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'POST',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'auth-123',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('チャンネルメンバーの追加に失敗しました');
        expect(data.details).toBe('DB error');
      });
    });
  });

  /**
   * DELETE /api/channel-members - メンバー削除
   */
  describe('DELETE - メンバー削除', () => {
    /**
     * 正常系
     */
    describe('正常系', () => {
      test('チャンネルからメンバーを削除できる', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.channelMember.findFirst.mockResolvedValue(mockMember as any);
        mockPrisma.channelMember.delete.mockResolvedValue(mockMember as any);

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'DELETE',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'auth-123',
            removerId: 'remover-id',
          }),
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toContain('テストユーザー');
        expect(data.message).toContain('一般');

        // Prismaが正しく呼ばれているか確認
        expect(mockPrisma.channelMember.delete).toHaveBeenCalledWith({
          where: { id: 'member-123' },
        });
      });

      test('削除時に正しいメッセージが返される', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.channelMember.findFirst.mockResolvedValue(mockMember as any);
        mockPrisma.channelMember.delete.mockResolvedValue(mockMember as any);

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'DELETE',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'auth-123',
          }),
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(data.message).toBe('テストユーザーを一般から削除しました');
      });
    });

    /**
     * バリデーションエラー
     */
    describe('バリデーションエラー', () => {
      test('channelIdが欠けている場合、400エラーを返す', async () => {
        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'DELETE',
          body: JSON.stringify({
            userAuthId: 'auth-123',
          }),
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('チャンネルIDとユーザーIDが必要です');
      });

      test('userAuthIdが欠けている場合、400エラーを返す', async () => {
        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'DELETE',
          body: JSON.stringify({
            channelId: 'channel-123',
          }),
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
      });
    });

    /**
     * リソースが見つからないエラー
     */
    describe('リソースが見つからない', () => {
      test('削除対象のユーザーが存在しない場合、404エラーを返す', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'DELETE',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'non-existent',
          }),
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('削除対象のユーザーが見つかりません');
      });

      test('ユーザーがチャンネルのメンバーでない場合、400エラーを返す', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.channelMember.findFirst.mockResolvedValue(null); // メンバーでない

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'DELETE',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'auth-123',
          }),
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('このユーザーはチャンネルのメンバーではありません');
      });
    });

    /**
     * データベースエラー
     */
    describe('データベースエラー', () => {
      test('データベースエラー時、500エラーを返す', async () => {
        mockPrisma.user.findFirst.mockRejectedValue(new Error('DB error'));

        const request = new NextRequest('http://localhost:3000/api/channel-members', {
          method: 'DELETE',
          body: JSON.stringify({
            channelId: 'channel-123',
            userAuthId: 'auth-123',
          }),
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('チャンネルメンバーの削除に失敗しました');
      });
    });
  });
});
