# 統合テストとは？（初心者向け説明）

## 今までやってきたこと（ユニットテスト）

**ユニットテスト = 1つの部品だけをテスト**

```typescript
// 例: usePresence フックだけをテスト
test('オンラインユーザー一覧を取得できる', () => {
  const { result } = renderHook(() => usePresence());
  expect(result.current.onlineUsers).toEqual([...]);
});
```

- Supabase は**モック（偽物）**
- データベースは**モック（偽物）**
- **実際のデータベースには接続しない**

---

## これからやること（統合テスト）

**統合テスト = 複数の部品を組み合わせてテスト**

```typescript
// 例: API + データベースを組み合わせてテスト
test('メッセージを送信すると、データベースに保存される', async () => {
  // 1. API を呼ぶ
  const response = await fetch('/api/messages/channel-1', {
    method: 'POST',
    body: JSON.stringify({ content: 'Hello' }),
  });

  // 2. 実際のデータベースを確認
  const message = await prisma.message.findFirst({
    where: { content: 'Hello' },
  });

  // 3. 保存されているか確認
  expect(message).toBeDefined();
  expect(message.content).toBe('Hello');
});
```

- **実際のデータベースに接続する**
- API → Prisma → データベースの流れ全体をテスト
- より実際の動作に近い

---

## ユニットテスト vs 統合テスト

### 比較表

| 項目 | ユニットテスト（単体テスト） | 統合テスト |
|------|------------------------|-----------|
| **テスト対象** | 1つの部品だけ | 複数の部品の組み合わせ |
| **データベース** | モック（偽物） | 実際のデータベース |
| **実行速度** | 非常に高速（数秒で100テスト） | やや遅い（数十秒〜数分） |
| **目的** | 部品が正しく動くか | 部品間の連携が正しいか |
| **実際の動作との近さ** | 低い | 高い |

---

### 🏗️ 家を建てる例で説明

#### ユニットテスト（今までやってきたこと）

```
木材1本が丈夫か確認
ネジ1本がちゃんと締まるか確認
ドア1枚が開閉するか確認
```

**特徴**:
- 部品1つ1つをチェック
- 高速（数秒で100個以上テスト可能）
- 問題の箇所をすぐ特定できる

#### 統合テスト（これからやること）

```
壁とドアを組み合わせて、ドアが壁に正しく取り付けられるか確認
屋根と壁を組み合わせて、雨漏りしないか確認
電気配線と照明を組み合わせて、電気がつくか確認
```

**特徴**:
- 部品同士の連携をチェック
- 少し遅い（データベース操作が入るため）
- 実際の動作に近い

---

## 具体例：メッセージ送信機能

### ユニットテスト（今までのやり方）

```typescript
// API だけをテスト（データベースはモック）
test('POST /api/messages - 正しいパラメータでPrismaを呼ぶ', async () => {
  mockPrisma.message.create.mockResolvedValue(mockMessage); // 偽物

  const response = await POST(request);

  expect(mockPrisma.message.create).toHaveBeenCalledWith({
    data: { content: 'Hello', senderId: 'user-1', channelId: 'ch-1' }
  });
});
```

**確認できること**:
- Prismaが正しく呼ばれたか ✅

**確認できないこと**:
- 本当にデータベースに保存されるか ❌
- リレーション（関連）が正しく動くか ❌
- データベースエラーが正しく処理されるか ❌

---

### 統合テスト（これからのやり方）

```typescript
// API + 実際のデータベースをテスト
test('メッセージを送信すると、データベースに保存される', async () => {
  // 1. APIを呼ぶ
  const response = await fetch('/api/messages/channel-1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Hello',
      senderId: 'user-1'
    }),
  });

  expect(response.status).toBe(200);

  // 2. データベースを確認（実際のデータベース！）
  const savedMessage = await prisma.message.findFirst({
    where: { content: 'Hello' },
  });

  // 3. ちゃんと保存されている
  expect(savedMessage).toBeDefined();
  expect(savedMessage.content).toBe('Hello');
  expect(savedMessage.senderId).toBe('user-1');
});
```

**確認できること**:
- 本当にデータベースに保存されるか ✅
- API → Prisma → データベースの流れ全体が正しいか ✅
- リレーション（関連）が正しく動くか ✅

**メリット**:
- 実際の動作に近い
- 本番環境で起きる問題を事前に発見できる

---

## どんなテストをするの？

### 1. API エンドポイントのテスト

あなたのアプリの主要なAPIをテストします：

#### メッセージ送信

```typescript
test('メッセージを送信できる', async () => {
  // 準備: テスト用のチャンネルとユーザーを作成
  const user = await prisma.user.create({
    data: {
      id: 'user-1',
      authId: 'auth-1',
      name: 'Test User',
      email: 'test@example.com'
    }
  });

  const channel = await prisma.channel.create({
    data: {
      id: 'channel-1',
      name: 'test-channel',
      type: 'channel'
    }
  });

  // 実行: メッセージ送信API
  const response = await fetch('/api/messages/channel-1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Hello, World!',
      senderId: 'user-1'
    })
  });

  expect(response.status).toBe(200);

  // 検証: データベースに保存されているか確認
  const message = await prisma.message.findFirst({
    where: { content: 'Hello, World!' }
  });

  expect(message).toBeDefined();
  expect(message.content).toBe('Hello, World!');
  expect(message.senderId).toBe('user-1');
  expect(message.channelId).toBe('channel-1');
});
```

---

#### チャンネル参加

```typescript
test('チャンネルに参加できる', async () => {
  // 準備
  const user = await prisma.user.create({
    data: { id: 'user-1', authId: 'auth-1', name: 'Test', email: 'test@example.com' }
  });

  const channel = await prisma.channel.create({
    data: { id: 'channel-1', name: 'general', type: 'channel' }
  });

  // 実行: チャンネル参加API
  const response = await fetch('/api/channels/channel-1/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'user-1' })
  });

  expect(response.status).toBe(200);

  // 検証: メンバーシップが作成されているか確認
  const membership = await prisma.channelMember.findFirst({
    where: {
      userId: 'user-1',
      channelId: 'channel-1'
    }
  });

  expect(membership).toBeDefined();
  expect(membership.userId).toBe('user-1');
  expect(membership.channelId).toBe('channel-1');
});
```

---

### 2. データベースとの連携テスト

#### リレーション（関連）が正しく動くか

```typescript
test('メッセージを取得すると、送信者情報も一緒に取得できる', async () => {
  // 準備: ユーザーとメッセージを作成
  const user = await prisma.user.create({
    data: { id: 'user-1', authId: 'auth-1', name: 'Alice', email: 'alice@example.com' }
  });

  const channel = await prisma.channel.create({
    data: { id: 'channel-1', name: 'general', type: 'channel' }
  });

  await prisma.message.create({
    data: {
      content: 'Hello!',
      senderId: 'user-1',
      channelId: 'channel-1'
    }
  });

  // 実行: メッセージ取得API
  const response = await fetch('/api/messages/channel-1');
  const data = await response.json();

  // 検証: メッセージに送信者の名前が含まれているか
  expect(data.messages).toBeDefined();
  expect(data.messages[0].sender).toBeDefined();
  expect(data.messages[0].sender.name).toBe('Alice');
  expect(data.messages[0].content).toBe('Hello!');
});
```

---

#### Cascade削除が正しく動くか

```typescript
test('チャンネルを削除すると、関連するメッセージも削除される', async () => {
  // 準備
  const channel = await prisma.channel.create({
    data: { id: 'channel-1', name: 'temp', type: 'channel' }
  });

  const user = await prisma.user.create({
    data: { id: 'user-1', authId: 'auth-1', name: 'Test', email: 'test@example.com' }
  });

  await prisma.message.create({
    data: { content: 'Test message', senderId: 'user-1', channelId: 'channel-1' }
  });

  // 実行: チャンネル削除
  await prisma.channel.delete({
    where: { id: 'channel-1' }
  });

  // 検証: メッセージも削除されているか
  const messages = await prisma.message.findMany({
    where: { channelId: 'channel-1' }
  });

  expect(messages.length).toBe(0); // Cascade削除が動いた
});
```

---

## テストの準備

### テスト用データベースを使う

**重要**: 本番のデータベースは使いません！

```
本番データベース（触らない）
  ↓
テスト用データベース（こっちを使う）
  - テスト前: クリーンな状態
  - テスト実行: データを追加・変更
  - テスト後: 全部削除してクリーンに戻す
```

---

### 環境変数の設定

テスト用のデータベースURLを設定します。

#### `.env.test` ファイル

```bash
# テスト用データベース（本番とは別）
DATABASE_URL="postgresql://postgres:password@localhost:5432/chat_app_test"
DIRECT_URL="postgresql://postgres:password@localhost:5432/chat_app_test"

# Supabaseもテスト用
NEXT_PUBLIC_SUPABASE_URL="https://test.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="test-anon-key"
```

---

### セットアップ例

```typescript
import { prisma } from '@/lib/prisma';

describe('メッセージ送信 統合テスト', () => {
  beforeEach(async () => {
    // テスト前: データベースをクリーンにする
    await prisma.message.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.user.deleteMany();

    console.log('データベースをクリーンにしました');
  });

  afterEach(async () => {
    // テスト後: データベースをクリーンにする
    await prisma.message.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.user.deleteMany();

    console.log('テストデータを削除しました');
  });

  afterAll(async () => {
    // 全テスト終了後: Prisma接続を閉じる
    await prisma.$disconnect();
  });

  test('メッセージを送信できる', async () => {
    // テストコード
  });
});
```

---

### データのクリーンアップ順序（重要）

Prismaのリレーションを考慮して、**依存関係の逆順**で削除します。

```typescript
// ❌ 間違った順序（エラーになる）
await prisma.user.deleteMany();      // ← 先にユーザーを削除
await prisma.message.deleteMany();   // ← メッセージが残っているのでエラー

// ✅ 正しい順序
await prisma.message.deleteMany();       // 1. まずメッセージ（依存先）
await prisma.channelMember.deleteMany(); // 2. チャンネルメンバー
await prisma.channel.deleteMany();       // 3. チャンネル
await prisma.user.deleteMany();          // 4. 最後にユーザー（依存元）
```

---

## メリット・デメリット

### ✅ メリット

1. **実際の動作を確認できる**
   - 本当にデータベースに保存されるか
   - リレーションが正しく動くか
   - SQLクエリが正しく実行されるか

2. **部品間の連携をチェックできる**
   - API → Prisma → データベースの流れ
   - 認証 → API → データベースの流れ
   - Cascade削除などのデータベース機能

3. **本番に近い環境でテスト**
   - モックではなく実際のデータベース
   - 本番環境で起きる問題を事前に発見

4. **リグレッション（機能の劣化）を防げる**
   - コードを変更した時、既存機能が壊れていないか確認

---

### ❌ デメリット

1. **遅い**
   - データベース操作が入るので時間がかかる
   - ユニットテスト: 100テスト = 数秒
   - 統合テスト: 100テスト = 数十秒〜数分

2. **セットアップが複雑**
   - テスト用データベースの準備
   - データのクリーンアップ
   - 環境変数の設定

3. **失敗原因の特定が難しい**
   - API、Prisma、データベースのどこで失敗したか分かりにくい
   - ユニットテストなら1つの関数だけなので原因を特定しやすい

4. **並列実行が難しい**
   - 同じデータベースを使うので、テスト同士が干渉する可能性

---

## テストの順番（復習）

```
1. ユニットテスト（単体テスト）← 今ここまで終わった ✅
   ↓ カバレッジ: 60.38%
   ↓ 目的: 部品1つ1つが正しく動くか

2. 統合テスト ← これからやる
   ↓ 目的: API + データベースの連携確認
   ↓ 確認: 実際にデータが保存されるか、リレーションが動くか

3. E2Eテスト（End-to-End Test）
   ↓ 目的: ユーザー操作の全体確認
   ↓ 確認: ブラウザで実際に操作できるか
```

---

## よくある質問

### Q1. ユニットテストだけじゃダメなの？

**A.** ユニットテストだけでは不十分です。

**理由**:
- ユニットテストはモック（偽物）を使うので、実際のデータベースで動くか分からない
- 部品間の連携（API → Prisma → DB）が正しいか確認できない
- リレーション、Cascade削除などのデータベース機能が動くか分からない

**例**:
```typescript
// ユニットテストでは成功するけど、実際には失敗するケース
mockPrisma.message.create.mockResolvedValue(mockMessage); // モックは成功

// でも実際のデータベースでは...
await prisma.message.create({
  data: {
    content: 'Hello',
    senderId: 'invalid-user-id', // 存在しないユーザー
    channelId: 'channel-1'
  }
}); // ← 外部キー制約エラー！
```

---

### Q2. 統合テストだけじゃダメなの？

**A.** 統合テストだけでも不十分です。

**理由**:
- 遅いので、全ての機能を統合テストでカバーするのは現実的でない
- 失敗した時、どの部品が原因か特定しにくい

**理想のバランス**:
```
ユニットテスト: 70%（高速、詳細なテスト）
統合テスト: 20%（重要なAPIの連携確認）
E2Eテスト: 10%（ユーザー操作の確認）
```

---

### Q3. どのAPIから統合テストを書けばいい？

**A.** 重要度の高いAPIから順番に書きましょう。

**優先順位**:
1. **メッセージ送信・取得**（アプリの中心機能）
2. **チャンネル参加・脱退**（よく使う機能）
3. **ダッシュボード取得**（複雑なクエリ）
4. **DM送信・取得**（メッセージと似ているが別）
5. **ユーザー削除**（Cascade削除の確認）

---

## 次にやること

### オプション1: 統合テストを始める（推奨）

**テストする内容**:
1. メッセージ送信API（POST /api/messages/[channelId]）
2. メッセージ取得API（GET /api/messages/[channelId]）
3. チャンネル参加API（POST /api/channels/[channelId]/join）
4. チャンネル脱退API（POST /api/channels/[channelId]/leave）
5. ダッシュボードAPI（GET /api/dashboard）

**手順**:
1. テスト用データベースのセットアップ
2. 環境変数の設定（`.env.test`）
3. テストファイルの作成（`src/__tests__/integration/`）
4. 1つ目のテスト実装（メッセージ送信）

---

### オプション2: まだユニットテストを続ける

カバレッジが低い部分：
- src/components: 68.97%
- src/lib/prisma.ts: 0%
- src/lib/openai.ts: 0%

カバレッジを70%以上にしてから統合テストに進むのもアリです。

---

## まとめ

### ユニットテスト（今までやってきたこと）

- **目的**: 部品1つ1つが正しく動くか
- **特徴**: 高速、モック使用、問題箇所の特定が簡単
- **達成**: カバレッジ60.38%

### 統合テスト（これからやること）

- **目的**: 部品間の連携が正しく動くか
- **特徴**: 実際のデータベース使用、本番に近い
- **テスト対象**: API + Prisma + データベース

### 両方必要な理由

```
ユニットテスト → 部品が正しく動くことを保証
統合テスト     → 部品を組み合わせた時も動くことを保証
E2Eテスト      → ユーザーが実際に使える形で動くことを保証
```

3つ全てがあって初めて、**品質の高いアプリケーション**になります。

---

統合テストについて理解できましたか？

次は統合テストの実装に進みましょう！

---

## 実装完了！実際のコード例

### 実装したテストファイル

- `src/__tests__/integration/messages.test.ts` - メッセージAPI (12テスト)
- `src/__tests__/integration/channels.test.ts` - チャンネルAPI (13テスト)
- `src/__tests__/integration/dm.test.ts` - DM API (10テスト)

**合計**: 35テスト、すべて成功 ✅

---

### 例1: メッセージ送信の統合テスト

**ファイル**: `src/__tests__/integration/messages.test.ts:281-335`

```typescript
test('正常系: メッセージを送信できる', async () => {
  // 1. テストデータ作成（実際のデータベースに保存）
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

  // 2. 認証モック設定（Supabase認証だけモック）
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

  // 3. 実際のAPIルート関数を呼び出す
  const requestBody = {
    content: 'こんにちは、これはテストメッセージです',
    senderId: user.authId,
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
});
```

**このテストのポイント**:
1. 実際のデータベースにユーザー・チャンネルを作成
2. Supabase認証だけモック（データベースは実物）
3. 実際のAPIルート関数 (`POST`) を呼び出す
4. レスポンスとデータベースの両方を検証

---

### 例2: エンドツーエンドシナリオテスト

**ファイル**: `src/__tests__/integration/messages.test.ts:489-538`

```typescript
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

  // 4. メッセージ取得（送信したメッセージがすぐ取得できるか確認）
  const getRequest = new NextRequest(`http://localhost:3000/api/messages/${channel.id}`);
  const getParams = Promise.resolve({ channelId: channel.id });
  const getResponse = await GET(getRequest, { params: getParams });

  expect(getResponse.status).toBe(200);

  const data = await getResponse.json();
  expect(data.messages).toHaveLength(1);
  expect(data.messages[0].content).toBe('シナリオテストメッセージ');
  expect(data.messages[0].sender.name).toBe('シナリオユーザー');
});
```

**このテストの特徴**:
- **送信 → 取得** の一連の流れをテスト
- 実際のユーザー操作に近いシナリオ
- データベースに実際に保存されているかを確認

---

### 例3: チャンネル作成の統合テスト

**ファイル**: `src/__tests__/integration/channels.test.ts:224-264`

```typescript
test('正常系: 新しいチャンネルを作成できる', async () => {
  // 1. テストユーザー作成
  const user = await createTestUser({
    authId: 'creator-auth',
    name: 'チャンネル作成者',
    email: 'creator@example.com',
  });

  // 2. 認証モック
  mockGetCurrentUser.mockResolvedValue({
    user: user,
    error: null,
    status: 200,
  });

  // 3. チャンネル作成APIを呼び出す
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
```

---

### テストの実行方法

```bash
# すべての統合テストを実行
npm run test:integration

# 特定のファイルだけ実行
npm test -- src/__tests__/integration/messages.test.ts
```

**実行結果**:
```
PASS src/__tests__/integration/messages.test.ts (54.8 s)
PASS src/__tests__/integration/channels.test.ts (60.9 s)
PASS src/__tests__/integration/dm.test.ts (62.5 s)

Test Suites: 3 passed, 3 total
Tests:       35 passed, 35 total
Time:        180.53 s
```

---

### セットアップファイル

**ファイル**: `src/__tests__/integration/setup.ts`

テストで使うヘルパー関数:
```typescript
// データベースをクリア
await clearDatabase();

// テストユーザー作成
const user = await createTestUser({
  authId: 'test-auth',
  name: 'テストユーザー',
  email: 'test@example.com',
});

// テストチャンネル作成
const channel = await createTestChannel({
  name: 'テストチャンネル',
  type: 'channel',
});

// ユーザーをチャンネルに追加
await addUserToChannel(user.id, channel.id);

// DMチャンネル作成
const dmChannel = await createTestDMChannel(user1.id, user2.id);

// テストメッセージ作成
const message = await createTestMessage({
  content: 'テストメッセージ',
  senderId: user.id,
  channelId: channel.id,
});
```

---

これで統合テストの実装も完了しました！ 🎉

**学んだこと**:
- ユニットテストと統合テストの違い
- 実際のデータベースを使ったテスト方法
- APIとデータベースの連携テスト
- エンドツーエンドシナリオテスト

**成果**:
- ユニットテスト: 800+テスト（カバレッジ 60.38%）
- 統合テスト: 35テスト（すべて成功）
