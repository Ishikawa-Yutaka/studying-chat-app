/**
 * 統合テスト用セットアップファイル
 *
 * 目的: 統合テストの実行前後でデータベースを適切に管理する
 *
 * このファイルは統合テストの各テストファイルでインポートして使用します。
 * 以下の機能を提供します:
 * - テスト前にデータベースをクリア
 * - テスト後にデータベースをクリア
 * - テスト用のユーザー・チャンネル作成
 */

import { prisma } from '@/lib/prisma';

/**
 * データベースを完全にクリアする関数
 *
 * なぜこれが必要？
 * - 各テストが独立して実行されるようにするため
 * - 前のテストのデータが残っていると、テスト結果が不安定になる
 *
 * 削除順序が重要：
 * 1. Message (他のテーブルへの外部キーを持つ)
 * 2. ChannelMember (UserとChannelへの外部キーを持つ)
 * 3. Channel (他のテーブルから参照される)
 * 4. User (他のテーブルから参照される)
 * 5. AiChat (独立したテーブル)
 *
 * 環境変数による制御:
 * - SKIP_DB_CLEANUP=true を設定すると、データベースをクリアしない
 */
export async function clearDatabase() {
  // 環境変数でデータベースクリーンアップをスキップ
  if (process.env.SKIP_DB_CLEANUP === 'true') {
    console.log('⏭️  SKIP_DB_CLEANUP=true のため、データベースのクリアをスキップします');
    return;
  }

  console.log('🧹 データベースをクリア中...');

  try {
    // 外部キー制約の順序に従って削除
    await prisma.message.deleteMany({});
    await prisma.channelMember.deleteMany({});
    await prisma.channel.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.aiChat.deleteMany({});

    console.log('✅ データベースのクリア完了');
  } catch (error) {
    console.error('❌ データベースのクリア失敗:', error);
    throw error;
  }
}

/**
 * テスト用のユーザーを作成する関数
 *
 * @param data - ユーザーデータ（オプション）
 * @returns 作成されたユーザー
 *
 * 使用例:
 * ```typescript
 * const user = await createTestUser({
 *   authId: 'test-auth-id',
 *   name: 'テストユーザー',
 *   email: 'test@example.com',
 * });
 * ```
 */
export async function createTestUser(data?: {
  authId?: string;
  name?: string;
  email?: string;
  lastSeen?: Date;
}) {
  return await prisma.user.create({
    data: {
      authId: data?.authId || `test-auth-${Date.now()}-${Math.random()}`,
      name: data?.name || 'テストユーザー',
      email: data?.email || `test-${Date.now()}-${Math.random()}@example.com`,
      lastSeen: data?.lastSeen || new Date(),
    },
  });
}

/**
 * テスト用のチャンネルを作成する関数
 *
 * @param data - チャンネルデータ（オプション）
 * @returns 作成されたチャンネル
 *
 * 使用例:
 * ```typescript
 * const channel = await createTestChannel({
 *   name: 'テストチャンネル',
 *   description: 'これはテスト用のチャンネルです',
 *   type: 'channel',
 * });
 * ```
 */
export async function createTestChannel(data?: {
  name?: string | null;
  description?: string | null;
  type?: string;
}) {
  return await prisma.channel.create({
    data: {
      name: data?.name ?? 'テストチャンネル',
      description: data?.description ?? 'テスト用のチャンネルです',
      type: data?.type || 'channel',
    },
  });
}

/**
 * テスト用のDMチャンネルを作成する関数
 *
 * DMチャンネルの特徴:
 * - type が "dm"
 * - name と description が null
 * - 必ず2人のメンバーを持つ
 *
 * @param userId1 - メンバー1のユーザーID
 * @param userId2 - メンバー2のユーザーID
 * @returns 作成されたDMチャンネル
 */
export async function createTestDMChannel(userId1: string, userId2: string) {
  const channel = await prisma.channel.create({
    data: {
      type: 'dm',
      name: null,
      description: null,
      members: {
        create: [{ userId: userId1 }, { userId: userId2 }],
      },
    },
    include: {
      members: true,
    },
  });

  return channel;
}

/**
 * ユーザーをチャンネルに追加する関数
 *
 * @param userId - ユーザーID
 * @param channelId - チャンネルID
 * @returns 作成されたChannelMemberレコード
 */
export async function addUserToChannel(userId: string, channelId: string) {
  return await prisma.channelMember.create({
    data: {
      userId,
      channelId,
    },
  });
}

/**
 * テスト用のメッセージを作成する関数
 *
 * @param data - メッセージデータ
 * @returns 作成されたメッセージ
 *
 * 使用例:
 * ```typescript
 * const message = await createTestMessage({
 *   content: 'こんにちは',
 *   senderId: user.id,
 *   channelId: channel.id,
 * });
 * ```
 */
export async function createTestMessage(data: {
  content: string;
  senderId: string;
  channelId: string;
  createdAt?: Date;
}) {
  return await prisma.message.create({
    data: {
      content: data.content,
      senderId: data.senderId,
      channelId: data.channelId,
      createdAt: data.createdAt || new Date(),
    },
  });
}

/**
 * 統合テストのグローバルセットアップ
 *
 * 各テストファイルの beforeAll で呼び出します。
 *
 * 使用例:
 * ```typescript
 * import { setupIntegrationTest, teardownIntegrationTest } from './setup';
 *
 * beforeAll(async () => {
 *   await setupIntegrationTest();
 * });
 *
 * afterAll(async () => {
 *   await teardownIntegrationTest();
 * });
 * ```
 */
export async function setupIntegrationTest() {
  console.log('🔧 統合テスト環境をセットアップ中...');
  await clearDatabase();
  console.log('✅ 統合テスト環境のセットアップ完了');
}

/**
 * 統合テストのグローバルクリーンアップ
 *
 * 各テストファイルの afterAll で呼び出します。
 *
 * 環境変数による制御:
 * - SKIP_DB_CLEANUP=true を設定すると、データベースをクリアしない
 * - 設定しない場合は、通常通りデータベースをクリアする
 *
 * 使用例:
 * ```bash
 * # データを保持してテスト実行
 * SKIP_DB_CLEANUP=true npm test
 *
 * # 通常のテスト実行（データをクリア）
 * npm test
 * ```
 */
export async function teardownIntegrationTest() {
  console.log('🧹 統合テスト環境をクリーンアップ中...');

  // 環境変数でデータベースクリーンアップをスキップできる
  if (process.env.SKIP_DB_CLEANUP === 'true') {
    console.log('⏭️  SKIP_DB_CLEANUP=true のため、データベースのクリアをスキップします');
  } else {
    await clearDatabase();
  }

  await prisma.$disconnect();
  console.log('✅ 統合テスト環境のクリーンアップ完了');
}
