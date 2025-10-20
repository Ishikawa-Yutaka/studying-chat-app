# Prismaマイグレーション管理の構築

## 問題の概要

Prismaでマイグレーションを実行しようとすると以下のエラーが発生する：

```
Drift detected: Your database schema is not in sync with your migration history.
```

または

```
We need to reset the "public" schema
```

## 症状

### 発生するエラーメッセージ

```bash
$ npx prisma migrate dev --name add_user_avatar_url

Drift detected: Your database schema is not in sync with your migration history.

The following is a summary of the differences between the expected database schema
given your migrations files, and the actual schema of the database.

[+] Added tables
  - User
  - Channel
  - Message
  ...

We need to reset the "public" schema at "xxx.pooler.supabase.com:5432"
```

### 補足症状

- `prisma/migrations/` フォルダーが存在しない
- データベースにはテーブルが既に存在している
- `npx prisma db push` も失敗する場合がある

---

## 原因

### 根本原因

**Prismaのマイグレーション管理が一度も使われていない状態で、データベースにテーブルが既に存在している**

具体的には：
1. データベースに `User`, `Channel`, `Message` などのテーブルが存在
2. Prismaのマイグレーション履歴テーブル（`_prisma_migrations`）が存在しない
3. `prisma/migrations/` フォルダーが存在しない

このため、Prismaが「どうやってこれらのテーブルができたのか？」を把握できず、混乱している状態。

### 発生する状況

- 初期開発で `npx prisma db push` のみを使っていた
- 手動でSQLを実行してテーブルを作成していた
- 別のツール（Supabase UI、pgAdmin等）でテーブルを作成していた
- マイグレーションファイルを削除してしまった

---

## 診断手順

### ステップ1: データベース接続の確認

```bash
# ポート接続テスト
nc -zv your-database-host.supabase.com 5432
```

**期待される結果**: `Connection succeeded!`

### ステップ2: Prismaでの接続テスト

```bash
# test_connection.js を作成
cat > test_connection.js << 'EOF'
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('接続テスト開始...')
  await prisma.$connect()
  console.log('✅ 接続成功')

  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `
  console.log('既存テーブル:', tables.map(t => t.table_name).join(', '))
}

main().finally(() => prisma.$disconnect())
EOF

# 実行
node test_connection.js
rm test_connection.js
```

**期待される結果**: 既存のテーブル一覧が表示される

### ステップ3: マイグレーション履歴テーブルの確認

```bash
cat > check_migrations.js << 'EOF'
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY finished_at DESC;
    `
    console.log('マイグレーション履歴:', migrations)
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ _prisma_migrations テーブルが存在しません')
      console.log('   → ベースラインマイグレーションを作成する必要があります')
    }
  }
}

main().finally(() => prisma.$disconnect())
EOF

node check_migrations.js
rm check_migrations.js
```

**問題がある場合**: `_prisma_migrations テーブルが存在しません` と表示される

---

## 解決方法

### 方法1: ベースラインマイグレーションを作成（推奨）

既存のデータベース構造を記録し、今後のマイグレーション管理を開始します。

#### ステップ1: 現在のスキーマを一時保存

```bash
# avatarUrlなど、未適用の変更があれば一時的に削除
cp prisma/schema.prisma prisma/schema.prisma.backup

# schema.prismaから未適用の変更を削除
# 例: avatarUrl行を削除
sed -i '' '/avatarUrl/d' prisma/schema.prisma
```

#### ステップ2: ベースラインマイグレーションを作成

```bash
# ベースラインマイグレーションフォルダを作成
mkdir -p prisma/migrations/0_init

# 現在のスキーマからSQLを生成
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
```

#### ステップ3: ベースラインを適用済みとしてマーク

```bash
# データベースに _prisma_migrations テーブルを作成し、
# 0_init を「既に適用済み」として記録
npx prisma migrate resolve --applied 0_init
```

**成功メッセージ**: `Migration 0_init marked as applied.`

#### ステップ4: スキーマを元に戻す

```bash
# バックアップから復元
cp prisma/schema.prisma.backup prisma/schema.prisma
rm prisma/schema.prisma.backup
```

または手動で `avatarUrl` などを追加し直す。

#### ステップ5: 新しいマイグレーションを実行

```bash
# 今度は正常に動作します
npx prisma migrate dev --name add_user_avatar_url
```

**期待される結果**:
```
Applying migration `0_init`
Applying migration `20251020020556_add_user_avatar_url`

The following migration(s) have been created and applied from new schema changes:

prisma/migrations/
  └─ 20251020020556_add_user_avatar_url/
    └─ migration.sql

Your database is now in sync with your schema.
```

---

### 方法2: データベースをリセットして再構築（開発環境のみ）

**警告**: この方法は**全データが削除**されます。本番環境では絶対に使用しないでください。

```bash
# データベースをリセット
npx prisma migrate reset

# マイグレーションを再実行
npx prisma migrate dev
```

---

## 検証

### マイグレーションが成功したか確認

```bash
# マイグレーション履歴を確認
ls -la prisma/migrations/

# データベース内のマイグレーション履歴を確認
npx prisma studio
# → _prisma_migrations テーブルを確認
```

### スキーマとDBが同期しているか確認

```bash
# Prisma Clientを再生成
npx prisma generate

# Prisma Studioでテーブル構造を確認
npx prisma studio
# → User テーブルに avatarUrl カラムがあることを確認
```

---

## 今後のマイグレーション実行

ベースラインマイグレーションを作成した後は、通常通りマイグレーションを実行できます：

```bash
# スキーマを変更
# prisma/schema.prisma を編集

# マイグレーションを作成・実行
npx prisma migrate dev --name <migration_name>

# 例
npx prisma migrate dev --name add_user_role
```

---

## トラブルシューティング

### 問題: `Can't reach database server`

**原因**: DIRECT_URLの設定が間違っている、またはネットワーク問題

**解決策**:
1. `.env.local` の `DIRECT_URL` を確認
2. ポート接続テストを実行: `nc -zv <host> 5432`
3. Supabase Dashboardで接続文字列を再確認

### 問題: マイグレーション適用後もPrisma Studioに反映されない

**原因**: ブラウザのキャッシュ

**解決策**:
1. Prisma Studioを再起動
2. ブラウザでスーパーリロード（Cmd+Shift+R / Ctrl+Shift+R）
3. Prisma Clientを再生成: `npx prisma generate`

### 問題: `prisma migrate resolve` が失敗する

**原因**: データベース接続の問題

**解決策**:
1. `DATABASE_URL` ではなく `DIRECT_URL` が使用されているか確認
2. `prisma/schema.prisma` の `datasource` セクションを確認:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")  // これが必要
   }
   ```

---

## ベストプラクティス

### マイグレーション管理の原則

1. **開発初期からマイグレーションを使用**
   - `npx prisma db push` は開発初期のプロトタイピングのみ
   - 本格開発では必ず `npx prisma migrate dev` を使用

2. **マイグレーションファイルを Git で管理**
   - `prisma/migrations/` フォルダーを必ずコミット
   - `.gitignore` に `prisma/migrations/` を追加しない

3. **本番環境へのデプロイ**
   ```bash
   # 本番環境では migrate deploy を使用（データを保持）
   npx prisma migrate deploy
   ```

4. **マイグレーション履歴を削除しない**
   - 一度作成したマイグレーションは削除しない
   - ロールバックが必要な場合は新しいマイグレーションを作成

---

## 関連ドキュメント

- [Prisma公式: 既存DBへのマイグレーション導入](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/add-prisma-migrate-to-a-project)
- [Prisma公式: マイグレーショントラブルシューティング](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/troubleshooting-development)
- `troubleshooting/DATABASE_CONNECTION_IPV4_ERROR.md` - データベース接続エラー

---

## 解決日

2025-01-20

## 関連する GitHub Issue

なし（プロジェクト内部の問題）
