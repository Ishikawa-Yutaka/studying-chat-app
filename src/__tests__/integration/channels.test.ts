/**
 * チャンネルAPI統合テスト
 *
 * テスト対象: src/app/api/channels/route.ts
 *
 * このテストでは、チャンネルの一覧取得・作成機能を実際のデータベースと連携してテストします。
 *
 * テストする機能:
 * - GET /api/channels: チャンネル一覧取得（通常チャンネルとDMを分離）
 * - POST /api/channels: チャンネル作成
 *
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/channels/route';
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  createTestUser,
  createTestChannel,
  createTestDMChannel,
  addUserToChannel,
  clearDatabase,
} from './setup';
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

// Supabase認証のみモック
jest.mock('@/lib/auth-server', () => ({
  getCurrentUser: jest.fn(),
  checkChannelMembership: jest.fn(),
}));

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('チャンネルAPI統合テスト', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  /**
   * GET /api/channels のテスト
   */
  describe('GET /api/channels（チャンネル一覧取得）', () => {
    test('正常系: ユーザーが参加しているチャンネル一覧を取得できる', async () => {
      // 1. テストデータ作成
      const user = await createTestUser({
        authId: 'test-auth-1',
        name: 'テストユーザー',
        email: 'test@example.com',
      });

      const channel1 = await createTestChannel({
        name: 'チャンネル1',
        description: 'テストチャンネル1',
        type: 'channel',
      });

      const channel2 = await createTestChannel({
        name: 'チャンネル2',
        description: 'テストチャンネル2',
        type: 'channel',
      });

      // ユーザーを2つのチャンネルに追加
      await addUserToChannel(user.id, channel1.id);
      await addUserToChannel(user.id, channel2.id);

      // 2. 認証モック設定
      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      // 3. APIリクエスト実行
      const request = new NextRequest('http://localhost:3000/api/channels');
      const response = await GET(request);

      // 4. レスポンス検証
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.channels).toHaveLength(2);
      expect(data.counts.channels).toBe(2);

      // チャンネル情報の確認
      expect(data.channels[0].name).toBe('チャンネル1');
      expect(data.channels[1].name).toBe('チャンネル2');
    });

    test('正常系: 通常チャンネルとDMを分離して取得できる', async () => {
      // 1. 2人のユーザーを作成
      const user1 = await createTestUser({
        authId: 'user1-auth',
        name: 'ユーザー1',
        email: 'user1@example.com',
      });

      const user2 = await createTestUser({
        authId: 'user2-auth',
        name: 'ユーザー2',
        email: 'user2@example.com',
      });

      // 通常チャンネル作成
      const channel = await createTestChannel({
        name: '通常チャンネル',
        type: 'channel',
      });

      await addUserToChannel(user1.id, channel.id);

      // DMチャンネル作成
      await createTestDMChannel(user1.id, user2.id);

      // 2. 認証モック設定
      mockGetCurrentUser.mockResolvedValue({
        user: user1,
        error: null,
        status: 200,
      });

      // 3. APIリクエスト実行
      const request = new NextRequest('http://localhost:3000/api/channels');
      const response = await GET(request);

      // 4. レスポンス検証
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.channels).toHaveLength(1);
      expect(data.directMessages).toHaveLength(1);
      expect(data.counts.channels).toBe(1);
      expect(data.counts.directMessages).toBe(1);

      // チャンネル情報確認
      expect(data.channels[0].name).toBe('通常チャンネル');

      // DM情報確認
      expect(data.directMessages[0].partnerName).toBe('ユーザー2');
      expect(data.directMessages[0].partnerEmail).toBe('user2@example.com');
    });

    test('正常系: ユーザーが参加していないチャンネルは取得されない', async () => {
      const user = await createTestUser();

      // チャンネルを作成するが、ユーザーをメンバーに追加しない
      await createTestChannel({
        name: '参加していないチャンネル',
      });

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      const request = new NextRequest('http://localhost:3000/api/channels');
      const response = await GET(request);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.channels).toHaveLength(0);
      expect(data.directMessages).toHaveLength(0);
    });

    test('正常系: 現在のユーザー情報も返される', async () => {
      const user = await createTestUser({
        authId: 'current-user-auth',
        name: '現在のユーザー',
        email: 'current@example.com',
      });

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      const request = new NextRequest('http://localhost:3000/api/channels');
      const response = await GET(request);

      const data = await response.json();

      expect(data.currentUser).toBeDefined();
      expect(data.currentUser.name).toBe('現在のユーザー');
      expect(data.currentUser.email).toBe('current@example.com');
      expect(data.currentUser.authId).toBe('current-user-auth');
    });

    test('異常系: 認証エラーの場合、401エラーを返す', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です。ログインしてください。',
        status: 401,
      });

      const request = new NextRequest('http://localhost:3000/api/channels');
      const response = await GET(request);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('認証が必要です。ログインしてください。');
    });
  });

  /**
   * POST /api/channels のテスト
   */
  describe('POST /api/channels（チャンネル作成）', () => {
    test('正常系: 新しいチャンネルを作成できる', async () => {
      // 1. テストデータ作成
      const user = await createTestUser({
        authId: 'creator-auth',
        name: 'チャンネル作成者',
        email: 'creator@example.com',
      });

      // 2. 認証モック設定
      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      // 3. APIリクエスト実行
      const requestBody = {
        name: '新しいチャンネル',
        description: 'これは新しいチャンネルです',
      };

      const request = new NextRequest('http://localhost:3000/api/channels', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      // 4. レスポンス検証
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.channel.name).toBe('新しいチャンネル');
      expect(data.channel.description).toBe('これは新しいチャンネルです');
      expect(data.channel.memberCount).toBe(1); // 作成者が自動的にメンバーになる
      expect(data.channel.createdBy.name).toBe('チャンネル作成者');
    });

    test('正常系: 作成者が自動的にメンバーに追加される', async () => {
      const user = await createTestUser({
        authId: 'auto-member-auth',
        name: '自動メンバー',
      });

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      const requestBody = {
        name: 'メンバー自動追加テスト',
        description: 'テスト',
      };

      const request = new NextRequest('http://localhost:3000/api/channels', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.channel.memberCount).toBe(1);

      // データベースで確認
      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      const getRequest = new NextRequest('http://localhost:3000/api/channels');
      const getResponse = await GET(getRequest);
      const getData = await getResponse.json();

      // 作成したチャンネルが一覧に含まれている
      expect(getData.channels).toHaveLength(1);
      expect(getData.channels[0].name).toBe('メンバー自動追加テスト');
    });

    test('異常系: チャンネル名が空の場合、400エラーを返す', async () => {
      const user = await createTestUser();

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      const requestBody = {
        name: '',
        description: 'テスト',
      };

      const request = new NextRequest('http://localhost:3000/api/channels', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('チャンネル名を入力してください');
    });

    test('異常系: 同名のチャンネルが既に存在する場合、409エラーを返す', async () => {
      const user = await createTestUser();

      // 既存チャンネル作成
      await createTestChannel({
        name: '既存チャンネル',
      });

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      const requestBody = {
        name: '既存チャンネル',
        description: '重複テスト',
      };

      const request = new NextRequest('http://localhost:3000/api/channels', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('このチャンネル名は既に使用されています');
    });

    test('異常系: 認証エラーの場合、401エラーを返す', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です。ログインしてください。',
        status: 401,
      });

      const requestBody = {
        name: 'テストチャンネル',
      };

      const request = new NextRequest('http://localhost:3000/api/channels', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('認証が必要です。ログインしてください。');
    });

    test('正常系: 説明なしでもチャンネルを作成できる', async () => {
      const user = await createTestUser();

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      const requestBody = {
        name: '説明なしチャンネル',
      };

      const request = new NextRequest('http://localhost:3000/api/channels', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.channel.name).toBe('説明なしチャンネル');
      expect(data.channel.description).toBeNull();
    });
  });

  /**
   * エンドツーエンドシナリオテスト
   */
  describe('エンドツーエンドシナリオ', () => {
    test('シナリオ: チャンネル作成後、すぐに一覧取得できる', async () => {
      const user = await createTestUser({
        authId: 'scenario-user',
        name: 'シナリオユーザー',
      });

      mockGetCurrentUser.mockResolvedValue({
        user: user,
        error: null,
        status: 200,
      });

      // 1. チャンネル作成
      const postRequest = new NextRequest('http://localhost:3000/api/channels', {
        method: 'POST',
        body: JSON.stringify({
          name: 'シナリオチャンネル',
          description: 'E2Eテスト',
        }),
      });

      const postResponse = await POST(postRequest);
      expect(postResponse.status).toBe(201);

      // 2. チャンネル一覧取得
      const getRequest = new NextRequest('http://localhost:3000/api/channels');
      const getResponse = await GET(getRequest);

      expect(getResponse.status).toBe(200);

      const data = await getResponse.json();
      expect(data.channels).toHaveLength(1);
      expect(data.channels[0].name).toBe('シナリオチャンネル');
    });

    test(
      'シナリオ: 複数ユーザーがそれぞれチャンネルを作成し、自分のチャンネルのみ取得できる',
      async () => {
        // 1. 2人のユーザーを作成
        const user1 = await createTestUser({
          authId: 'multi-user-1',
          name: 'ユーザー1',
        });

        const user2 = await createTestUser({
          authId: 'multi-user-2',
          name: 'ユーザー2',
        });

        // 2. ユーザー1がチャンネル作成
        mockGetCurrentUser.mockResolvedValue({
          user: user1,
          error: null,
          status: 200,
        });

        const post1Request = new NextRequest('http://localhost:3000/api/channels', {
          method: 'POST',
          body: JSON.stringify({
            name: 'ユーザー1のチャンネル',
          }),
        });

        await POST(post1Request);

        // 3. ユーザー2がチャンネル作成
        mockGetCurrentUser.mockResolvedValue({
          user: user2,
          error: null,
          status: 200,
        });

        const post2Request = new NextRequest('http://localhost:3000/api/channels', {
          method: 'POST',
          body: JSON.stringify({
            name: 'ユーザー2のチャンネル',
          }),
        });

        await POST(post2Request);

        // 4. ユーザー1がチャンネル一覧取得
        mockGetCurrentUser.mockResolvedValue({
          user: user1,
          error: null,
          status: 200,
        });

        const get1Request = new NextRequest('http://localhost:3000/api/channels');
        const get1Response = await GET(get1Request);
        const data1 = await get1Response.json();

        expect(data1.channels).toHaveLength(1);
        expect(data1.channels[0].name).toBe('ユーザー1のチャンネル');

        // 5. ユーザー2がチャンネル一覧取得
        mockGetCurrentUser.mockResolvedValue({
          user: user2,
          error: null,
          status: 200,
        });

        const get2Request = new NextRequest('http://localhost:3000/api/channels');
        const get2Response = await GET(get2Request);
        const data2 = await get2Response.json();

        expect(data2.channels).toHaveLength(1);
        expect(data2.channels[0].name).toBe('ユーザー2のチャンネル');
      },
      15000
    );
  });
});
