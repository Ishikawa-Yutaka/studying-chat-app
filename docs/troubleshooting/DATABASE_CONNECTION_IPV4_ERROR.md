# データベース接続エラー: IPv4/IPv6互換性問題

**作成日**: 2025年10月16日
**問題**: `Can't reach database server at db.zguiaxekvkmsdxskixcs.supabase.co:5432`

---

## 目次
1. [発生したエラー](#発生したエラー)
2. [エラーの原因](#エラーの原因)
3. [解決方法](#解決方法)
4. [技術的な背景](#技術的な背景)
5. [今後の予防策](#今後の予防策)

---

## 発生したエラー

### エラーメッセージ

```
❌ ダッシュボード統計取得エラー: Error [PrismaClientInitializationError]:
Invalid `prisma.user.findFirst()` invocation:

Can't reach database server at `db.zguiaxekvkmsdxskixcs.supabase.co:5432`

Please make sure your database server is running at `db.zguiaxekvkmsdxskixcs.supabase.co:5432`.
```

### 症状

- 開発サーバー（`npm run dev`）起動後、すべてのAPI呼び出しが500エラー
- `/api/dashboard`、`/api/channels`、`/api/users` などすべて失敗
- ブラウザでは「データの取得に失敗しました」と表示
- Supabaseプロジェクトは稼働中（一時停止していない）

---

## エラーの原因

### 根本原因: IPv4/IPv6の互換性問題

`.env.local` と `.env` ファイルで使用していた接続文字列が、**IPv6専用**のDirect Connectionになっていました。

#### 問題のあった設定

```bash
# ❌ IPv6専用（接続できない）
DATABASE_URL=postgresql://postgres.xxx@db.zguiaxekvkmsdxskixcs.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres.xxx@db.zguiaxekvkmsdxskixcs.supabase.co:5432/postgres
```

**なぜ接続できなかったのか**:
- ホスト名 `db.zguiaxekvkmsdxskixcs.supabase.co` はIPv6専用
- 開発環境のネットワークがIPv4のみに対応
- IPv4からIPv6への接続ができず、エラーが発生

#### 確認方法

以下のコマンドでIPv6ホストに接続できるか確認できます：

```bash
curl -I https://db.zguiaxekvkmsdxskixcs.supabase.co:5432

# IPv4環境の場合、以下のエラーが出る
# curl: (6) Could not resolve host: db.zguiaxekvkmsdxskixcs.supabase.co
```

---

## 解決方法

### ステップ1: Supabaseダッシュボードで正しい接続文字列を取得

1. Supabaseプロジェクトのダッシュボードにアクセス
   ```
   https://supabase.com/dashboard/project/zguiaxekvkmsdxskixcs
   ```

2. 画面右上の **「Connect」** ボタンをクリック

3. 接続方式を選択：
   - **Transaction pooler** を選択（推奨）
   - または **Session pooler** を選択

4. 表示される接続文字列をコピー

#### Transaction pooler の接続文字列（推奨）

```
postgresql://postgres.zguiaxekvkmsdxskixcs:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

#### Session pooler の接続文字列（マイグレーション用）

```
postgresql://postgres.zguiaxekvkmsdxskixcs:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

---

### ステップ2: `.env.local` を修正

ファイルパス: `/chat-app/.env.local`

```bash
# データベース接続URL（IPv4対応）
# Transaction pooler: Serverless関数・API用（IPv4対応・推奨）
# Session pooler: マイグレーション用（IPv4対応）
DATABASE_URL=postgresql://postgres.zguiaxekvkmsdxskixcs:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.zguiaxekvkmsdxskixcs:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**重要な変更点**:
- ホスト名: `db.xxx.supabase.co` → `aws-1-ap-northeast-1.pooler.supabase.com`
- DATABASE_URL ポート: `5432` → `6543` (Transaction pooler)
- DIRECT_URL ポート: `5432` (Session pooler、変更なし)

---

### ステップ3: `.env` を修正

ファイルパス: `/chat-app/.env`

```bash
# Prisma用のデータベース接続URL（IPv4対応）
# Next.jsは.env.localを優先するが、Prisma CLIは.envを読み込む
# Transaction pooler: ポート6543（API用・推奨）
# Session pooler: ポート5432（マイグレーション用）
DATABASE_URL=postgresql://postgres.zguiaxekvkmsdxskixcs:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.zguiaxekvkmsdxskixcs:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**なぜ `.env` も必要？**:
- `.env.local`: Next.jsアプリ実行時（`npm run dev`）に使用
- `.env`: Prisma CLIコマンド（`npx prisma migrate`など）に使用

---

### ステップ4: Prisma Clientの再生成

```bash
npx prisma generate
```

---

### ステップ5: 開発サーバーを再起動

```bash
# 現在のサーバーを停止（Ctrl+C）
# その後、再起動
npm run dev
```

---

### ステップ6: 動作確認

ブラウザで以下にアクセスして、エラーが出ないことを確認：

```
http://localhost:3000/workspace
```

**期待されるログ（成功）**:
```
✅ ダッシュボード統計取得成功
✅ チャンネル一覧取得成功
GET /api/channels?userId=... 200 in ...ms
GET /api/dashboard?userId=... 200 in ...ms
```

---

## 技術的な背景

### Supabaseの接続方式の違い

| 接続方式 | ホスト名 | ポート | IPv4対応 | IPv6対応 | 推奨用途 |
|---------|---------|--------|---------|---------|---------|
| **Direct Connection** | `db.xxx.supabase.co` | 5432 | ❌ | ✅ | 長時間接続（VM、コンテナ） |
| **Transaction Pooler** | `aws-x-xxx.pooler.supabase.com` | 6543 | ✅ | ✅ | Serverless、短時間接続 |
| **Session Pooler** | `aws-x-xxx.pooler.supabase.com` | 5432 | ✅ | ✅ | マイグレーション、長時間処理 |

---

### Transaction Pooler の特徴

Supabaseの説明文より：
> **"Ideal for stateless applications like serverless functions where each interaction with Postgres is brief and isolated."**

**日本語訳**:
「サーバーレス関数のようなステートレスなアプリケーションに最適。各データベース操作が短時間で独立している場合に適している。」

**なぜNext.jsに最適？**:
- Next.js API RoutesはServerless Functionとして動作（特にVercel等にデプロイした場合）
- 各APIリクエストは独立している（ステートレス）
- 接続が短時間で終わる

**利点**:
1. **接続数の効率化**: 複数のクライアントで接続プールを共有
2. **IPv4対応**: あらゆるネットワーク環境で動作
3. **高速**: 短時間の接続に最適化

---

### Pooler（プーラー）とは？

**Pooler** = **接続プール（Connection Pool）を管理するシステム**

#### 接続プールの仕組み

**接続プールなし（非効率）**:
```
ユーザー1 → 新規接続作成 → クエリ実行 → 接続を閉じる
ユーザー2 → 新規接続作成 → クエリ実行 → 接続を閉じる
（毎回接続を作り直す = 遅い）
```

**接続プールあり（効率的）**:
```
[接続プール]
  ├── 接続1 🔌（待機中）
  ├── 接続2 🔌（待機中）
  └── 接続3 🔌（待機中）

ユーザー1 → プールから接続1を借りる → クエリ実行 → 返却
ユーザー2 → プールから接続1を借りる（再利用！） → クエリ実行 → 返却
```

**Supabase Poolerの役割**:
```
[100人のユーザー]
    ↓
[Supabase Pooler] 🏊 （接続を管理）
    ↓ （実際は15個の接続だけ使う）
[PostgreSQL Database]
```

100人のリクエストを、たった15個の接続で捌けるようになります。

---

### IPv4 vs IPv6

| 項目 | IPv4 | IPv6 |
|------|------|------|
| **アドレス例** | `192.168.1.1` | `2001:0db8:85a3::8a2e:0370:7334` |
| **アドレス数** | 約43億個 | ほぼ無限 |
| **普及率** | 100%（すべてのネットワークで利用可能） | 一部のネットワークのみ |
| **Supabase Direct** | ❌ 非対応 | ✅ 対応 |
| **Supabase Pooler** | ✅ 対応 | ✅ 対応 |

**開発環境での注意点**:
- 家庭用Wi-Fiや大学のネットワークの多くはIPv4のみ
- IPv6専用のサービス（Supabase Direct Connection）には接続できない
- Poolerを使えばIPv4でも接続可能（無料でプロキシ提供）

---

## 今後の予防策

### 1. 接続文字列をコピーする際の注意

Supabaseダッシュボードの「Connect」ボタンから接続文字列をコピーする際：

✅ **推奨**: Transaction pooler または Session pooler を選択
❌ **非推奨**: Direct connection（IPv6が必要な環境でのみ使用）

---

### 2. 接続方式の選択基準

| 環境 | 推奨する接続方式 |
|------|---------------|
| **開発環境（ローカル）** | Transaction pooler（IPv4対応） |
| **本番環境（Vercel）** | Transaction pooler（Serverless最適化） |
| **長時間接続が必要** | Session pooler |
| **IPv6対応ネットワーク** | Direct connection（オプション） |

---

### 3. 環境変数の管理

#### 両方のファイルを更新する

接続文字列を変更する場合は、以下の**両方**を更新してください：

1. `.env.local` （Next.jsアプリ用）
2. `.env` （Prisma CLI用）

#### 使用される場面

| ファイル | 使用される場面 | 優先度 |
|---------|--------------|-------|
| **`.env.local`** | `npm run dev` でアプリ実行時 | 🥇 最優先 |
| **`.env`** | `npx prisma migrate dev` などPrisma CLI実行時 | 🥈 次点 |

---

### 4. 接続テストコマンド

環境変数を変更した後は、以下のコマンドで接続をテストできます：

```bash
# データベース接続テスト
npx prisma db pull

# 成功すれば以下のメッセージが表示される
# ✔ Introspected 5 models and wrote them into prisma/schema.prisma
```

---

## まとめ

### 問題
- `.env.local` と `.env` がIPv6専用のDirect Connectionを使用していた
- 開発環境はIPv4のみ対応のため、接続できなかった

### 解決策
- IPv4/IPv6両対応のTransaction Poolerに変更
- ホスト名を `pooler.supabase.com` に変更
- ポート番号を6543（Transaction）と5432（Session）に設定

### 学んだこと
1. Supabaseには3種類の接続方式がある（Direct、Transaction、Session）
2. IPv4環境ではPoolerを使う必要がある
3. Next.js（Serverless）にはTransaction poolerが最適
4. `.env.local` と `.env` の両方を更新する必要がある

### 今後の対策
- 接続文字列をコピーする際は、必ず「Transaction pooler」を選択する
- IPv4/IPv6の互換性を意識する
- 環境変数変更後は必ず接続テストを実行する

---

**参考リンク**:
- Supabase Connection Pooling: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- Prisma Connection Management: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
