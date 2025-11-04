/**
 * メッセージAPI統合テスト
 *
 * テスト対象: src/app/api/messages/[channelId]/route.ts
 *
 * このテストでは、メッセージの取得・送信機能を実際のデータベースと連携してテストします。
 *
 * テストする機能:
 * - GET /api/messages/[channelId]: メッセージ一覧取得
 * - POST /api/messages/[channelId]: メッセージ送信
 *
 * 統合テストの特徴:
 * - 実際のPrismaクライアントを使用（モックなし）
 * - 実際のデータベースに接続
 * - Supabase認証のみモック（テスト用ユーザーを使用）
 *
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/messages/[channelId]/route';
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  createTestUser,
  createTestChannel,
  addUserToChannel,
  createTestMessage,
  clearDatabase,
} from './setup';
import { NextRequest } from 'next/server';
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server';

// Supabase認証のみモック（データベースは実物を使用）
jest.mock('@/lib/auth-server', () => ({
  getCurrentUser: jest.fn(),
  checkChannelMembership: jest.fn(),
}));

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockCheckChannelMembership = checkChannelMembership as jest.MockedFunction<typeof checkChannelMembership>;

describe('メッセージAPI統合テスト', () => {
  // テスト前にデータベースをクリア
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  // テスト後にデータベースをクリア
  afterAll(async () => {
    await teardownIntegrationTest();
  });

  // 各テスト前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 各テスト後にデータベースをクリア
  afterEach(async () => {
    await clearDatabase();
  });

  /**
   * GET /api/messages/[channelId] のテスト
   */
  describe('GET /api/messages/[channelId]（メッセージ取得）', () => {
    test('正常系: チャンネル内のメッセージ一覧を取得できる', async () => {
      // 1. テストデータ作成
      const user = await createTestUser({
        authId: 'test-auth-123',
        name: 'テストユーザー',
        email: 'test@example.com',
      });

      const channel = await createTestChannel({
        name: 'テストチャンネル',
        type: 'channel',
      });

      await addUserToChannel(user.id, channel.id);

      // メッセージを3件作成
      await createTestMessage({
        content: 'メッセージ1',
        senderId: user.id,
        channelId: channel.id,
      });

      await createTestMessage({
        content: 'メッセージ2',
        senderId: user.id,
        channelId: channel.id,
      });

      await createTestMessage({
        content: 'メッセージ3',
        senderId: user.id,
        channelId: channel.id,
      });

      // 2. 認証モック設定
      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: true,
        error: null,
        status: 200,
      });

      // 3. APIリクエスト実行
      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`);
      const params = Promise.resolve({ channelId: channel.id });
      const response = await GET(request, { params });

      // 4. レスポンス検証
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.messages).toHaveLength(3);
      expect(data.count).toBe(3);

      // メッセージの内容を確認
      expect(data.messages[0].content).toBe('メッセージ1');
      expect(data.messages[1].content).toBe('メッセージ2');
      expect(data.messages[2].content).toBe('メッセージ3');

      // 送信者情報が含まれることを確認
      expect(data.messages[0].sender.name).toBe('テストユーザー');
      expect(data.messages[0].sender.email).toBe('test@example.com');
    });

    test('正常系: メッセージが0件の場合、空配列を返す', async () => {
      const user = await createTestUser();
      const channel = await createTestChannel();
      await addUserToChannel(user.id, channel.id);

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: true,
        error: null,
        status: 200,
      });

      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`);
      const params = Promise.resolve({ channelId: channel.id });
      const response = await GET(request, { params });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.messages).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    test('異常系: 認証エラーの場合、401エラーを返す', async () => {
      const channel = await createTestChannel();

      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です。ログインしてください。',
        status: 401,
      });

      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`);
      const params = Promise.resolve({ channelId: channel.id });
      const response = await GET(request, { params });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('認証が必要です。ログインしてください。');
    });

    test('異常系: チャンネルメンバーでない場合、403エラーを返す', async () => {
      const user = await createTestUser();
      const channel = await createTestChannel();
      // ユーザーをチャンネルに追加しない

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: false,
        error: 'このチャンネルにアクセスする権限がありません',
        status: 403,
      });

      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`);
      const params = Promise.resolve({ channelId: channel.id });
      const response = await GET(request, { params });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('このチャンネルにアクセスする権限がありません');
    });

    test('正常系: メッセージが古い順にソートされる', async () => {
      const user = await createTestUser();
      const channel = await createTestChannel();
      await addUserToChannel(user.id, channel.id);

      // 異なる時刻でメッセージを作成
      const date1 = new Date('2025-01-01T10:00:00Z');
      const date2 = new Date('2025-01-01T11:00:00Z');
      const date3 = new Date('2025-01-01T09:00:00Z');

      await createTestMessage({
        content: 'メッセージ2',
        senderId: user.id,
        channelId: channel.id,
        createdAt: date1,
      });

      await createTestMessage({
        content: 'メッセージ3',
        senderId: user.id,
        channelId: channel.id,
        createdAt: date2,
      });

      await createTestMessage({
        content: 'メッセージ1',
        senderId: user.id,
        channelId: channel.id,
        createdAt: date3,
      });

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: true,
        error: null,
        status: 200,
      });

      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`);
      const params = Promise.resolve({ channelId: channel.id });
      const response = await GET(request, { params });

      const data = await response.json();

      // 古い順にソートされることを確認
      expect(data.messages[0].content).toBe('メッセージ1'); // 09:00
      expect(data.messages[1].content).toBe('メッセージ2'); // 10:00
      expect(data.messages[2].content).toBe('メッセージ3'); // 11:00
    });
  });

  /**
   * POST /api/messages/[channelId] のテスト
   */
  describe('POST /api/messages/[channelId]（メッセージ送信）', () => {
    test('正常系: メッセージを送信できる', async () => {
      // 1. テストデータ作成
      const user = await createTestUser({
        authId: 'test-auth-456',
        name: 'テスト送信者',
        email: 'sender@example.com',
      });

      const channel = await createTestChannel({
        name: 'テストチャンネル',
        type: 'channel',
      });

      await addUserToChannel(user.id, channel.id);

      // 2. 認証モック設定
      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: true,
        error: null,
        status: 200,
      });

      // 3. APIリクエスト実行
      const requestBody = {
        content: 'こんにちは、これはテストメッセージです',
        senderId: user.authId, // SupabaseのAuthIDを使用
        channelId: channel.id,
      };

      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const params = Promise.resolve({ channelId: channel.id });
      const response = await POST(request, { params });

      // 4. レスポンス検証
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(data.message.content).toBe('こんにちは、これはテストメッセージです');
      expect(data.message.sender.name).toBe('テスト送信者');
      expect(data.message.sender.authId).toBe('test-auth-456');
    });

    test('異常系: 空のメッセージは送信できない', async () => {
      const user = await createTestUser({
        authId: 'test-auth-789',
      });

      const channel = await createTestChannel();
      await addUserToChannel(user.id, channel.id);

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: true,
        error: null,
        status: 200,
      });

      const requestBody = {
        content: '',
        senderId: user.authId,
        channelId: channel.id,
      };

      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const params = Promise.resolve({ channelId: channel.id });
      const response = await POST(request, { params });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('メッセージを入力してください');
    });

    test('異常系: 存在しないチャンネルにはメッセージを送信できない', async () => {
      const user = await createTestUser({
        authId: 'test-auth-999',
      });

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: true,
        error: null,
        status: 200,
      });

      const requestBody = {
        content: 'テストメッセージ',
        senderId: user.authId,
        channelId: 'non-existent-channel-id',
      };

      const request = new NextRequest('http://localhost:3000/api/messages/non-existent-channel-id', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const params = Promise.resolve({ channelId: 'non-existent-channel-id' });
      const response = await POST(request, { params });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('チャンネルが見つかりません');
    });

    test('異常系: 認証エラーの場合、401エラーを返す', async () => {
      const channel = await createTestChannel();

      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です。ログインしてください。',
        status: 401,
      });

      const requestBody = {
        content: 'テストメッセージ',
        senderId: 'test-auth-id',
        channelId: channel.id,
      };

      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const params = Promise.resolve({ channelId: channel.id });
      const response = await POST(request, { params });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('認証が必要です。ログインしてください。');
    });

    test('異常系: チャンネルメンバーでない場合、403エラーを返す', async () => {
      const user = await createTestUser({
        authId: 'test-auth-111',
      });

      const channel = await createTestChannel();
      // ユーザーをチャンネルに追加しない

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: false,
        error: 'このチャンネルにアクセスする権限がありません',
        status: 403,
      });

      const requestBody = {
        content: 'テストメッセージ',
        senderId: user.authId,
        channelId: channel.id,
      };

      const request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const params = Promise.resolve({ channelId: channel.id });
      const response = await POST(request, { params });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('このチャンネルにアクセスする権限がありません');
    });
  });

  /**
   * エンドツーエンドシナリオテスト
   */
  describe('エンドツーエンドシナリオ', () => {
    test('シナリオ: メッセージ送信後、すぐに取得できる', async () => {
      // 1. テストデータ作成
      const user = await createTestUser({
        authId: 'scenario-auth-1',
        name: 'シナリオユーザー',
      });

      const channel = await createTestChannel({
        name: 'シナリオチャンネル',
      });

      await addUserToChannel(user.id, channel.id);

      // 2. 認証モック設定
      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      mockCheckChannelMembership.mockResolvedValue({
        isMember: true,
        error: null,
        status: 200,
      });

      // 3. メッセージ送信
      const postRequest = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'シナリオテストメッセージ',
          senderId: user.authId,
          channelId: channel.id,
        }),
      });

      const postParams = Promise.resolve({ channelId: channel.id });
      const postResponse = await POST(postRequest, { params: postParams });

      expect(postResponse.status).toBe(201);

      // 4. メッセージ取得
      const getRequest = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`);
      const getParams = Promise.resolve({ channelId: channel.id });
      const getResponse = await GET(getRequest, { params: getParams });

      expect(getResponse.status).toBe(200);

      const data = await getResponse.json();
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].content).toBe('シナリオテストメッセージ');
      expect(data.messages[0].sender.name).toBe('シナリオユーザー');
    });

    test(
      'シナリオ: 複数ユーザーがメッセージを送信し、全員が取得できる',
      async () => {
        // 1. 2人のユーザーを作成
        const user1 = await createTestUser({
          authId: 'multi-auth-1',
          name: 'ユーザー1',
        });

        const user2 = await createTestUser({
          authId: 'multi-auth-2',
          name: 'ユーザー2',
        });

        const channel = await createTestChannel();

        await addUserToChannel(user1.id, channel.id);
        await addUserToChannel(user2.id, channel.id);

        // 2. ユーザー1がメッセージ送信
        mockGetCurrentUser.mockResolvedValue({
          user: user1,
          error: null,
          status: 200,
        });

        mockCheckChannelMembership.mockResolvedValue({
          isMember: true,
          error: null,
          status: 200,
        });

        const post1Request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`, {
          method: 'POST',
          body: JSON.stringify({
            content: 'ユーザー1のメッセージ',
            senderId: user1.authId,
            channelId: channel.id,
          }),
        });

        await POST(post1Request, { params: Promise.resolve({ channelId: channel.id }) });

        // 3. ユーザー2がメッセージ送信
        mockGetCurrentUser.mockResolvedValue({
          user: user2,
          error: null,
          status: 200,
        });

        const post2Request = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`, {
          method: 'POST',
          body: JSON.stringify({
            content: 'ユーザー2のメッセージ',
            senderId: user2.authId,
            channelId: channel.id,
          }),
        });

        await POST(post2Request, { params: Promise.resolve({ channelId: channel.id }) });

        // 4. メッセージ取得
        const getRequest = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`);
        const getResponse = await GET(getRequest, { params: Promise.resolve({ channelId: channel.id }) });

        const data = await getResponse.json();

        expect(data.messages).toHaveLength(2);
        expect(data.messages[0].content).toBe('ユーザー1のメッセージ');
        expect(data.messages[0].sender.name).toBe('ユーザー1');
        expect(data.messages[1].content).toBe('ユーザー2のメッセージ');
        expect(data.messages[1].sender.name).toBe('ユーザー2');
      },
      15000 // タイムアウト15秒に設定（データベース操作が多いため）
    );
  });
});
