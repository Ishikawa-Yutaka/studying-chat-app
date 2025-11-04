/**
 * DM API統合テスト
 *
 * テスト対象: src/app/api/dm/[partnerId]/route.ts
 *
 * このテストでは、DMチャンネルの取得・作成機能を実際のデータベースと連携してテストします。
 *
 * テストする機能:
 * - GET /api/dm/[partnerId]: DMチャンネル取得・作成
 * - 既存DMチャンネルの検索
 * - 新規DMチャンネルの作成
 * - 退出済みユーザーの再参加
 *
 * @jest-environment node
 */

import { GET } from '@/app/api/dm/[partnerId]/route';
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  createTestUser,
  createTestDMChannel,
  clearDatabase,
} from './setup';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

describe('DM API統合テスト', () => {
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
   * GET /api/dm/[partnerId] のテスト
   */
  describe('GET /api/dm/[partnerId]（DMチャンネル取得・作成）', () => {
    test('正常系: 新規DMチャンネルを作成できる', async () => {
      // 1. テストデータ作成
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

      // 2. APIリクエスト実行
      const request = new NextRequest(
        `http://localhost:3000/api/dm/user2-auth?myUserId=user1-auth`
      );
      const params = Promise.resolve({ partnerId: 'user2-auth' });
      const response = await GET(request, { params });

      // 3. レスポンス検証
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.dmChannel).toBeDefined();
      expect(data.dmChannel.type).toBe('dm');
      expect(data.dmChannel.partner.name).toBe('ユーザー2');
      expect(data.dmChannel.partner.email).toBe('user2@example.com');
      expect(data.created).toBe(true); // 新規作成フラグ
    });

    test('正常系: 既存のDMチャンネルを返す', async () => {
      // 1. テストデータ作成
      const user1 = await createTestUser({
        authId: 'existing-user1',
        name: '既存ユーザー1',
      });

      const user2 = await createTestUser({
        authId: 'existing-user2',
        name: '既存ユーザー2',
      });

      // 既存DMチャンネル作成
      const existingDM = await createTestDMChannel(user1.id, user2.id);

      // 2. APIリクエスト実行
      const request = new NextRequest(
        `http://localhost:3000/api/dm/existing-user2?myUserId=existing-user1`
      );
      const params = Promise.resolve({ partnerId: 'existing-user2' });
      const response = await GET(request, { params });

      // 3. レスポンス検証
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.dmChannel.id).toBe(existingDM.id);
      expect(data.dmChannel.partner.name).toBe('既存ユーザー2');
      expect(data.created).toBeUndefined(); // 既存チャンネルなので created フラグなし
    });

    test(
      '正常系: DMチャンネルが存在しない場合は同じ相手に対して常に同じチャンネルIDを返す',
      async () => {
        await createTestUser({
          authId: 'same-user1',
          name: 'テストユーザー1',
        });

        await createTestUser({
          authId: 'same-user2',
          name: 'テストユーザー2',
        });

        // 1回目のリクエスト
        const request1 = new NextRequest(
          `http://localhost:3000/api/dm/same-user2?myUserId=same-user1`
        );
        const params1 = Promise.resolve({ partnerId: 'same-user2' });
        const response1 = await GET(request1, { params: params1 });
        const data1 = await response1.json();

        // 2回目のリクエスト
        const request2 = new NextRequest(
          `http://localhost:3000/api/dm/same-user2?myUserId=same-user1`
        );
        const params2 = Promise.resolve({ partnerId: 'same-user2' });
        const response2 = await GET(request2, { params: params2 });
        const data2 = await response2.json();

        // 同じチャンネルIDが返されることを確認
        expect(data1.dmChannel.id).toBe(data2.dmChannel.id);
      },
      15000
    );

    test('正常系: 退出済みユーザーが再度DMを開くと、既存チャンネルに再参加できる', async () => {
      // 1. テストデータ作成
      const user1 = await createTestUser({
        authId: 'rejoin-user1',
        name: '再参加ユーザー1',
      });

      const user2 = await createTestUser({
        authId: 'rejoin-user2',
        name: '再参加ユーザー2',
      });

      // DMチャンネル作成
      const dmChannel = await createTestDMChannel(user1.id, user2.id);

      // 2. ユーザー1がチャンネルから退出
      await prisma.channelMember.deleteMany({
        where: {
          userId: user1.id,
          channelId: dmChannel.id,
        },
      });

      // 3. ユーザー1が再度DMを開く
      const request = new NextRequest(
        `http://localhost:3000/api/dm/rejoin-user2?myUserId=rejoin-user1`
      );
      const params = Promise.resolve({ partnerId: 'rejoin-user2' });
      const response = await GET(request, { params });

      const data = await response.json();

      // 4. 既存のチャンネルが返され、再参加されることを確認
      expect(data.success).toBe(true);
      expect(data.dmChannel.id).toBe(dmChannel.id);

      // データベースで確認
      const membership = await prisma.channelMember.findFirst({
        where: {
          userId: user1.id,
          channelId: dmChannel.id,
        },
      });

      expect(membership).toBeDefined();
    });

    test('異常系: myUserIdが指定されていない場合、400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/dm/some-partner');
      const params = Promise.resolve({ partnerId: 'some-partner' });
      const response = await GET(request, { params });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('現在のユーザーIDが必要です');
    });

    test('異常系: 存在しないユーザーIDの場合、404エラーを返す', async () => {
      await createTestUser({
        authId: 'valid-user',
        name: '有効なユーザー',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/dm/non-existent-user?myUserId=valid-user'
      );
      const params = Promise.resolve({ partnerId: 'non-existent-user' });
      const response = await GET(request, { params });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('DM相手が見つかりません');
    });

    test('異常系: myUserIdが存在しない場合、404エラーを返す', async () => {
      await createTestUser({
        authId: 'partner-user',
        name: 'パートナーユーザー',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/dm/partner-user?myUserId=non-existent-user'
      );
      const params = Promise.resolve({ partnerId: 'partner-user' });
      const response = await GET(request, { params });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('自分のユーザー情報が見つかりません');
    });

    test(
      '正常系: 相手が複数のDMチャンネルを持っていても、正しいDMを返す',
      async () => {
        // 1. 3人のユーザーを作成
        const user1 = await createTestUser({
          authId: 'multi-dm-user1',
          name: 'マルチDMユーザー1',
        });

        const user2 = await createTestUser({
          authId: 'multi-dm-user2',
          name: 'マルチDMユーザー2',
        });

        const user3 = await createTestUser({
          authId: 'multi-dm-user3',
          name: 'マルチDMユーザー3',
        });

        // 2. ユーザー2は ユーザー1 と ユーザー3 の両方とDMを持つ
        const dm12 = await createTestDMChannel(user1.id, user2.id);
        await createTestDMChannel(user2.id, user3.id);

        // 3. ユーザー1 が ユーザー2 とのDMを開く
        const request = new NextRequest(
          'http://localhost:3000/api/dm/multi-dm-user2?myUserId=multi-dm-user1'
        );
        const params = Promise.resolve({ partnerId: 'multi-dm-user2' });
        const response = await GET(request, { params });

        const data = await response.json();

        // 4. 正しいDMチャンネルが返されることを確認
        expect(data.success).toBe(true);
        expect(data.dmChannel.id).toBe(dm12.id);
        expect(data.dmChannel.partner.name).toBe('マルチDMユーザー2');
      },
      15000
    );
  });

  /**
   * エンドツーエンドシナリオテスト
   */
  describe('エンドツーエンドシナリオ', () => {
    test(
      'シナリオ: 2人のユーザーが相互にDMを開くと、同じチャンネルIDが返される',
      async () => {
        await createTestUser({
          authId: 'mutual-user1',
          name: '相互ユーザー1',
        });

        await createTestUser({
          authId: 'mutual-user2',
          name: '相互ユーザー2',
        });

        // 1. ユーザー1 → ユーザー2 のDMを開く
        const request1 = new NextRequest(
          'http://localhost:3000/api/dm/mutual-user2?myUserId=mutual-user1'
        );
        const params1 = Promise.resolve({ partnerId: 'mutual-user2' });
        const response1 = await GET(request1, { params: params1 });
        const data1 = await response1.json();

        // 2. ユーザー2 → ユーザー1 のDMを開く
        const request2 = new NextRequest(
          'http://localhost:3000/api/dm/mutual-user1?myUserId=mutual-user2'
        );
        const params2 = Promise.resolve({ partnerId: 'mutual-user1' });
        const response2 = await GET(request2, { params: params2 });
        const data2 = await response2.json();

        // 3. 同じチャンネルIDが返されることを確認
        expect(data1.dmChannel.id).toBe(data2.dmChannel.id);

        // 4. データベースで確認（メンバーが2人いることを確認）
        const members = await prisma.channelMember.findMany({
          where: {
            channelId: data1.dmChannel.id,
          },
        });

        expect(members).toHaveLength(2);
      },
      15000
    );

    test(
      'シナリオ: ユーザー退出 → 再参加 → メッセージ履歴が残っている',
      async () => {
        const user1 = await createTestUser({
          authId: 'history-user1',
          name: '履歴ユーザー1',
        });

        const user2 = await createTestUser({
          authId: 'history-user2',
          name: '履歴ユーザー2',
        });

        // 1. DMチャンネル作成
        const dmChannel = await createTestDMChannel(user1.id, user2.id);

        // 2. メッセージを送信
        await prisma.message.create({
          data: {
            content: '退出前のメッセージ',
            senderId: user1.id,
            channelId: dmChannel.id,
          },
        });

        // 3. ユーザー1が退出
        await prisma.channelMember.deleteMany({
          where: {
            userId: user1.id,
            channelId: dmChannel.id,
          },
        });

        // 4. ユーザー1が再度DMを開く
        const request = new NextRequest(
          'http://localhost:3000/api/dm/history-user2?myUserId=history-user1'
        );
        const params = Promise.resolve({ partnerId: 'history-user2' });
        const response = await GET(request, { params });
        const data = await response.json();

        expect(data.dmChannel.id).toBe(dmChannel.id);

        // 5. メッセージ履歴が残っていることを確認
        const messages = await prisma.message.findMany({
          where: {
            channelId: dmChannel.id,
          },
        });

        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe('退出前のメッセージ');
      },
      15000
    );
  });
});
