# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

リアルタイムチャットアプリケーション（卒業制作プロジェクト）。Slack/Discord のような機能を持つ Web ベースのチャットプラットフォーム。

**技術スタック**:

- Next.js 15.5.4 (App Router) + React 19
- TypeScript
- Prisma ORM + PostgreSQL (Supabase)
- Supabase Auth (認証)
- Supabase Realtime (WebSocket リアルタイム通信)
- shadcn/ui + TailwindCSS 4
- Zustand (状態管理 - 将来的に導入予定)
- OpenAI API (AI 機能 - 将来的に導入予定)

**リポジトリ**: https://github.com/Ishikawa-Yutaka/studying-chat-app

**作業ディレクトリ**: `/Users/Uni/Uni_MacBookAir/STUDYing/卒業制作‐チャットアプリ/studying-tech-chat-app/chat-app`

## Communication Style - 重要

このプロジェクトは **初心者向けの卒業制作** です。コードレビューや作業時は以下を心がけてください：
文字化けするので絵文字は使用しない

### 必須事項

1. **作業の目的を明確に説明する**

   - 「なぜこの変更が必要なのか」を必ず説明
   - 「この機能は何のためにあるのか」を理解できるように説明

2. **コードの丁寧な説明**

   - 生成したコードには日本語コメントを必ず付ける
   - 各関数・コンポーネントの役割を明記
   - 複雑なロジックは段階的に説明

3. **技術用語の補足**

   - 専門用語を使う場合は簡単な説明を添える
   - 例: 「楽観的更新（ユーザーが送信ボタンを押したら、サーバーの応答を待たずに即座に画面に表示する手法）」

4. **作業プロセスの可視化**
   - 何をしているのか、次に何をするのかを明確に伝える
   - エラーが発生した場合は、原因と解決策を分かりやすく説明

### コメントスタイル

```typescript
// ✅ Good - 初心者が理解できる
/**
 * ユーザーがメッセージを送信する関数
 *
 * 処理の流れ:
 * 1. フォームから入力内容を取得
 * 2. データベースに保存（API経由）
 * 3. 送信成功したら入力欄をクリア
 * 4. エラーが出たらユーザーに通知
 */
const handleSubmit = async (data: FormData) => {
  // ...
};

// ❌ Bad - 説明が不十分
// メッセージ送信
const handleSubmit = async (data: FormData) => {
  // ...
};
```

### console.log の使用

デバッグ用ログは絵文字プレフィックスで分類：

- `🔄` 処理開始・更新
- `✅` 成功
- `❌` エラー
- `📨` データ受信
- `📡` 通信状態
- `⚠️` 警告

例:

```typescript
console.log("🔄 メッセージ送信開始...");
console.log("✅ メッセージ送信成功:", message);
console.error("❌ メッセージ送信失敗:", error);
```

## Development Commands

### 基本コマンド

```bash
# 開発サーバー起動
npm run dev
# → http://localhost:3000 でアプリを確認できます

# プロダクションビルド（本番環境用のビルド）
npm run build

# プロダクションサーバー起動
npm run start

# Lint実行（コードの問題をチェック）
npm run lint
```

### データベース操作

```bash
# Prismaマイグレーション生成（データベース構造の変更を記録）
npx prisma migrate dev --name <migration_name>
# 例: npx prisma migrate dev --name add_user_avatar

# Prisma Client再生成（TypeScript型定義を最新化）
npx prisma generate

# データベーススキーマをブラウザで確認（管理画面が開く）
npx prisma studio

# テストデータ投入（開発用のサンプルデータを作成）
curl http://localhost:3000/api/seed
```

### デバッグ用 API エンドポイント

```bash
# ユーザー一覧確認
curl http://localhost:3000/api/debug/users

# ダッシュボードデータ確認
curl http://localhost:3000/api/debug/dashboard
```

## Architecture Overview

### 全体構成

このアプリは以下の 3 層構造で動作しています：

```
[フロントエンド]     Next.js + React
      ↕ (HTTP/WebSocket)
[バックエンド]       Next.js API Routes
      ↕ (Prisma ORM)
[データベース]       PostgreSQL (Supabase)
```

### 認証フロー (Supabase Auth + Prisma)

このアプリは **2 つのデータベースシステム** を連携させています：

1. **Supabase Auth Database**: ユーザー認証・セッション管理（パスワード、メール認証など）
2. **Prisma Database (PostgreSQL)**: アプリケーションデータ（メッセージ、チャンネルなど）

**なぜ 2 つに分かれているのか？**

- Supabase Auth: セキュアな認証機能（パスワードハッシュ化、トークン管理など）を提供
- Prisma Database: アプリ固有のデータ（メッセージ履歴、チャンネル情報など）を柔軟に管理

**連携の仕組み**:

```
1. ユーザーがサインアップ
   → Supabase Auth にユーザー作成（authId が発行される）

2. サインアップ成功後
   → Prisma Database の User テーブルに authId を保存

3. 以降のリクエスト
   → Supabase でログイン状態確認
   → authId を使って Prisma からユーザー情報取得
```

**重要なファイル**:

- `src/lib/supabase/server.ts`: サーバー側の認証クライアント（API 内で使用）
- `src/lib/supabase/client.ts`: クライアント側の認証クライアント（ブラウザで使用）
- `src/middleware.ts`: 全リクエストで認証チェック（未ログインユーザーを弾く）
- `src/hooks/useAuth.ts`: React コンポーネント内での認証状態管理

### リアルタイム通信アーキテクチャ

**Supabase Realtime** を使用した WebSocket ベースのリアルタイム機能。

**仕組みの説明**:

```
1. ユーザーAがメッセージ送信
   ↓
2. データベース（PostgreSQL）にメッセージ保存
   ↓
3. PostgreSQL が「新しいデータが追加されたよ！」とイベント発行
   ↓
4. Supabase Realtime がそのイベントをキャッチ
   ↓
5. WebSocket経由で接続中の全ユーザーに通知
   ↓
6. ユーザーBの画面に自動的にメッセージ表示
```

**主な特徴**:

- **楽観的更新**: 送信者は送信ボタンを押した瞬間に画面更新（サーバー応答を待たない）
- **マルチタブ同期**: 同じユーザーが複数タブを開いていても全タブで同期
- **リアルタイム性**: メッセージが 1 秒以内に他のユーザーに届く

**実装の中心**:

- `src/hooks/useRealtimeMessages.ts`: Realtime サブスクリプションを管理するカスタムフック
- `src/hooks/useRealtimeDashboard.ts`: ダッシュボード統計のリアルタイム更新

**無限ループ回避策（重要）**:
React の `useEffect` で Realtime サブスクリプションを設定する際、依存配列の管理を誤ると無限ループが発生します。

```typescript
// ❌ Bad - 無限ループ発生
useEffect(() => {
  const handleMessage = (payload) => {
    /* ... */
  };
  channel.on("INSERT", handleMessage).subscribe();
}, [messages]); // messages が変わるたびに再実行 → 無限ループ

// ✅ Good - useCallback でメモ化
const handleMessage = useCallback((payload) => {
  setMessages((prev) => [...prev, payload.new]);
}, []); // 依存なし = 関数は再生成されない

useEffect(() => {
  channel.on("INSERT", handleMessage).subscribe();
  return () => channel.unsubscribe(); // クリーンアップ必須
}, [channelId]); // channelId が変わった時だけ再実行
```

参考: `troubleshooting/INFINITE_LOOP_TROUBLESHOOTING.md`

### API 設計パターン

すべての API は `/src/app/api/` 以下に配置され、Next.js 15 の App Router 形式で実装。

**Next.js 15 の重要な変更点**:

```typescript
// ❌ Next.js 14 以前の書き方（動かない）
export async function GET(request: Request, { params }) {
  const { channelId } = params; // エラー！
}

// ✅ Next.js 15 の書き方（必須）
export async function GET(
  request: Request,
  context: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await context.params; // await が必要
  // ...
}
```

**なぜ await が必要？**
Next.js 15 では動的パラメータが非同期で解決されるため、必ず `await` してから使用します。

**主要 API エンドポイント**:

- `GET /api/channels?userId=<id>`: ユーザーが参加しているチャンネル・DM 一覧を取得
- `GET /api/messages/[channelId]`: 特定チャンネルのメッセージ一覧取得
- `POST /api/messages/[channelId]`: 新しいメッセージ送信
- `GET /api/dm/[partnerId]`: DM チャンネル取得（なければ自動作成）
- `GET /api/dashboard`: 統計情報取得（チャンネル数、メッセージ数など）
- `GET /api/user/[userId]`: ユーザー情報取得
- `POST /api/seed`: テストデータ生成（開発用）

### データベーススキーマ構造

**主要テーブルとリレーション**:

```
User (ユーザー)
├── id: String (主キー)
├── authId: String (Supabase Auth との連携キー、ユニーク制約)
├── name: String (ユーザー名)
├── email: String (メールアドレス、ユニーク制約)
├── messages: Message[] (このユーザーが送信したメッセージ一覧)
└── channels: ChannelMember[] (このユーザーが参加しているチャンネル一覧)

Channel (チャンネル/DM)
├── id: String (主キー)
├── name: String? (チャンネル名、DMの場合はnull)
├── description: String? (説明、DMの場合はnull)
├── type: String ("channel" または "dm")
├── members: ChannelMember[] (参加メンバー一覧)
└── messages: Message[] (このチャンネル内のメッセージ一覧)

ChannelMember (中間テーブル - どのユーザーがどのチャンネルに参加しているか)
├── id: String (主キー)
├── userId: String (外部キー → User)
├── channelId: String (外部キー → Channel)
└── @@unique([userId, channelId]) ← 同じユーザーが同じチャンネルに重複参加できない

Message (メッセージ)
├── id: String (主キー)
├── content: String (メッセージ内容)
├── senderId: String (外部キー → User)
├── channelId: String (外部キー → Channel)
├── createdAt: DateTime (送信日時)
└── updatedAt: DateTime (更新日時)

AiChat (AI会話履歴 - 未実装)
├── id: String (主キー)
├── userId: String (会話したユーザーのID)
├── message: String (ユーザーのメッセージ)
├── response: String (AIの応答)
└── createdAt: DateTime (会話日時)
```

**AI 機能について**:

- Prisma スキーマに `AiChat` モデルが定義されている
- `package.json` に `openai` パッケージが含まれている
- 実装は今後予定（現在未使用）
- 将来的に OpenAI API を使った AI チャットボット機能を追加予定

```

**DM（ダイレクトメッセージ）の特別な扱い**:

DM は通常のチャンネルと同じ `Channel` テーブルに保存されますが、以下の違いがあります：

- `type` フィールドが `"dm"`
- `name` と `description` は `null`
- 必ず **2人のメンバー** で構成される
- DM 作成時は既存の DM チャンネルを検索し、存在すればそれを返す（重複作成を防ぐ）

**Cascade 削除の仕組み**:
- ユーザーを削除 → そのユーザーのメッセージ・チャンネルメンバー情報も自動削除
- チャンネルを削除 → そのチャンネルのメッセージ・メンバー情報も自動削除

これにより、データの整合性が自動的に保たれます。

### コンポーネント構成

```

src/components/
├── ui/ # shadcn/ui 基本コンポーネント（ボタン、入力欄など）
│ ├── button.tsx
│ ├── input.tsx
│ ├── card.tsx
│ └── ... (その他 UI パーツ)
│
├── workspace/ # サイドバー・レイアウト関連
│ ├── appLogo.tsx # アプリのロゴ表示
│ ├── channelList.tsx # チャンネル一覧
│ ├── directMessageList.tsx # DM 一覧
│ ├── userManagement.tsx # ユーザー管理（招待など）
│ └── userProfileBar.tsx # ユーザー情報・ログアウトボタン
│
├── channel/ # チャット機能
│ ├── channelHeader.tsx # チャンネル上部（名前、説明、通話ボタン）
│ ├── messageView.tsx # メッセージ一覧表示
│ └── messageForm.tsx # メッセージ入力・送信フォーム
│
└── dm/ # DM 専用
└── dmHeader.tsx # DM 相手の情報・通話ボタン

```

**レイアウト階層の説明**:
```

src/app/layout.tsx (グローバルレイアウト)
└── 全ページ共通の設定（フォント、メタデータなど）

    src/app/workspace/layout.tsx (認証必須エリア)
    └── サイドバー付きレイアウト（ログインしていないとアクセスできない）

        src/app/workspace/channel/[channelId]/page.tsx
        └── 個別チャットページ（動的ルート）

        src/app/workspace/dm/[userId]/page.tsx
        └── DM ページ（動的ルート）

````

**なぜこの構造？**
- 認証が必要なページは `workspace/layout.tsx` 配下に配置
- サイドバーのコードを1箇所にまとめることで、メンテナンスが楽になる
- チャンネル/DM ページは URL パラメータで切り替え（ページ遷移が高速）

### 状態管理戦略

現在のプロジェクトでの状態管理方法：

| データの種類 | 管理方法 | 理由 |
|------------|---------|------|
| **サーバーデータ** (メッセージ、チャンネルなど) | React `useState` + `useEffect` | シンプルで理解しやすい |
| **認証状態** | カスタムフック (`useAuth`) | 認証ロジックを1箇所に集約 |
| **フォーム入力** | React Hook Form + Zod | バリデーションと型安全性 |
| **グローバル状態** | 未使用 (将来的に Zustand 導入予定) | 現状は必要性が低い |

**将来の拡張計画**:
- **SWR**: サーバーデータのキャッシュ・自動再検証（ページ切り替え時の高速化）
- **Zustand**: 複数ページで共有する状態（例: 通知バッジの未読数）

## Important Implementation Details

### Prisma Client の初期化

`src/lib/prisma.ts` で **Singleton パターン** を使用しています。

**なぜ Singleton が必要？**
開発環境では Next.js の Hot Reload（コード変更時の自動リロード）により、`PrismaClient` が何度もインスタンス化されてしまいます。これによりデータベース接続数が上限に達してエラーになる可能性があります。

Singleton パターンでは、グローバル変数に1つだけインスタンスを保持することで、この問題を回避しています。

```typescript
// グローバル変数で1つだけ保持
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
````

### Supabase Realtime の設定

**必須設定** (Supabase Dashboard で実施):

1. **Database → Replication → Publications**

   - `supabase_realtime` という Publication が存在することを確認
   - これはデータベースの変更をリアルタイムで配信するための設定

2. **Message テーブルを Publication に追加**

   - `Message` テーブルにチェックを入れる
   - これにより、新しいメッセージが INSERT された時にイベントが発行される

3. **環境変数の設定**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

**設定が正しいか確認する方法**:

```typescript
// ブラウザのコンソールで以下のログを確認
✅ Realtimeサブスクリプション成功  // OK
❌ Realtimeチャンネルエラー        // NG - 設定を見直す
```

詳細: `troubleshooting/REALTIME_TROUBLESHOOTING.md`

### 環境変数

`.env.local` に以下を設定（`.env.local` は `.gitignore` 済み、GitHub にプッシュされない）:

```bash
# Supabase（認証・Realtime用）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxx

# Database（Prisma用）
# Supabase の Settings → Database → Connection string から取得
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true  # Transaction モード（推奨）
DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres                   # Session モード（マイグレーション用）
```

**なぜ DATABASE_URL と DIRECT_URL の 2 つが必要？**

- `DATABASE_URL`: 通常のクエリ実行用（PgBouncer 経由で高速化）
- `DIRECT_URL`: マイグレーション実行用（直接接続が必要）

### 認証ミドルウェアの動作

`src/middleware.ts` は **全リクエストで自動実行** されます。

**保護されるパス**:

- `/workspace/*`: ログイン必須
- その他の認証が必要なページ

**保護されないパス**:

- `/login`, `/signup`: ログインページ自体
- `/auth/callback`: 認証コールバック
- `/_next/static/*`: Next.js の静的ファイル
- 画像ファイル (`.png`, `.jpg`, etc.)

**動作の流れ**:

```
1. ユーザーが /workspace にアクセス
   ↓
2. middleware.ts が実行される
   ↓
3. Supabase セッションをチェック
   ↓
4. セッションが無効 → /login にリダイレクト
   セッションが有効 → そのままページ表示
```

### メッセージ送信フロー（詳細）

ユーザーがメッセージを送信してから他のユーザーに届くまでの流れ：

```
[ユーザーA] メッセージ入力 → 送信ボタンクリック
   ↓
[messageForm.tsx]
   1. フォームバリデーション（空文字チェック）
   2. 楽観的更新: setMessages(prev => [...prev, newMessage])
      → ユーザーAの画面に即座に表示
   3. API リクエスト: POST /api/messages/[channelId]
   ↓
[API Route] src/app/api/messages/[channelId]/route.ts
   1. Supabase でユーザー認証確認
   2. Prisma で Message テーブルに INSERT
   3. レスポンス返却: { success: true, message: {...} }
   ↓
[PostgreSQL Database]
   1. Message テーブルに新しい行を追加
   2. Realtime に INSERT イベントを発行
   ↓
[Supabase Realtime]
   1. INSERT イベントを検知
   2. WebSocket 経由で全接続クライアントに通知
   ↓
[ユーザーB] useRealtimeMessages フック
   1. INSERT イベントを受信
   2. payload からメッセージデータ取得
   3. 送信者情報を API で取得: GET /api/user/[userId]
   4. setMessages(prev => [...prev, newMessageWithSender])
      → ユーザーBの画面に自動表示
```

**ポイント**:

- ユーザー A は「送信ボタンを押した瞬間」に画面更新（楽観的更新）
- ユーザー B は「1 秒以内」に自動で画面更新（Realtime）
- エラーが起きた場合のみ、ユーザー A にエラーメッセージ表示

## Known Issues and Limitations

現在の制限事項と今後の実装予定：

1. **Edge Runtime 非対応**

   - **理由**: Prisma が Edge Runtime で動作しない
   - **影響**: すべての API は Node.js Runtime を使用
   - **対策**: 現状は特になし（パフォーマンスへの影響は軽微）

2. **ファイル共有未実装**

   - **現状**: テキストメッセージのみ対応
   - **今後**: 画像・PDF などのアップロード機能を追加予定

3. **スレッド機能未実装**

   - **現状**: メッセージへの返信機能なし
   - **今後**: Slack 風のスレッド機能を追加予定

4. **通知機能未実装**

   - **現状**: ブラウザ通知・プッシュ通知なし
   - **今後**: 新着メッセージ通知機能を追加予定

5. **オンラインステータス未実装**

   - **現状**: ユーザーのオンライン/オフライン状態が分からない
   - **今後**: Supabase Presence を使った実装を検討

6. **AI チャット機能未実装**
   - **現状**: `AiChat` モデルと OpenAI パッケージは存在するが未実装
   - **今後**: OpenAI API を使った AI アシスタント機能を追加予定

## Troubleshooting

詳細なトラブルシューティングガイド：

- `troubleshooting/REALTIME_TROUBLESHOOTING.md`: Supabase Realtime 設定・接続エラー
- `troubleshooting/INFINITE_LOOP_TROUBLESHOOTING.md`: React useEffect 無限ループ解決法
- `troubleshooting/README.md`: ドキュメントインデックス

**よくあるエラー**:

| エラーメッセージ                                           | 原因                            | 解決方法                                       |
| ---------------------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| `PrismaClientInitializationError`                          | DATABASE_URL が正しくない       | `.env.local` を確認                            |
| `CHANNEL_ERROR` (Realtime)                                 | Publication 設定が不足          | Supabase Dashboard で設定確認                  |
| `Invariant: cookies() expects to have requestAsyncStorage` | middleware でクッキー操作エラー | `src/lib/supabase/server.ts` の try-catch 確認 |
| `params is not a Promise`                                  | Next.js 15 形式に未対応         | `await context.params` に修正                  |

## Development Guidelines

### コードスタイル

1. **日本語コメントを積極的に使う**

   - すべての関数・コンポーネントに説明を記載
   - 「なぜこのコードが必要なのか」を明記

2. **console.log は分類する**

   ```typescript
   console.log("🔄 処理開始");
   console.log("✅ 成功");
   console.error("❌ エラー");
   console.log("📨 データ受信");
   ```

3. **Prisma クエリは型安全に**

   ```typescript
   // ✅ Good - リレーション先も型定義される
   const channel = await prisma.channel.findUnique({
     where: { id: channelId },
     include: {
       members: { include: { user: true } },
       messages: { include: { sender: true } },
     },
   });

   // ❌ Bad - 型が不完全
   const channel = await prisma.channel.findUnique({
     where: { id: channelId },
   });
   ```

### 新しいチャンネル/DM ページ追加時

チャット機能を持つページを新規作成する場合の手順：

1. **useRealtimeMessages フックを使用**

   ```typescript
   const { messages, addMessage } = useRealtimeMessages({
     channelId,
     initialMessages,
   });
   ```

2. **初期メッセージは SSR で取得**

   ```typescript
   // ページコンポーネント内
   const response = await fetch(`/api/messages/${channelId}`);
   const initialMessages = await response.json();
   ```

   **理由**: SEO 対策 + 初回読み込み高速化

3. **channelId 変更時にメッセージをリセット**

   ```typescript
   useEffect(() => {
     setMessages(initialMessages);
   }, [channelId]); // channelId が変わったら再設定
   ```

4. **クリーンアップ関数で必ず Unsubscribe**

   ```typescript
   useEffect(() => {
     const channel = supabase.channel("...");
     channel.subscribe();

     return () => {
       supabase.removeChannel(channel); // 必須
     };
   }, [channelId]);
   ```

### API ルート追加時

新しい API エンドポイントを作成する場合：

1. **Next.js 15 形式で params を await**

   ```typescript
   export async function GET(
     request: Request,
     context: { params: Promise<{ id: string }> }
   ) {
     const { id } = await context.params;
     // ...
   }
   ```

2. **Prisma クライアントは共通インスタンスを使用**

   ```typescript
   import { prisma } from "@/lib/prisma";

   const data = await prisma.message.findMany();
   ```

3. **エラーハンドリングで適切なステータスコードを返す**

   ```typescript
   try {
     const data = await prisma.message.create({...});
     return NextResponse.json({ success: true, data });
   } catch (error) {
     console.error('❌ エラー:', error);
     return NextResponse.json(
       { success: false, error: 'メッセージの作成に失敗しました' },
       { status: 500 }
     );
   }
   ```

4. **認証が必要な場合は Supabase ユーザー取得**

   ```typescript
   import { createClient } from "@/lib/supabase/server";

   const supabase = await createClient();
   const {
     data: { user },
     error,
   } = await supabase.auth.getUser();

   if (error || !user) {
     return NextResponse.json(
       { success: false, error: "認証が必要です" },
       { status: 401 }
     );
   }
   ```

### 新しい UI コンポーネント追加時

shadcn/ui を使用する場合：

```bash
# shadcn/ui コンポーネントをインストール
npx shadcn@latest add <component-name>
# 例: npx shadcn@latest add toast
```

カスタムコンポーネントを作成する場合：

```typescript
/**
 * コンポーネント名: メッセージカード
 *
 * 用途: チャット画面でメッセージを1件表示するためのカード
 *
 * Props:
 * - message: メッセージオブジェクト（送信者、内容、日時を含む）
 * - isOwnMessage: 自分が送信したメッセージかどうか（右寄せ/左寄せを切り替える）
 */
export function MessageCard({ message, isOwnMessage }: MessageCardProps) {
  // ...
}
```

## Reference Repository

参考プロジェクト: `/Users/Uni/Uni_MacBookAir/STUDYing/卒業制作‐チャットアプリ/【見本】GitHubからダウンロード/studying-tech-chat-app-main`

**注意**: 参考にしているが、このプロジェクトは独自の実装・改善を含みます。完全なコピーではありません。

## Completed Features (完成済み機能)

### 認証システム

- ✅ Supabase Auth によるメール認証
- ✅ ログイン・サインアップ画面
- ✅ セッション管理（ミドルウェア）
- ✅ Supabase ↔ Prisma の連携（authId フィールド）

### リアルタイムチャット

- ✅ チャンネルチャット
- ✅ ダイレクトメッセージ (1 対 1)
- ✅ Supabase Realtime による即時配信
- ✅ 楽観的更新（送信者側）
- ✅ マルチタブ同期

### UI/UX

- ✅ レスポンシブデザイン（デスクトップ・モバイル対応）
- ✅ サイドバー（チャンネル一覧・DM 一覧）
- ✅ ユーザープロフィール表示
- ✅ ログアウト機能

### データベース

- ✅ Prisma ORM 完全統合
- ✅ PostgreSQL (Supabase) 接続
- ✅ リレーション設定（User, Channel, Message, ChannelMember）
- ✅ Cascade 削除設定

## Next Tasks (次のタスク)

優先順位順に記載（詳細は CONTEXT*HANDOVER*\*.md を参照）:

1. **UI/UX 改善**

   - メッセージ送信時のローディング状態
   - エラーハンドリング向上
   - タイムスタンプ表示改善
   - 既読・未読状態表示

2. **追加機能**

   - ファイル共有（画像・文書アップロード）
   - スレッド機能（メッセージへの返信）
   - 検索機能（メッセージ・ユーザー検索）
   - チャンネル管理（作成・編集・削除）

3. **パフォーマンス最適化**
   - SWR 導入（キャッシュ・自動再検証）
   - 仮想スクロール（大量メッセージ対応）
   - 画像遅延読み込み
