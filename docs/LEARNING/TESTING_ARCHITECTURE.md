# テスト構成ガイド（初心者向け）

このドキュメントでは、プロジェクトのテスト構成・アーキテクチャを説明します。

## 目次

- [テストディレクトリ構造](#テストディレクトリ構造)
- [テストファイル命名規則](#テストファイル命名規則)
- [ユニットテストの構成](#ユニットテストの構成)
- [統合テストの構成](#統合テストの構成)
- [モック戦略](#モック戦略)
- [テストライフサイクル](#テストライフサイクル)
- [テストの書き方パターン](#テストの書き方パターン)

---

## テストディレクトリ構造

```
src/__tests__/
├── unit/                      # ユニットテスト（データベースを使わない）
│   ├── api/                   # API関連のユニットテスト
│   │   └── messages.test.ts   # メッセージAPI（モック使用）
│   ├── components/            # Reactコンポーネントのテスト
│   │   ├── LoginForm.test.tsx
│   │   ├── MessageForm.test.tsx
│   │   └── ...
│   └── hooks/                 # カスタムフックのテスト
│       ├── useAuth.test.ts
│       ├── useMessages.test.ts
│       └── ...
│
└── integration/               # 統合テスト（実際のデータベース使用）
    ├── setup.ts               # テスト用ヘルパー関数
    ├── messages.test.ts       # メッセージAPI統合テスト（12テスト）
    ├── channels.test.ts       # チャンネルAPI統合テスト（13テスト）
    └── dm.test.ts             # DM API統合テスト（10テスト）
```

**ポイント**:
- **unit/**: 高速、モック使用、個別機能テスト
- **integration/**: やや遅い、実際のDB使用、複数機能の連携テスト

---

## テストファイル命名規則

### 基本ルール

```
テスト対象ファイル名.test.ts(x)
```

**例**:
- `src/hooks/useAuth.ts` → `src/__tests__/unit/hooks/useAuth.test.ts`
- `src/components/LoginForm.tsx` → `src/__tests__/unit/components/LoginForm.test.tsx`
- `src/app/api/messages/[channelId]/route.ts` → `src/__tests__/integration/messages.test.ts`

**拡張子の使い分け**:
- `.test.ts`: TypeScriptファイル（ロジック、API、フック）
- `.test.tsx`: Reactコンポーネント（JSXを含む）

---

## ユニットテストの構成

### 目的

**個別の関数・コンポーネント・フックが正しく動作するかテスト**

### 特徴

- データベースは使わない（全てモック）
- 高速実行（30秒〜1分）
- 外部依存を排除

### 構成パターン

```typescript
/**
 * テスト対象: useAuth カスタムフック
 *
 * このファイルでは、認証関連のフックが正しく動作するかテストします。
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

// モックの作成
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}));

describe('useAuth（認証フック）', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    test('ログイン成功時、ユーザー情報が取得できる', async () => {
      // テストコード
    });
  });

  describe('異常系', () => {
    test('ログインエラー時、エラーメッセージが表示される', async () => {
      // テストコード
    });
  });
});
```

**構成のポイント**:
1. **describe（大分類）**: テスト対象の名前
2. **describe（中分類）**: 正常系・異常系で分ける
3. **test**: 個別のテストケース

---

## 統合テストの構成

### 目的

**複数の機能が連携して正しく動作するかテスト**

### 特徴

- 実際のデータベース使用
- やや遅い実行（3分程度）
- リアルな動作確認

### 構成パターン

```typescript
/**
 * DM API統合テスト
 *
 * テスト対象: src/app/api/dm/[partnerId]/route.ts
 *
 * このテストでは、DMチャンネルの取得・作成機能を実際のデータベースと連携してテストします。
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
  // 全テスト開始前に1回だけ実行
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  // 全テスト終了後に1回だけ実行
  afterAll(async () => {
    await teardownIntegrationTest();
  });

  // 各テスト前に実行
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 各テスト後に実行
  afterEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/dm/[partnerId]（DMチャンネル取得・作成）', () => {
    test('正常系: 新規DMチャンネルを作成できる', async () => {
      // 1. テストデータ作成（実際のデータベースに保存）
      const user1 = await createTestUser({
        authId: 'user1-auth',
        name: 'ユーザー1',
      });

      const user2 = await createTestUser({
        authId: 'user2-auth',
        name: 'ユーザー2',
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
      expect(data.dmChannel.partner.name).toBe('ユーザー2');
    });
  });
});
```

**構成のポイント**:
1. **beforeAll**: テスト開始前の準備（データベース接続など）
2. **afterAll**: テスト終了後の後処理（データベース切断）
3. **beforeEach**: 各テスト前の準備（モックリセット）
4. **afterEach**: 各テスト後のクリーンアップ（データベースクリア）

---

## モック戦略

### ユニットテスト: 全てモック

**モックするもの**:
- データベース（Prisma）
- Supabase認証
- 外部API
- ファイルシステム

**例**:
```typescript
// Prismaをモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Supabaseをモック
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));
```

---

### 統合テスト: 認証のみモック

**モックするもの**:
- Supabase認証のみ

**モックしないもの（実物を使う）**:
- データベース（PostgreSQL）
- Prisma ORM
- API Route ハンドラー

**理由**:
- 認証は別システム（Supabase Auth Database）なのでモック
- データベースは実際に動かしてリアルな動作確認

**例**:
```typescript
// setup.ts でモック作成
export const mockGetCurrentUser = jest.fn();
export const mockCheckChannelMembership = jest.fn();

jest.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: (userId: string) => mockGetCurrentUser(userId),
  checkChannelMembership: (userId: string, channelId: string) =>
    mockCheckChannelMembership(userId, channelId),
}));

// テスト内で使用
mockGetCurrentUser.mockResolvedValue({
  user: testUser,
  error: null,
  status: 200,
});
```

---

## テストライフサイクル

### フック実行順序

```
beforeAll()               # 全テスト開始前に1回
  ↓
  beforeEach()            # テスト1の前
    ↓
    test('テスト1')
    ↓
  afterEach()             # テスト1の後
  ↓
  beforeEach()            # テスト2の前
    ↓
    test('テスト2')
    ↓
  afterEach()             # テスト2の後
  ↓
afterAll()                # 全テスト終了後に1回
```

### 統合テストの具体例

```typescript
describe('DM API統合テスト', () => {
  beforeAll(async () => {
    // データベース接続確認
    await setupIntegrationTest();
  });

  afterAll(async () => {
    // データベース切断
    await teardownIntegrationTest();
  });

  beforeEach(() => {
    // モックをリセット（前のテストの影響を除去）
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // データベースをクリア（次のテストに影響を与えない）
    await clearDatabase();
  });

  test('テスト1', async () => {
    // 1. テストデータ作成
    // 2. API実行
    // 3. 検証
  });
});
```

**なぜ afterEach でデータベースをクリア？**

各テストは独立していなければなりません。前のテストで作成したデータが残っていると、次のテストに影響を与える可能性があります。

---

## テストの書き方パターン

### ユニットテスト: AAA パターン

```typescript
test('メッセージを送信できる', async () => {
  // Arrange（準備）: モックとテストデータを準備
  const mockCreate = jest.fn().mockResolvedValue({
    id: '1',
    content: 'テスト',
  });

  (prisma.message.create as jest.Mock) = mockCreate;

  // Act（実行）: テスト対象の関数を実行
  const result = await sendMessage('チャンネル1', 'テスト');

  // Assert（検証）: 結果を検証
  expect(result.content).toBe('テスト');
  expect(mockCreate).toHaveBeenCalledTimes(1);
});
```

---

### 統合テスト: Given-When-Then パターン

```typescript
test('正常系: 新規DMチャンネルを作成できる', async () => {
  // Given（前提条件）: テストデータを準備
  const user1 = await createTestUser({
    authId: 'user1',
    name: 'ユーザー1',
  });

  const user2 = await createTestUser({
    authId: 'user2',
    name: 'ユーザー2',
  });

  // When（実行）: APIを呼び出す
  const request = new NextRequest(
    `http://localhost:3000/api/dm/user2?myUserId=user1`
  );
  const params = Promise.resolve({ partnerId: 'user2' });
  const response = await GET(request, { params });

  // Then（検証）: 期待通りの結果か確認
  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.dmChannel.type).toBe('dm');
  expect(data.dmChannel.partner.name).toBe('ユーザー2');
});
```

---

### describe ブロックの使い分け

```typescript
describe('メッセージAPI', () => {  // 大分類: テスト対象
  describe('GET /api/messages/[channelId]', () => {  // 中分類: エンドポイント
    describe('正常系', () => {  // 小分類: シナリオ種別
      test('メッセージ一覧を取得できる', async () => {
        // テストコード
      });

      test('空のチャンネルの場合、空配列が返る', async () => {
        // テストコード
      });
    });

    describe('異常系', () => {
      test('存在しないチャンネルIDの場合、404エラーを返す', async () => {
        // テストコード
      });

      test('認証エラーの場合、401エラーを返す', async () => {
        // テストコード
      });
    });
  });

  describe('POST /api/messages/[channelId]', () => {
    // ...
  });
});
```

**ポイント**:
- describe は3段階まで（大・中・小）
- 正常系・異常系で分ける
- エンドポイントごとに分ける

---

### テスト名の付け方

**Good（良い例）**:
```typescript
test('正常系: メッセージを送信できる', async () => {});
test('異常系: 空文字の場合、バリデーションエラーを返す', async () => {});
test('エンドツーエンド: ユーザーAが送信したメッセージをユーザーBが取得できる', async () => {});
```

**Bad（悪い例）**:
```typescript
test('test1', async () => {});  // 何をテストしているか不明
test('メッセージ', async () => {});  // 抽象的すぎる
test('should send message', async () => {});  // 日本語プロジェクトでは日本語推奨
```

**命名ルール**:
1. **種別を明記**: 正常系・異常系・エンドツーエンド
2. **何をテストするか明記**: 「〜できる」「〜を返す」
3. **条件を明記**: 「〜の場合」

---

## setup.ts ヘルパー関数

統合テストで使用するヘルパー関数は `src/__tests__/integration/setup.ts` に定義されています。

### 主要な関数

#### 1. データベースクリア

```typescript
export async function clearDatabase() {
  // 外部キー制約に従って削除順序を守る
  await prisma.message.deleteMany({});
  await prisma.channelMember.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.aiChat.deleteMany({});
}
```

**なぜ順序が重要？**

外部キー制約があるため、親レコードを削除する前に子レコードを削除する必要があります。

**削除順序**:
```
Message（メッセージ）
  ↓ 参照している
ChannelMember（チャンネルメンバー）
  ↓ 参照している
Channel（チャンネル） & User（ユーザー）
  ↓
AiChat（AI会話履歴）
```

---

#### 2. テストユーザー作成

```typescript
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
```

**使い方**:
```typescript
// デフォルト値で作成
const user = await createTestUser();

// カスタム値で作成
const user = await createTestUser({
  authId: 'custom-auth-id',
  name: 'カスタムユーザー',
  email: 'custom@example.com',
});
```

---

#### 3. テストチャンネル作成

```typescript
export async function createTestChannel(data?: {
  name?: string;
  description?: string;
  type?: string;
}) {
  return await prisma.channel.create({
    data: {
      name: data?.name || 'テストチャンネル',
      description: data?.description || 'テスト用のチャンネルです',
      type: data?.type || 'channel',
    },
  });
}
```

---

#### 4. DMチャンネル作成

```typescript
export async function createTestDMChannel(
  userId1: string,
  userId2: string
) {
  const dmChannel = await prisma.channel.create({
    data: {
      name: null,
      description: null,
      type: 'dm',
    },
  });

  // 2人のユーザーをメンバーとして追加
  await prisma.channelMember.createMany({
    data: [
      { userId: userId1, channelId: dmChannel.id },
      { userId: userId2, channelId: dmChannel.id },
    ],
  });

  return dmChannel;
}
```

**ポイント**:
- DMチャンネルは `name` と `description` が `null`
- 必ず2人のメンバーを追加

---

#### 5. ユーザーをチャンネルに追加

```typescript
export async function addUserToChannel(
  userId: string,
  channelId: string
) {
  return await prisma.channelMember.create({
    data: {
      userId,
      channelId,
    },
  });
}
```

---

#### 6. テストメッセージ作成

```typescript
export async function createTestMessage(
  senderId: string,
  channelId: string,
  content?: string
) {
  return await prisma.message.create({
    data: {
      content: content || 'テストメッセージ',
      senderId,
      channelId,
    },
  });
}
```

---

## タイムアウト設定

### デフォルトタイムアウト

Jest のデフォルトタイムアウトは **5秒（5000ms）** です。

### 統合テストのタイムアウト

データベース操作が多い統合テストでは、タイムアウトを **15秒（15000ms）** に延長しています。

**設定方法**:
```typescript
test(
  'テスト名',
  async () => {
    // テストコード
  },
  15000  // タイムアウト: 15秒
);
```

**どのテストでタイムアウト延長が必要？**
- 複数のデータベース操作を含むテスト
- エンドツーエンドシナリオテスト
- 大量のテストデータを作成するテスト

---

## 並列実行 vs 順次実行

### ユニットテスト: 並列実行（デフォルト）

ユニットテストは独立しているため、並列実行できます。

```bash
npm run test:unit
# → Jest がデフォルトで並列実行
```

**メリット**:
- 高速（30秒程度）

---

### 統合テスト: 順次実行（--runInBand）

統合テストは同じデータベースを使うため、順次実行が必要です。

```bash
npm run test:integration
# → jest src/__tests__/integration --runInBand
```

**なぜ順次実行？**

並列実行すると、複数のテストが同時にデータベースをクリアしようとして競合が発生します。

**エラー例**:
```
FAIL src/__tests__/integration/channels.test.ts
FAIL src/__tests__/integration/messages.test.ts
FAIL src/__tests__/integration/dm.test.ts
```

**解決方法**:
`--runInBand` フラグで順次実行すると、全テスト成功します。

```
PASS src/__tests__/integration/dm.test.ts (62.545 s)
PASS src/__tests__/integration/channels.test.ts (60.918 s)
PASS src/__tests__/integration/messages.test.ts (57.067 s)

Test Suites: 3 passed, 3 total
Tests:       35 passed, 35 total
```

---

## まとめ

### ユニットテスト vs 統合テスト

| 項目 | ユニットテスト | 統合テスト |
|------|--------------|-----------|
| **目的** | 個別機能の動作確認 | 複数機能の連携確認 |
| **データベース** | モック | 実際のDB |
| **実行速度** | 高速（30秒） | やや遅い（3分） |
| **実行モード** | 並列実行 | 順次実行（`--runInBand`） |
| **タイムアウト** | 5秒（デフォルト） | 15秒（一部延長） |
| **テスト数** | 800+ | 35 |

### テストファイルの命名ルール

```
テスト対象ファイル名.test.ts(x)
```

### describe/test の構造

```typescript
describe('大分類: テスト対象', () => {
  describe('中分類: エンドポイント', () => {
    describe('小分類: 正常系/異常系', () => {
      test('テストケース名', async () => {
        // Given（準備）
        // When（実行）
        // Then（検証）
      });
    });
  });
});
```

### setup.ts ヘルパー関数

- `clearDatabase()`: データベースクリア
- `createTestUser()`: テストユーザー作成
- `createTestChannel()`: テストチャンネル作成
- `createTestDMChannel()`: DMチャンネル作成
- `addUserToChannel()`: ユーザーをチャンネルに追加
- `createTestMessage()`: テストメッセージ作成

### 実行コマンド

```bash
# ユニットテスト（高速）
npm run test:unit

# 統合テスト（順次実行）
npm run test:integration

# 全テスト
npm test

# カバレッジ確認
npm run test:coverage
```

---

何か質問があれば、気軽に聞いてください！
