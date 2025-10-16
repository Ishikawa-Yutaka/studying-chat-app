# コンテキスト引き継ぎ文書 #4

**日付**: 2025年10月16日
**前回の引き継ぎ**: CONTEXT_HANDOVER_3.md

---

## 目的

卒業制作としてチャットアプリを作成中。今回のセッションでは、データベース接続問題（IPv4/IPv6）とDM遷移エラー（authId問題）を解決しました。

---

## 技術スタック

- **フレームワーク**: Next.js 15.5.4, React 19
- **言語**: TypeScript
- **データベース**: Prisma + PostgreSQL (Supabase)
- **認証**: Supabase Auth
- **リアルタイム通信**: Supabase Realtime (WebSocket)
- **UI**: shadcn/ui + TailwindCSS 4
- **状態管理**: 将来的に Zustand 予定
- **AI 機能**: OpenAI API（未実装）

---

## 今回のセッションで実施した作業

### 1. IPv4/IPv6データベース接続問題の解決（完了）

#### 問題
- 開発サーバー起動後、すべてのAPI呼び出しで500エラー
- エラーメッセージ: `Can't reach database server at db.zguiaxekvkmsdxskixcs.supabase.co:5432`
- Supabaseプロジェクトは稼働中だが接続できない

#### 原因
- `.env.local` と `.env` で **IPv6専用のDirect Connection** を使用していた
- ホスト名: `db.zguiaxekvkmsdxskixcs.supabase.co`（IPv6のみ）
- 開発環境のネットワークは **IPv4のみ** に対応
- IPv4からIPv6への接続ができず、エラーが発生

#### 解決策
**Transaction Pooler（IPv4/IPv6両対応）に変更**

修正した設定:
```bash
# 修正前（IPv6専用）
DATABASE_URL=postgresql://...@db.zguiaxekvkmsdxskixcs.supabase.co:5432/postgres

# 修正後（IPv4対応）
DATABASE_URL=postgresql://...@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**変更点**:
- ホスト名: `db.xxx.supabase.co` → `aws-1-ap-northeast-1.pooler.supabase.com`
- DATABASE_URL ポート: `5432` → `6543` (Transaction pooler)
- DATABASE_URL 末尾に `?pgbouncer=true` を追加（Prepared Statement無効化）

**修正したファイル**:
- `.env.local`
- `.env`

**追加の問題と解決**:
- Transaction pooler使用時、`?pgbouncer=true` が不足していたため Prepared Statement 衝突エラーが発生
- `?pgbouncer=true` を追加して解決

---

### 2. DM遷移エラーの修正（完了）

#### 問題
- **ユーザー管理からのDM作成**: ✅ 正常動作
- **DM一覧からユーザークリック**: ❌ 「DMの初期化に失敗しました」エラー
- ブラウザコンソールに404エラー: `GET /api/dm/cmgpu3fri000cj01jb8tig9oy 404`

#### 原因
**APIレスポンスでPrisma内部IDを返していた**

- DM一覧は `/api/channels` から取得した `partnerId` を使用
- `/api/channels` が `partnerId: partner.user.id`（Prisma内部ID）を返していた
- DMページは **Supabase AuthID** を期待しているため、404エラーが発生

**なぜユーザー管理からは動作したのか？**
- ユーザー管理コンポーネントは `authId` を直接渡していた
- そのため、一方は動作し、もう一方は失敗していた

#### 解決策
**全APIで `authId` を返すように統一**

**影響を受けていたAPI**:
1. `src/app/api/channels/route.ts`
2. `src/app/api/dashboard/route.ts`
3. `src/app/api/debug/dashboard/route.ts`

**修正内容**:
```typescript
// 1. user selectに authId を追加
user: {
  select: {
    id: true,
    name: true,
    email: true,
    authId: true  // ✅ 追加
  }
}

// 2. partnerId を authId に変更
directMessages.push({
  id: channel.id,
  partnerId: partner.user.authId,  // ✅ Supabase AuthID を使用
  partnerName: partner.user.name,
  partnerEmail: partner.user.email
});
```

---

### 3. トラブルシューティングドキュメントの作成・更新（完了）

#### 新規作成
**`troubleshooting/DATABASE_CONNECTION_IPV4_ERROR.md`**

内容:
- IPv4/IPv6互換性問題の詳細
- Direct Connection vs Transaction/Session Pooler の違い
- Pooler（接続プール）の仕組み
- `?pgbouncer=true` の役割
- 今後の予防策

#### 更新
**`troubleshooting/SUPABASE_AUTH_INTEGRATION.md`**

追加内容:
- 問題3: DM一覧からの遷移で404エラー（partnerId問題）
- APIレスポンスで authId を返す重要性
- 修正したファイル一覧
- コーディングルールとチェックリスト

---

## 実装済み機能

### 完了している機能

1. **Supabase認証システム完全統合**
   - ログイン・ログアウト・セッション管理
   - Supabase と Prisma のユーザー ID 連携
   - 認証ミドルウェア・アクセス制御

2. **リアルタイムチャット**
   - チャンネルチャット
   - ダイレクトメッセージ (1対1)
   - Supabase Realtime による即時配信
   - 楽観的更新（送信者側）
   - マルチタブ同期

3. **ユーザー管理機能**
   - サイドバーにユーザー一覧表示
   - ユーザー検索機能
   - DM作成機能（完全動作 ✅）
   - チャンネル招待機能

4. **DM機能**
   - DM作成・検索ロジック（完全動作 ✅）
   - DMページへの遷移（ユーザー管理・DM一覧両方から動作 ✅）
   - DM一覧表示

5. **データベース接続**
   - IPv4/IPv6両対応のTransaction Pooler使用 ✅
   - Prepared Statement衝突回避 ✅

---

## 重要なファイル構成

### 今回修正したファイル

```
.env                                          # Prisma CLI用環境変数
.env.local                                    # Next.js用環境変数
src/app/api/channels/route.ts                # チャンネル・DM一覧取得API
src/app/api/dashboard/route.ts               # ダッシュボード統計API
src/app/api/debug/dashboard/route.ts         # デバッグ用API
troubleshooting/DATABASE_CONNECTION_IPV4_ERROR.md   # 新規作成
troubleshooting/SUPABASE_AUTH_INTEGRATION.md        # 更新
CLAUDE.md                                     # プロジェクト指示書（新規作成）
CONTEXT_HANDOVER_3.md                         # 前回の引き継ぎ
```

---

## 現在のデータ状態

### データベース接続設定

**正しい設定** (`.env` と `.env.local` 両方):
```bash
# Transaction pooler（API用・IPv4対応）
DATABASE_URL=postgresql://postgres.zguiaxekvkmsdxskixcs:NAc9NdS%40YufyD%403@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Session pooler（マイグレーション用・IPv4対応）
DIRECT_URL=postgresql://postgres.zguiaxekvkmsdxskixcs:NAc9NdS%40YufyD%403@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

### ユーザー情報

```json
{
  "allUsers": [
    { "name": "田中太郎", "authId": "auth_tanaka_123" },
    { "name": "佐藤花子", "authId": "auth_sato_123" },
    { "name": "鈴木一郎", "authId": "auth_suzuki_123" },
    { "name": "石川 裕", "authId": "240ddd9e-c69c-4b62-b9f2-73e3f384ea90" }
  ]
}
```

### チャンネル・DM状態

- チャンネル数: 3個（一般、テスト、開発）
- DM数: 複数作成可能（機能完全動作）
- メッセージ数: 16個以上
- 全ユーザー数: 4人

---

## 学んだ重要な教訓

### 1. IPv4/IPv6互換性問題

**教訓**: ネットワーク環境に応じた接続方式の選択が重要

| 接続方式 | ホスト名 | ポート | IPv4対応 | IPv6対応 | 推奨用途 |
|---------|---------|--------|---------|---------|---------|
| **Direct Connection** | `db.xxx.supabase.co` | 5432 | ❌ | ✅ | 長時間接続（VM、コンテナ） |
| **Transaction Pooler** | `aws-x-xxx.pooler.supabase.com` | 6543 | ✅ | ✅ | Serverless、短時間接続 |
| **Session Pooler** | `aws-x-xxx.pooler.supabase.com` | 5432 | ✅ | ✅ | マイグレーション、長時間処理 |

**Next.js環境では Transaction Pooler（ポート6543）が最適**

### 2. Prepared Statement問題

**教訓**: Transaction Pooler使用時は必ず `?pgbouncer=true` を付ける

**なぜ必要？**
- Transaction Poolerは各トランザクションごとに接続を切り替える
- Prepared Statementが異なる接続間で共有されると衝突する
- `?pgbouncer=true` で Prepared Statement を無効化

### 3. AuthID vs 内部ID問題（繰り返し発生）

**教訓**: 外部に返すユーザーIDは必ず `authId` を使用

**2種類のIDの使い分け**:
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

// ✅ Good - 内部Prismaクエリ
await prisma.channelMember.findMany({
  where: { userId: user.id } // Prisma内部IDを使用
});
```

**今後のチェックリスト**:
- [ ] 新しいAPIを作成する際、レスポンスに `user.id` が含まれていないか確認
- [ ] `partnerId`, `userId`, `senderId` などは必ず `authId` を使用
- [ ] Prisma selectで `authId: true` を含めているか確認

---

## 次のアクション（優先度順）

### 優先度：高

1. **チャンネル作成機能**
   - ユーザーが新しいチャンネルを作成できる機能
   - UI: モーダルダイアログ
   - API: `/api/channels` POST メソッド

2. **メッセージ削除・編集機能**
   - 自分のメッセージの削除・編集
   - UI: メッセージのホバーメニュー
   - API: `/api/messages/[messageId]` PATCH/DELETE メソッド

### 優先度：中

3. **AI統合機能**
   - OpenAI APIの統合
   - AIボットとの会話機能
   - チャンネル内でのAI利用

4. **スレッド機能**
   - メッセージへの返信スレッド
   - スレッド表示UI

### 優先度：低

5. **通知機能**
   - 新規メッセージ通知
   - メンション通知

6. **ファイル共有機能**
   - 画像・ファイルのアップロード
   - プレビュー表示

---

## 技術的な注意点

### ID管理の仕組み（再確認）

- **Supabase の AuthID**: 認証・フロントエンド用（例: `240ddd9e-c69c-4b62-b9f2-73e3f384ea90`）
- **Prisma の ID**: データベース内部リレーション用（例: `cmgpuhl8g001qj01jq8eg3iny`）
- **authId フィールド**: 2つのシステムを繋ぐ橋渡し

### API認証統合パターン

```typescript
// 必須パターン：SupabaseのauthIdからPrisma内部IDに変換
const user = await prisma.user.findFirst({
  where: { authId: userIdFromSupabase }
});

if (!user) {
  return NextResponse.json({
    success: false,
    error: 'ユーザーが見つかりません'
  }, { status: 404 });
}

// 以降は user.id (Prisma内部ID) を使用
```

### データベース接続設定の確認

**両方のファイルを統一**:
- `.env.local`: Next.jsアプリ実行時（`npm run dev`）に使用
- `.env`: Prisma CLIコマンド（`npx prisma migrate`など）に使用

**必須項目**:
- ホスト名: `aws-1-ap-northeast-1.pooler.supabase.com`
- DATABASE_URL ポート: `6543`
- DATABASE_URL 末尾: `?pgbouncer=true`
- DIRECT_URL ポート: `5432`

---

## 既知の問題・制限事項

**現在問題なし**

前回の主要な問題（Prismaエンジンエラー、DM作成エラー、IPv4接続エラー、AuthID問題）は完全に解決済み。

---

## トラブルシューティングドキュメント

以下のドキュメントが利用可能:

1. `troubleshooting/INFINITE_LOOP_TROUBLESHOOTING.md` - React useEffect 無限ループ
2. `troubleshooting/REALTIME_TROUBLESHOOTING.md` - Supabase Realtime 設定
3. `troubleshooting/SUPABASE_AUTH_INTEGRATION.md` - 認証統合（問題3まで記載）
4. `troubleshooting/DM_CREATION_ERROR.md` - DM作成エラー
5. `troubleshooting/DATABASE_CONNECTION_IPV4_ERROR.md` - IPv4接続問題（新規作成）

---

## GitHubリポジトリ情報

- **リポジトリ**: https://github.com/Ishikawa-Yutaka/studying-chat-app
- **最新コミット**: `a7fe925` - "fix: DM遷移エラーとIPv4データベース接続問題を修正"
- **ブランチ**: main

### 最新のコミット内容

```
9ファイル変更
1689行追加、309行削除

主な変更:
- IPv4/IPv6接続問題の解決（Transaction Pooler使用）
- DM遷移エラーの修正（authId統一）
- データベース接続設定の修正（.env, .env.local）
- トラブルシューティングドキュメント作成・更新
- プロジェクト指示書（CLAUDE.md）追加
```

---

## 次のセッションで確認すべきこと

1. **データベース接続の安定性**
   - 長時間使用しても接続エラーが出ないか
   - 複数のAPIを同時に呼び出しても問題ないか

2. **DM機能の動作確認**
   - ユーザー管理からのDM作成
   - DM一覧からのDM遷移
   - 両方のルートで正常に動作するか

3. **次の機能実装の準備**
   - チャンネル作成機能の設計
   - 必要なUIコンポーネントの確認

---

## プロジェクト指示書

`CLAUDE.md` に以下の内容を記載:
- プロジェクト概要
- コミュニケーションスタイル（初心者向け）
- 開発コマンド
- アーキテクチャ詳細
- トラブルシューティング
- 開発ガイドライン

**重要**: 新しいセッションでは必ず `CLAUDE.md` を参照してください。

---

**次のセッションでは、チャンネル作成機能の実装から開始することを推奨します。**
