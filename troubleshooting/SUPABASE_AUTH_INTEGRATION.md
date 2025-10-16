# Supabase認証システム統合 - トラブルシューティングガイド

## 📝 概要

このドキュメントは、チャットアプリにSupabase認証システムを統合する際に発生した問題と解決方法をまとめたものです。認証システムとPrisma ORM間のユーザーID連携に関する重要な知見が含まれています。

## 🔧 技術構成

### システム構成図
```
【認証】
アプリ → 直接 Supabase Auth
  ├─ ログイン・ログアウト
  ├─ セッション管理
  └─ ユーザー情報取得

【データ操作】
アプリ → Prisma → Supabase PostgreSQL
  ├─ メッセージ送信
  ├─ チャンネル管理
  └─ リレーション管理
```

### ユーザーID管理の仕組み
```
Supabase Auth (認証システム)
├─ ユーザーID: "240ddd9e-c69c-4b62-b9f2-73e3f384ea90" (UUID形式)
├─ ログイン・ログアウト処理
└─ セッション管理

          ↕ authId フィールドで連携

Prisma Database (データ管理)
├─ 内部ID: "cmgpubulk0019j01jq8eg3iny" (cuid形式)
├─ チャンネル参加・メッセージ送信
├─ authId: "240ddd9e-c69c-4b62-b9f2-73e3f384ea90" ← 橋渡し
└─ データの関係性管理
```

## 🚨 発生した問題

### 問題1: 認証統合後にチャンネルが表示されない

#### 症状
- 認証システム実装完了後、ワークスペースでチャンネル一覧が表示されない
- ダッシュボード統計で `channelCount: 0` と表示される
- Supabaseには認証ユーザーが存在し、Prismaにはチャンネルデータが存在

#### エラーログ例
```
📊 ダッシュボード統計取得 - ユーザーID: 240ddd9e-c69c-4b62-b9f2-73e3f384ea90
✅ ダッシュボード統計取得成功 {
  channelCount: 0,
  dmCount: 0,
  totalRoomsCount: 0,
  userMessageCount: 0,
  totalUserCount: 4
}
```

#### 根本原因
**ユーザーIDの不整合問題**

- **フロントエンド**: Supabase AuthID (`240ddd9e-c69c-4b62-b9f2-73e3f384ea90`) を送信
- **API側**: Prisma内部ID (`cmgpubulk0019j01jq8eg3iny`) を期待
- **結果**: APIがユーザーを見つけられず、空のデータを返す

#### 修正前のコード（問題あり）
```typescript
// ダッシュボードAPI
export async function GET(request: NextRequest) {
  const userId = url.searchParams.get('userId'); // Supabase AuthID
  
  // 直接Supabase AuthIDで検索（見つからない）
  const userChannels = await prisma.channelMember.findMany({
    where: { userId: userId }, // ← 問題: Prisma内部IDを期待
  });
}
```

#### 修正後のコード（解決）
```typescript
// ダッシュボードAPI
export async function GET(request: NextRequest) {
  const userId = url.searchParams.get('userId'); // Supabase AuthID
  
  // SupabaseのauthIdからPrismaのユーザー内部IDを取得
  const user = await prisma.user.findFirst({
    where: { authId: userId }
  });
  
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'ユーザーが見つかりません'
    }, { status: 404 });
  }
  
  // Prisma内部IDを使用してデータ取得
  const userChannels = await prisma.channelMember.findMany({
    where: { userId: user.id }, // ← 解決: 正しいPrisma内部ID
  });
}
```

### 問題2: サインアップ時のSupabase-Prisma連携

#### 症状
- サインアップは成功するが、Prismaにユーザーレコードが作成されない
- 後でAPIがユーザーを見つけられない

#### 解決策
サインアップ処理でPrismaにもユーザーレコードを作成：

```typescript
// src/app/signup/actions.ts
export async function signup(formData: FormData) {
  // Supabaseでユーザー登録
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });

  // Supabaseユーザー作成成功時、Prismaにもユーザーレコードを作成
  if (authData.user) {
    try {
      await prisma.user.create({
        data: {
          authId: authData.user.id,     // Supabaseユーザーの ID
          email: data.email,
          name: data.name,
        },
      });
      console.log('Prisma User created successfully');
    } catch (prismaError) {
      console.error('Prisma User creation error:', prismaError);
    }
  }
}
```

---

### 問題3: DM一覧からの遷移で404エラー（partnerId問題）

**発生日**: 2025/10/16

#### 症状
- ユーザー管理からDM作成: ✅ 正常動作
- DM一覧からユーザークリック: ❌ 「DMの初期化に失敗しました」エラー
- ブラウザコンソールに404エラー: `GET /api/dm/cmgpu3fri000cj01jb8tig9oy 404`

#### 根本原因
**APIレスポンスでPrisma内部IDを返していた**

複数のAPIで `partnerId` に **Prisma内部ID** (`cmgpu...`) を返していたため、DMページが間違ったIDでAPIリクエストを送信していた。

```typescript
// 問題のあったコード
directMessages.push({
  id: channel.id,
  partnerId: partner.user.id,  // ❌ Prisma内部ID (cmgpu...)
  partnerName: partner.user.name,
  partnerEmail: partner.user.email
});
```

**なぜユーザー管理からは動作したのか？**
- ユーザー管理コンポーネントは `authId` を直接渡していた
- DM一覧は `/api/channels` から取得した `partnerId` を使用
- そのため、一方は動作し、もう一方は失敗していた

#### 修正内容

**影響を受けていたAPI**:
1. `/api/channels/route.ts` ← DM一覧のデータソース
2. `/api/dashboard/route.ts` ← ダッシュボードの統計情報
3. `/api/debug/dashboard/route.ts` ← デバッグ用API

**修正箇所**:

##### 1. `authId` をユーザー情報に含める
```typescript
// 修正前
user: {
  select: {
    id: true,
    name: true,
    email: true
  }
}

// 修正後
user: {
  select: {
    id: true,
    name: true,
    email: true,
    authId: true  // ✅ 追加
  }
}
```

##### 2. `partnerId` に `authId` を使用
```typescript
// 修正前
directMessages.push({
  id: channel.id,
  partnerId: partner.user.id,  // ❌ Prisma内部ID
  partnerName: partner.user.name,
  partnerEmail: partner.user.email
});

// 修正後
directMessages.push({
  id: channel.id,
  partnerId: partner.user.authId,  // ✅ Supabase AuthID
  partnerName: partner.user.name,
  partnerEmail: partner.user.email
});
```

#### 修正したファイル一覧

| ファイル | 修正行 | 内容 |
|---------|-------|------|
| `src/app/api/channels/route.ts` | 54行目 | `authId: true` 追加 |
| | 87行目 | `partnerId: partner.user.authId` に変更 |
| `src/app/api/dashboard/route.ts` | 52行目 | `authId: true` 追加 |
| | 94行目 | `partnerId: partner.user.authId` に変更 |
| `src/app/api/debug/dashboard/route.ts` | 53行目 | `authId: true` 追加 |
| | 99行目 | `partnerId: partner.user.authId` に変更 |

#### 今後の予防策

**ルール**: **外部に返すユーザーIDは必ず `authId` を使用**

```typescript
// ✅ Good - 外部APIレスポンス
{
  userId: user.authId,      // Supabase AuthID
  partnerId: partner.authId // Supabase AuthID
}

// ❌ Bad - 外部APIレスポンス
{
  userId: user.id,          // Prisma内部ID（外部に公開しない）
  partnerId: partner.id     // Prisma内部ID（外部に公開しない）
}

// ✅ Good - 内部クエリ
await prisma.channelMember.findMany({
  where: { userId: user.id } // Prisma内部IDを使用
});
```

**チェックリスト**:
- [ ] 新しいAPIを作成する際、レスポンスに `user.id` が含まれていないか確認
- [ ] `partnerId`, `userId`, `senderId` などは必ず `authId` を使用
- [ ] Prisma selectで `authId: true` を含めているか確認

## 🛠️ 解決手順

### Step 1: 必要なファイル作成

#### 1.1 Supabaseクライアント設定
```
src/lib/supabase/client.ts    # ブラウザ用
src/lib/supabase/server.ts    # サーバー用
```

#### 1.2 認証コールバック処理
```
src/app/auth/callback/route.ts
```

#### 1.3 認証フックとミドルウェア
```
src/hooks/useAuth.ts
src/middleware.ts (有効化)
```

### Step 2: 認証統合実装

#### 2.1 ワークスペースレイアウト修正
```typescript
// src/app/workspace/layout.tsx
import { useAuth } from '@/hooks/useAuth';

export default function WorkspaceLayout() {
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  
  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);
}
```

#### 2.2 メッセージページ修正
```typescript
// チャンネル・DMページ
const { user } = useAuth();
const myUserId = user?.id; // Supabase AuthID

// 認証チェック
if (!myUserId) {
  alert('メッセージを送信するにはログインが必要です。');
  return;
}
```

### Step 3: API側のID変換処理実装

全てのAPIで以下の変換処理を追加：

```typescript
// SupabaseのauthIdからPrismaのユーザー内部IDを取得
const user = await prisma.user.findFirst({
  where: { authId: userId } // userIdはSupabase AuthID
});

if (!user) {
  return NextResponse.json({
    success: false,
    error: 'ユーザーが見つかりません'
  }, { status: 404 });
}

// 以降はuser.id (Prisma内部ID) を使用
```

#### 修正が必要なAPI
- `src/app/api/dashboard/route.ts`
- `src/app/api/channels/route.ts`
- `src/app/api/dm/[partnerId]/route.ts`
- その他ユーザーIDを使用するAPI

### Step 4: テストデータ作成

認証ユーザー用のテストデータAPI作成：

```typescript
// src/app/api/seed-auth-user/route.ts
// 現在のSupabase AuthIDに対応したチャンネルとメンバー関係を作成
```

## 🔍 重要な概念理解

### authIdフィールドの役割

`authId`は2つのシステムを橋渡しする重要なフィールド：

```typescript
// Prisma User モデル
model User {
  id        String   @id @default(cuid()) // Prisma内部ID
  name      String
  email     String   @unique
  authId    String   @unique              // Supabase連携用ID
  // ...
}
```

### ユーザー情報取得の2パターン

#### パターン1: 認証情報（直接Supabase）
```typescript
const { user } = useAuth(); // Supabase Auth
console.log(user.id);        // "240ddd9e-c69c-4b62-b9f2-73e3f384ea90"
console.log(user.email);     // メールアドレス
console.log(user.user_metadata?.name); // 名前
```

#### パターン2: アプリ固有データ（Prisma経由）
```typescript
const user = await prisma.user.findFirst({
  where: { authId: supabaseUserId }
});
console.log(user.id);        // "cmgpubulk0019j01jq8eg3iny"
console.log(user.createdAt); // アプリでの登録日時
```

## ⚠️ 注意点とベストプラクティス

### 1. 一貫したID変換処理

全てのAPIで統一された変換処理を実装：

```typescript
// 共通化できるユーティリティ関数の例
async function getPrismaUserByAuthId(authId: string) {
  const user = await prisma.user.findFirst({
    where: { authId }
  });
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }
  return user;
}
```

### 2. エラーハンドリング

認証状態とユーザー存在確認を適切に処理：

```typescript
// フロントエンド
if (!user) {
  return <div>読み込み中...</div>;
}

// API
if (!user) {
  return NextResponse.json({
    success: false,
    error: 'ユーザーが見つかりません'
  }, { status: 404 });
}
```

### 3. サインアップ時の連携

サインアップ処理で必ずPrismaユーザーも作成：

```typescript
// 重要: サインアップ成功後、Prismaにも連携レコード作成
if (authData.user) {
  await prisma.user.create({
    data: {
      authId: authData.user.id, // 重要: Supabase AuthIDを保存
      email: data.email,
      name: data.name,
    },
  });
}
```

## 🧪 テスト方法

### 認証統合テスト手順

1. **サインアップテスト**
   - 新規アカウント作成
   - Supabase Auth確認
   - Prismaレコード確認

2. **ログインテスト** 
   - 作成したアカウントでログイン
   - ワークスペースアクセス確認

3. **データ表示テスト**
   - チャンネル一覧表示
   - 統計情報表示

4. **メッセージ送信テスト**
   - 実際のユーザー名で送信確認
   - リアルタイム同期確認

## 🎯 学習ポイント

### 1. マイクロサービス連携
- 複数のサービス（認証・データベース）を組み合わせる際のID管理
- 橋渡しフィールドの重要性

### 2. ORMとサービス統合
- PrismaのリレーションとSupabase Authの統合
- 内部IDと外部IDの使い分け

### 3. 認証システム設計
- 認証と認可の分離
- セッション管理とデータアクセスの連携

## 🔄 関連ドキュメント

- [Supabase Realtime機能](./REALTIME_TROUBLESHOOTING.md)
- [React無限ループ解決](./INFINITE_LOOP_TROUBLESHOOTING.md)
- [プロジェクト概要](../PROJECT_SUMMARY.md)

---

**作成日**: 2025/10/13
**更新日**: 2025/10/16 - 問題3（DM一覧からの遷移エラー）追加
**対象バージョン**: Next.js 15.5.4, Supabase Auth, Prisma 6.16.3