# データベースアクセスパターン：Prisma vs Supabase SDK

このドキュメントでは、このプロジェクトで使用している2つの異なるデータアクセス方法について説明します。

## 目次
- [全体像](#全体像)
- [Prisma経由のデータベースアクセス](#prisma経由のデータベースアクセス)
- [Supabase SDK経由のアクセス](#supabase-sdk経由のアクセス)
- [使い分けのルール](#使い分けのルール)
- [実装例](#実装例)

---

## 全体像

このアプリは**2つの異なる経路**でデータにアクセスしています：

```
┌────────────────────────────────────────────────────┐
│          Supabaseのクラウドサーバー                 │
│                                                    │
│  ┌──────────────────┐    ┌──────────────────────┐│
│  │   PostgreSQL     │    │  Supabase独自サービス││
│  │   (データ本体)   │    │  ・Auth API          ││
│  │                  │    │  ・Realtime API      ││
│  │  User テーブル   │    │  ・Storage API       ││
│  │  Message テーブル│    └──────────────────────┘│
│  └──────────────────┘              ↑              │
│         ↑                          │              │
│         │ SQL                      │ HTTPS API    │
│         │                          │              │
└─────────┼──────────────────────────┼──────────────┘
          │                          │
          │                          │
    ┌─────┴────────┐          ┌──────┴──────────┐
    │   Prisma     │          │  Supabase SDK   │
    │              │          │  (@supabase/    │
    │  Prismaは    │          │   supabase-js)  │
    │  PostgreSQL  │          │                 │
    │  専用ツール  │          │  SupabaseのAPI  │
    │              │          │  専用ツール      │
    └──────────────┘          └─────────────────┘
          ↑                          ↑
          │                          │
    ┌─────┴──────────────────────────┴─────────┐
    │      あなたのNext.jsアプリ                │
    │                                           │
    │  ・データベース操作 → Prisma使用         │
    │  ・認証/Realtime → Supabase SDK使用      │
    └───────────────────────────────────────────┘
```

---

## Prisma経由のデータベースアクセス

### 概要

Prismaは**PostgreSQLデータベース専用のアクセスツール（ORM）**です。

### データの流れ

```
あなたのコード
  ↓
Prisma Client（TypeScript）
  ↓
SQL文に変換
  ↓
PostgreSQLデータベース
  ↓
データ取得
  ↓
TypeScriptオブジェクトに変換
  ↓
あなたのコードに返却
```

### 主な用途

| 操作 | 例 |
|------|-----|
| **メッセージ取得** | `prisma.message.findMany()` |
| **メッセージ送信** | `prisma.message.create()` |
| **ユーザー情報取得** | `prisma.user.findUnique()` |
| **チャンネル作成** | `prisma.channel.create()` |
| **リレーション取得** | `include: { sender: true }` |

### コード例

```typescript
// メッセージ一覧取得（送信者情報も含む）
const messages = await prisma.message.findMany({
  where: {
    channelId: channelId
  },
  include: {
    sender: {
      select: {
        id: true,
        name: true,
        email: true,
        authId: true,
        avatarUrl: true
      }
    }
  },
  orderBy: {
    createdAt: 'asc'
  }
})
```

**実際に実行されるSQL**:
```sql
SELECT
  "Message".*,
  "User"."id", "User"."name", "User"."email",
  "User"."authId", "User"."avatarUrl"
FROM "Message"
LEFT JOIN "User" ON "Message"."senderId" = "User"."id"
WHERE "Message"."channelId" = 'abc123'
ORDER BY "Message"."createdAt" ASC;
```

### メリット

✅ **型安全性**: TypeScriptの補完が完璧
✅ **リレーション管理**: JOINが簡単
✅ **マイグレーション**: スキーマ変更履歴を管理
✅ **自動補完**: IDEで関数・フィールドが補完される

### 使用ファイル例

- `src/app/api/messages/[channelId]/route.ts`
- `src/app/api/user/[userId]/route.ts`
- `src/app/api/channels/route.ts`

---

## Supabase SDK経由のアクセス

### 概要

Supabase SDKは**Supabase独自サービス（認証、Realtime、ストレージ）専用のツール**です。

### データの流れ

```
あなたのコード
  ↓
Supabase SDK（JavaScript）
  ↓
HTTPS API リクエスト
  ↓
Supabase Auth API / Realtime API
  ↓
処理実行
  ↓
JSONレスポンス
  ↓
あなたのコードに返却
```

### 主な用途

| 操作 | 例 |
|------|-----|
| **認証チェック** | `supabase.auth.getUser()` |
| **ログアウト** | `supabase.auth.signOut()` |
| **ソーシャル認証** | `supabase.auth.signInWithOAuth()` |
| **リアルタイム監視** | `supabase.channel().on()` |
| **ファイルアップロード** | `supabase.storage.upload()` |

### コード例

#### 1. 認証チェック

```typescript
// src/hooks/useAuth.ts
const { data: { user }, error } = await supabase.auth.getUser()

if (user) {
  console.log('ログイン中:', user.email)
} else {
  console.log('未ログイン')
}
```

**実際のHTTPリクエスト**:
```
GET https://xxx.supabase.co/auth/v1/user
Headers:
  Authorization: Bearer <token>
  apikey: <anon-key>
```

#### 2. リアルタイム監視

```typescript
// src/hooks/useRealtimeMessages.ts
const channel = supabase
  .channel(`messages_${channelId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'Message',
      filter: `channelId=eq.${channelId}`
    },
    async (payload) => {
      console.log('新しいメッセージ受信:', payload.new)
      // メッセージを画面に追加
    }
  )
  .subscribe()
```

**仕組み**:
```
WebSocket接続でSupabase Realtimeサーバーと通信
  ↓
PostgreSQLで新しいデータINSERT
  ↓
Realtimeサーバーがイベント検知
  ↓
WebSocket経由で全クライアントに通知
  ↓
あなたのアプリが受信 → 画面更新
```

#### 3. ソーシャル認証

```typescript
// src/lib/auth.ts
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

### メリット

✅ **Supabase独自機能にアクセス**: 認証、Realtime、ストレージ
✅ **リアルタイム通信**: WebSocketで即時更新
✅ **セキュリティ**: 認証トークン管理が自動
✅ **シンプル**: 複雑な認証フローを1行で実装

### 使用ファイル例

- `src/hooks/useAuth.ts`
- `src/hooks/useRealtimeMessages.ts`
- `src/lib/auth.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

---

## 使い分けのルール

### Prismaを使う場面

✅ **データベースのテーブルに対する操作**

- メッセージの取得・作成・更新・削除
- ユーザー情報の取得・更新
- チャンネルの作成・削除
- リレーションを含むクエリ

**判断基準**: 「PostgreSQLのテーブルを操作するか？」

### Supabase SDKを使う場面

✅ **Supabase独自機能を使う操作**

- ログイン状態の確認
- ソーシャル認証（Google、GitHub）
- ログアウト
- リアルタイム監視（新しいメッセージの自動受信）
- ファイルアップロード（将来実装予定）

**判断基準**: 「認証・Realtime・ストレージのいずれかを使うか？」

---

## 実装例

### 例1: メッセージ送信（Prisma使用）

```typescript
// src/app/api/messages/[channelId]/route.ts
export async function POST(request: NextRequest) {
  const { content, senderId, channelId } = await request.json()

  // ✅ Prisma: データベーステーブルへの書き込み
  const newMessage = await prisma.message.create({
    data: {
      content: content,
      senderId: senderId,
      channelId: channelId
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      }
    }
  })

  return NextResponse.json({ success: true, message: newMessage })
}
```

### 例2: 新しいメッセージの自動受信（Supabase SDK使用）

```typescript
// src/hooks/useRealtimeMessages.ts
useEffect(() => {
  // ✅ Supabase SDK: リアルタイム監視
  const channel = supabase
    .channel(`messages_${channelId}`)
    .on('postgres_changes', { event: 'INSERT', ... }, (payload) => {
      // 新しいメッセージを画面に追加
      setMessages(prev => [...prev, payload.new])
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [channelId])
```

### 例3: ログイン処理（両方使用）

```typescript
// src/lib/auth.ts
export async function signInWithSocial(provider: 'google' | 'github') {
  // ✅ Supabase SDK: ソーシャル認証
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider
  })

  return { data, error }
}
```

```typescript
// src/app/auth/callback/route.ts
export async function GET(request: NextRequest) {
  // ✅ Supabase SDK: 認証コード交換
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  // ✅ Supabase SDK: ユーザー情報取得
  const { data: { user } } = await supabase.auth.getUser()

  // ✅ Prisma: Prismaデータベースにユーザー情報を同期
  await prisma.user.upsert({
    where: { authId: user.id },
    update: {
      name: user.user_metadata?.name,
      email: user.email,
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture
    },
    create: {
      authId: user.id,
      name: user.user_metadata?.name,
      email: user.email,
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture
    }
  })
}
```

---

## よくある質問

### Q1: Supabase SDKでもデータベース操作できるのでは？

**A**: はい、できます。しかし、このプロジェクトでは使っていません。

```typescript
// ❌ このプロジェクトでは使わない方法（Supabase SDKでDB操作）
const { data, error } = await supabase
  .from('Message')
  .select('*')
  .eq('channelId', channelId)

// ✅ このプロジェクトで使う方法（Prisma）
const messages = await prisma.message.findMany({
  where: { channelId }
})
```

**理由**: Prismaの方が型安全性、マイグレーション管理、リレーション処理が優れているため。

### Q2: PostgreSQLは1つだけ？

**A**: はい、1つだけです。

- Supabase管理画面で見えるデータベース
- Prisma Studioで見えるデータベース
- Prismaでアクセスするデータベース

**すべて同じPostgreSQLデータベースです。**

### Q3: データはどこに保存されているの？

**A**: すべてSupabaseのクラウドサーバー上のPostgreSQLに保存されています。

```
Supabaseサーバー（クラウド）
  └── PostgreSQL
       ├── User テーブル
       ├── Message テーブル
       ├── Channel テーブル
       └── ...
```

---

## まとめ

| 項目 | Prisma | Supabase SDK |
|------|--------|--------------|
| **用途** | データベース操作 | 認証・Realtime・ストレージ |
| **アクセス先** | PostgreSQL | Supabase独自サービス |
| **通信方法** | SQL | HTTPS API / WebSocket |
| **主な操作** | CRUD（作成・読取・更新・削除） | 認証・リアルタイム監視 |
| **ファイル例** | `api/messages/*/route.ts` | `hooks/useAuth.ts` |
| **インポート** | `@prisma/client` | `@supabase/supabase-js` |

**重要なポイント**:
- 2つは**完全に別の経路**
- 混ざることはない
- それぞれ得意分野が違う
- 適切に使い分けることで、効率的で安全なアプリを作れる

---

## 参考リンク

- [Prisma公式ドキュメント](https://www.prisma.io/docs)
- [Supabase Auth公式ドキュメント](https://supabase.com/docs/guides/auth)
- [Supabase Realtime公式ドキュメント](https://supabase.com/docs/guides/realtime)
- `CLAUDE.md` - プロジェクト全体のアーキテクチャ説明

---

作成日: 2025-10-21
