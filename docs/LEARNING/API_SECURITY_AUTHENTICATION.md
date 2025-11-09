# APIセキュリティ：認証トークンベースの実装（初心者向け）

**最終更新**: 2025-10-21
**対象**: CONTEXT_HANDOVER_12での共通関数化とセキュリティ強化

---

## 目次
1. [問題点：何が危険だったのか](#問題点何が危険だったのか)
2. [解決策：共通関数化による統一的なセキュリティ実装](#解決策共通関数化による統一的なセキュリティ実装)
3. [修正したAPIの詳細](#修正したapiの詳細)
4. [なぜ安全になったのか](#なぜ安全になったのか)
5. [認証の仕組み（2段階の流れ）](#認証の仕組み2段階の流れ)
6. [コード削減効果](#コード削減効果)
7. [技術用語の説明](#技術用語の説明)

---

## 問題点：何が危険だったのか

### 修正前の3つの重大な脆弱性

#### 脆弱性1: URLパラメータベースの認証（変更可能）

**変更前の実装**

```typescript
// ❌ 悪い例：クエリパラメーターをそのまま信用
export async function GET(request: NextRequest) {
  const userId = url.searchParams.get('userId');  // URLから取得

  // このuserIdを使ってデータを取得
  const data = await prisma.someData.findMany({
    where: { userId: userId }
  });

  return data;  // 誰でも他人のデータが見れてしまう！
}
```

**何が危険？**

```
悪意のあるユーザーの操作：

1. 自分のID: user456
2. ブラウザの開発者ツール（F12）を開く
3. URLを手動で書き換える:
   /api/dashboard?userId=user789  ← 他人のID

結果：他人のダッシュボードが見れてしまう！
```

#### 脆弱性2: 認証チェックが全くない

**危険だったAPI**
- `/api/threads/[messageId]` - **誰でもスレッドを読み書きできた**（最も深刻）
- `/api/channel/[channelId]` - チャンネル情報が誰でも取得できた

**実際の被害例（もし悪用されたら）**

```
攻撃者の手順：
1. ログインすらせずにアクセス
2. 適当なmessageIdを入力
   /api/threads/msg123
3. 他人のスレッド内容を全て盗み見
4. 勝手に返信を送信

機密情報が完全に漏洩！
```

#### 脆弱性3: チャンネルメンバーシップのチェックがない

```
1. ユーザーAは「開発チャンネル」のメンバーではない
2. でもチャンネルID（channel123）を知っている
3. URLを直接入力:
   /api/messages/channel123

結果：参加していないチャンネルのメッセージが見れてしまう！
```

---

## 解決策：共通関数化による統一的なセキュリティ実装

### 新規作成：`src/lib/auth-server.ts`

**なぜ新しいファイルを作ったのか？**

以前は各APIで認証コードを個別に記述していましたが、以下の問題がありました：
- コードの重複（同じ処理を何度も書く）
- 修正時に全ファイルを変更する必要がある
- 認証漏れのリスク（書き忘れる可能性）

**解決策：共通関数に集約**

```typescript
// src/lib/auth-server.ts

/**
 * 現在ログインしているユーザーを取得
 *
 * 処理の流れ:
 * 1. Supabase認証トークンを検証
 * 2. Prismaデータベースからユーザー情報を取得
 * 3. エラーがあれば適切なステータスコードと共に返す
 *
 * @returns { user, error, status }
 */
export async function getCurrentUser() {
  // ステップ1: 認証トークンの検証
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return {
      user: null,
      error: '認証が必要です',
      status: 401
    };
  }

  // ステップ2: Prismaデータベースからユーザー情報を取得
  const user = await prisma.user.findFirst({
    where: { authId: authUser.id }
  });

  if (!user) {
    return {
      user: null,
      error: 'ユーザーが見つかりません',
      status: 404
    };
  }

  return { user, error: null, status: 200 };
}

/**
 * チャンネルメンバーシップを確認
 *
 * 処理の流れ:
 * 1. データベースでメンバーシップを検索
 * 2. メンバーでなければエラーを返す
 *
 * @param userId - ユーザーID
 * @param channelId - チャンネルID
 * @returns { isMember, error, status }
 */
export async function checkChannelMembership(userId: string, channelId: string) {
  const membership = await prisma.channelMember.findFirst({
    where: {
      userId: userId,
      channelId: channelId
    }
  });

  if (!membership) {
    return {
      isMember: false,
      error: 'このチャンネルにアクセスする権限がありません',
      status: 403
    };
  }

  return { isMember: true, error: null, status: 200 };
}
```

---

## 修正したAPIの詳細

### 1. `/api/dashboard/route.ts` - URLパラメータ削除

**変更前（脆弱）**
```typescript
// ❌ URLパラメータから取得
export async function GET(request: NextRequest) {
  const userId = url.searchParams.get('userId');  // 変更可能
  // ...
}
```

**変更後（安全）**
```typescript
// ✅ 共通関数使用
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const { user, error, status } = await getCurrentUser();
  if (error) return NextResponse.json({ error }, { status });

  // userは認証済み・改ざん不可能
  // ...
}
```

**セキュリティ効果**
- ✅ 他のユーザーのダッシュボードは絶対に見れない
- ✅ URLパラメータを変更しても無駄

---

### 2. `/api/channel/[channelId]/route.ts` - 認証追加

**変更前（脆弱）**
```typescript
// ❌ 認証チェックなし
export async function GET(request: Request, context: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await context.params;

  // 誰でもチャンネル情報が取得できてしまう
  const channel = await prisma.channel.findUnique({
    where: { id: channelId }
  });

  return NextResponse.json(channel);
}
```

**変更後（安全）**
```typescript
// ✅ 認証 + メンバーシップ確認
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server';

export async function GET(request: Request, context: { params: Promise<{ channelId: string }> }) {
  // 認証チェック
  const { user, error, status } = await getCurrentUser();
  if (error) return NextResponse.json({ error }, { status });

  // チャンネルIDを取得
  const { channelId } = await context.params;

  // メンバーシップ確認
  const membershipCheck = await checkChannelMembership(user.id, channelId);
  if (!membershipCheck.isMember) {
    return NextResponse.json(
      { error: membershipCheck.error },
      { status: membershipCheck.status }
    );
  }

  // メンバーのみチャンネル情報を取得可能
  const channel = await prisma.channel.findUnique({
    where: { id: channelId }
  });

  return NextResponse.json(channel);
}
```

**セキュリティ効果**
- ✅ 未参加のチャンネルは絶対に見れない
- ✅ ログインしていないユーザーは弾かれる

---

### 3. `/api/messages/[channelId]/route.ts` - コード簡潔化

**変更前（74行）**
```typescript
// ❌ 認証コードを直接記述（長い）
export async function GET(request: NextRequest, context: { params: Promise<{ channelId: string }> }) {
  // 認証チェック（15行くらい）
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // ユーザー取得（10行くらい）
  const currentUser = await prisma.user.findFirst({
    where: { authId: authUser.id }
  });

  // メンバーシップ確認（15行くらい）
  const membership = await prisma.channelMember.findFirst({
    where: {
      channelId: channelId,
      userId: currentUser.id
    }
  });
  if (!membership) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  // メッセージ取得
  // ...
}
```

**変更後（34行、54%削減）**
```typescript
// ✅ 共通関数使用（短い）
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server';

export async function GET(request: NextRequest, context: { params: Promise<{ channelId: string }> }) {
  // 認証チェック（2行）
  const { user, error, status } = await getCurrentUser();
  if (error) return NextResponse.json({ error }, { status });

  // チャンネルIDを取得
  const { channelId } = await context.params;

  // メンバーシップ確認（4行）
  const membershipCheck = await checkChannelMembership(user.id, channelId);
  if (!membershipCheck.isMember) {
    return NextResponse.json({ error: membershipCheck.error }, { status: membershipCheck.status });
  }

  // メッセージ取得
  // ...
}
```

**改善点**
- ✅ コードが54%短くなった
- ✅ 読みやすくなった
- ✅ セキュリティレベルは同じまま

---

### 4. `/api/threads/[messageId]/route.ts` - **重大な脆弱性を修正**

**これが最も深刻な問題でした！**

**変更前（脆弱）**
```typescript
// ❌ 認証チェックが全くない
export async function GET(request: Request, context: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await context.params;

  // 誰でもスレッドを読める！
  const thread = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      replies: true,
      sender: true
    }
  });

  return NextResponse.json(thread);
}

export async function POST(request: Request, context: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await context.params;
  const body = await request.json();

  // 誰でもスレッドに返信できる！
  const reply = await prisma.message.create({
    data: {
      content: body.content,
      senderId: body.userId,  // ← userIdを信用している（危険）
      parentId: messageId
    }
  });

  return NextResponse.json(reply);
}
```

**何が危険だったか？**

```
攻撃者の行動：

GET /api/threads/msg123
→ ログインなしでスレッド内容を全て読める

POST /api/threads/msg123
body: { content: "悪意のあるメッセージ", userId: "他人のID" }
→ 他人になりすまして返信を送信できる

結果：完全にセキュリティが崩壊していた
```

**変更後（安全）**
```typescript
// ✅ 認証 + メンバーシップ確認を追加
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server';

export async function GET(request: Request, context: { params: Promise<{ messageId: string }> }) {
  // 認証チェック
  const { user, error, status } = await getCurrentUser();
  if (error) return NextResponse.json({ error }, { status });

  const { messageId } = await context.params;

  // 親メッセージを取得
  const parentMessage = await prisma.message.findUnique({
    where: { id: messageId },
    select: { channelId: true }
  });

  if (!parentMessage) {
    return NextResponse.json({ error: 'メッセージが見つかりません' }, { status: 404 });
  }

  // 親メッセージが属するチャンネルのメンバーか確認
  const membershipCheck = await checkChannelMembership(user.id, parentMessage.channelId);
  if (!membershipCheck.isMember) {
    return NextResponse.json({ error: membershipCheck.error }, { status: membershipCheck.status });
  }

  // メンバーのみスレッドを取得可能
  const thread = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      replies: true,
      sender: true
    }
  });

  return NextResponse.json(thread);
}

export async function POST(request: Request, context: { params: Promise<{ messageId: string }> }) {
  // 認証チェック
  const { user, error, status } = await getCurrentUser();
  if (error) return NextResponse.json({ error }, { status });

  const { messageId } = await context.params;
  const body = await request.json();

  // 親メッセージを取得
  const parentMessage = await prisma.message.findUnique({
    where: { id: messageId },
    select: { channelId: true }
  });

  if (!parentMessage) {
    return NextResponse.json({ error: 'メッセージが見つかりません' }, { status: 404 });
  }

  // メンバーシップ確認
  const membershipCheck = await checkChannelMembership(user.id, parentMessage.channelId);
  if (!membershipCheck.isMember) {
    return NextResponse.json({ error: membershipCheck.error }, { status: membershipCheck.status });
  }

  // メンバーのみ返信可能（userIdは認証済みのuser.idを使用）
  const reply = await prisma.message.create({
    data: {
      content: body.content,
      senderId: user.id,  // ✅ 認証済みのIDを使用
      parentId: messageId,
      channelId: parentMessage.channelId
    }
  });

  return NextResponse.json(reply);
}
```

**セキュリティ効果**
- ✅ ログインしていないユーザーは完全に弾かれる
- ✅ チャンネルメンバーのみがスレッドを閲覧・返信可能
- ✅ なりすまし不可能（認証済みのuser.idを使用）

---

### 5. `/api/channels/route.ts` - 共通関数使用

**変更前（44行）**
```typescript
// ❌ 認証コードを直接記述
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  // ... 認証処理が長い
}
```

**変更後（25行、43%削減）**
```typescript
// ✅ 共通関数使用
import { getCurrentUser } from '@/lib/auth-server';

export async function POST(request: Request) {
  const { user, error, status } = await getCurrentUser();
  if (error) return NextResponse.json({ error }, { status });

  // チャンネル作成処理
  // ...
}
```

---

### 6. `/api/avatar/upload/route.ts` - 共通関数使用

**変更前**
```typescript
// ❌ 認証コードを直接記述
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  // ... 認証処理
}
```

**変更後**
```typescript
// ✅ 共通関数使用（Supabase Storageアクセス用にcreateClient()も併用）
import { getCurrentUser } from '@/lib/auth-server';

export async function POST(request: Request) {
  const { user, error, status } = await getCurrentUser();
  if (error) return NextResponse.json({ error }, { status });

  // アバターアップロード処理
  // Supabase StorageへのアップロードにはcreateClient()を使用
  const supabase = await createClient();
  // ...
}
```

---

## なぜ安全になったのか

### 認証トークンとは？

**ログイン時に発行される秘密の鍵**

```
ログインの流れ：

1. ユーザーがGoogleでログイン
   ↓
2. Supabaseが認証トークンを発行
   ↓
3. ブラウザがこのトークンを自動的に保存（Cookie）
   ↓
4. API呼び出し時、自動的にトークンが送られる
   ↓
5. サーバー側でトークンを検証
   → 「このユーザーは本人だ」と確認
```

### 改ざん不可能な理由

**クエリパラメーター（脆弱）**
```
❌ /api/dashboard?userId=user456
   ↑ URLはブラウザで簡単に変更できる
```

**認証トークン（安全）**
```
✅ Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ↑ 暗号化された文字列
   ↑ ブラウザから変更不可能
   ↑ Supabaseが検証して本物か確認
```

### 悪意のあるユーザーが試みても...

```
攻撃者：「他人のデータを見たい！」
↓
試み1: URLを変更
   → 効果なし（もうuserIdパラメーターは使っていない）

試み2: チャンネルIDを直接入力
   → 403エラー（メンバーではないため拒否）

試み3: 認証トークンを偽造
   → 不可能（Supabaseが暗号検証）

試み4: 他人のトークンを盗む
   → 不可能（HTTPSで保護されているため盗めない）

結果：諦めるしかない
```

---

## 認証の仕組み（2段階の流れ）

### データベースの構造

```
[Supabase Auth Database]        [Prisma Database (PostgreSQL)]
認証情報を管理                   アプリデータを管理
━━━━━━━━━━━━━━━━━━━━━━        ━━━━━━━━━━━━━━━━━━━━━━━━━
authId: taro-auth-123           id: prisma-user-456
email: taro@example.com         authId: taro-auth-123  ← ここで紐付け
password: (ハッシュ化)           name: 田中太郎
token: eyJhbG...                email: taro@example.com
                                avatarUrl: https://...
                                ↓
                               メッセージ、チャンネルなど
```

### ステップ1: 認証トークンの検証（ここで一致確認）

```typescript
// ステップ1: 認証トークンから現在のユーザーを取得
const supabase = await createClient();
const { data: { user: authUser }, error } = await supabase.auth.getUser();
```

**ここで何が起きているか：**

```
1. ブラウザから送られてきた認証トークンを取得
   ↓
2. Supabaseが内部で検証
   - 「このトークンは本物か？」
   - 「有効期限は切れていないか？」
   - 「改ざんされていないか？」
   ↓
3. 検証成功 → authUser（ユーザー情報）を返す
   検証失敗 → error（エラー）を返す
```

**つまり、`supabase.auth.getUser()`の時点で既に一致確認済み！**

### ステップ2: データベースから詳細情報を取得

```typescript
// ステップ2: Prismaデータベースからユーザー情報を取得
const currentUser = await prisma.user.findFirst({
  where: { authId: authUser.id }
});
```

**ここで何が起きているか：**

```
1. authUser.id = "abc123"（Supabaseが検証済みのID）
2. Prismaデータベースで「authId = "abc123"のユーザー」を探す
3. 見つかったユーザーの詳細情報を取得
   - id（Prisma内部ID）
   - name（ユーザー名）
   - email（メールアドレス）
   - avatarUrl（アバター画像）
```

**なぜこのステップが必要？**

SupabaseとPrismaは**別々のデータベース**だからです：

| データベース | 役割 | 保存データ |
|------------|------|----------|
| **Supabase Auth** | 認証専用 | authId, パスワード, トークン |
| **Prisma Database** | アプリデータ | ユーザー名, メッセージ, チャンネル |

### 共通関数での実装

上記の2ステップを`getCurrentUser()`関数に集約：

```typescript
export async function getCurrentUser() {
  // ステップ1: 認証トークンの検証
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { user: null, error: '認証が必要です', status: 401 };
  }

  // ステップ2: Prismaからユーザー情報を取得
  const user = await prisma.user.findFirst({
    where: { authId: authUser.id }
  });

  if (!user) {
    return { user: null, error: 'ユーザーが見つかりません', status: 404 };
  }

  return { user, error: null, status: 200 };
}
```

**使用例**
```typescript
// API内で1行で呼び出せる
const { user, error, status } = await getCurrentUser();
if (error) return NextResponse.json({ error }, { status });

// これだけで認証完了！
```

---

## コード削減効果

共通関数を使用することで、コードが大幅に簡潔化：

| API | 変更前 | 変更後 | 削減率 |
|-----|--------|--------|--------|
| `/api/messages/[channelId]` | 74行 | 34行 | **-54%** |
| `/api/dashboard` | 36行 | 19行 | **-47%** |
| `/api/channels` (POST) | 44行 | 25行 | **-43%** |
| `/api/channel/[channelId]` | なし | 42行 | 新規追加 |
| `/api/threads/[messageId]` | なし | 60行 | 認証追加 |
| `/api/avatar/upload` | 55行 | 48行 | **-13%** |

**メリット**
- コードの重複を削減
- 変更時に1箇所（`auth-server.ts`）を修正すればよい
- 読みやすく、メンテナンスしやすい
- 認証漏れのリスクが減る

---

## セキュリティ強化のまとめ

### 保護されている機能

| API | 認証 | メンバーシップ確認 | 説明 |
|-----|------|------------------|------|
| `/api/dashboard` | ✅ | - | 自分のダッシュボードのみ表示 |
| `/api/channel/[channelId]` | ✅ | ✅ | 参加チャンネルのみ情報取得可能 |
| `/api/messages/[channelId]` | ✅ | ✅ | 参加チャンネルのメッセージのみ取得 |
| `/api/threads/[messageId]` (GET) | ✅ | ✅ | 参加チャンネルのスレッドのみ閲覧可能 |
| `/api/threads/[messageId]` (POST) | ✅ | ✅ | 参加チャンネルのスレッドのみ返信可能 |
| `/api/channels` (GET) | ✅ | - | 自分が参加しているチャンネル一覧のみ |
| `/api/channels` (POST) | ✅ | - | ログインユーザーのみチャンネル作成可能 |
| `/api/avatar/upload` | ✅ | - | 自分のアバターのみアップロード可能 |

### 改善のBefore/After

**Before（変更前）**

| 問題 | 説明 |
|------|------|
| ❌ URLで他人になりすませる | `?userId=他人のID` を指定すれば他人のデータが取得できた |
| ❌ 認証チェックなし | スレッドAPIは誰でもアクセスできた（最も深刻） |
| ❌ チェック機能なし | チャンネルのメンバーでなくてもアクセスできた |
| ❌ 誰でも見放題 | チャンネルIDさえ知っていれば誰でもメッセージを見れた |
| ❌ コードの重複 | 各APIで同じ認証コードを記述していた |

**After（変更後）**

| 改善 | 説明 |
|------|------|
| ✅ 本人確認が必須 | 認証トークンで「この人は本当にログインしているか？」を確認 |
| ✅ 全APIで認証強化 | スレッドAPIにも認証を追加 |
| ✅ メンバーシップ確認 | 「この人はこのチャンネルのメンバーか？」を確認 |
| ✅ 改ざん不可能 | URLを変更しても無駄（トークンで判定） |
| ✅ データ漏洩防止 | 自分が参加しているチャンネルのデータしか見れない |
| ✅ コード簡潔化 | 共通関数で重複を削減 |

---

## 技術用語の説明

### 認証トークン（Authentication Token）
```
ログイン時に発行される「身分証明書」のようなもの。
暗号化されていて、本人しか使えない。

例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM...
```

### クエリパラメーター（Query Parameter）
```
URLの後ろに付ける情報。
例: ?userId=123&name=太郎

簡単に変更できるので、セキュリティには使えない。
```

### チャンネルメンバーシップ（Channel Membership）
```
「誰がどのチャンネルに参加しているか」の記録。
データベースの`ChannelMember`テーブルで管理されている。
```

### ステータスコード（HTTP Status Code）
```
APIの結果を表す数字：
- 200: 成功
- 401: 認証が必要（ログインしてください）
- 403: 権限がない（アクセス禁止）
- 404: 見つからない
- 500: サーバーエラー
```

### 共通関数（Common Function）
```
複数の場所で使われる処理を1つにまとめた関数。

メリット:
- コードの重複を減らす
- 修正時に1箇所を変えればよい
- バグが減る
```

---

## 参考資料

- `CLAUDE.md` - プロジェクト全体のアーキテクチャ
- `CONTEXT_HANDOVER_12.md` - 今回の作業詳細
- `src/lib/auth-server.ts` - 共通認証関数の実装
- `DATABASE_ACCESS_PATTERNS.md` - Prisma vs Supabase SDK
- `troubleshooting/SUPABASE_AUTH_INTEGRATION.md` - 認証統合

---

## 今後の展開

### さらなるセキュリティ強化の候補

1. **レート制限（Rate Limiting）**
   - 同じIPアドレスから大量のリクエストを防ぐ
   - DoS攻撃対策

2. **CSRF対策**
   - クロスサイトリクエストフォージェリ対策
   - Next.jsのCSRFトークン実装

3. **入力バリデーション強化**
   - Zodスキーマでのバリデーション
   - XSS（クロスサイトスクリプティング）対策

4. **監査ログ**
   - 誰がいつ何をしたか記録
   - セキュリティインシデント調査用

### 未対応のAPI

以下のAPIは今後対応予定：

- `/api/dm/*` - DM関連API（認証済みだが共通関数化していない）
- `/api/user/[userId]` - ユーザー情報取得（公開情報のため認証不要）
- `/api/debug/*` - デバッグ用API（開発環境のみ）
- `/api/seed*` - テストデータ生成API（開発環境のみ）

---

**作成日**: 2025-10-21
**目的**: APIセキュリティ強化の理解（初心者向け）
**更新履歴**:
- 2025-10-21: 共通関数化とスレッドAPI脆弱性修正を反映
