# Next.js ビルドキャッシュエラー トラブルシューティング

このドキュメントは、Next.js のビルドキャッシュが原因で発生するエラーとその解決方法をまとめたものです。

## 目次

1. [エラーの概要](#エラーの概要)
2. [根本原因](#根本原因)
3. [エラーメッセージ例](#エラーメッセージ例)
4. [解決方法](#解決方法)
5. [ビルドキャッシュの仕組み](#ビルドキャッシュの仕組み)
6. [予防策とベストプラクティス](#予防策とベストプラクティス)

## エラーの概要

### エラーメッセージ

```
TypeError: Cannot read properties of undefined (reading 'call')
    at eval (webpack-internal:///(rsc)/./src/lib/supabase/server.ts:5:71)

Failed to load resource: the server responded with a status of 500 (Internal Server Error)

SyntaxError: Failed to execute 'json' on 'Response': Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

### 症状

- **API が 500 エラーを返す**: `/api/messages/[channelId]`, `/api/channel/[channelId]` など
- **ページが読み込めない**: チャンネルや DM ページで「データ取得エラー」が表示される
- **ブラウザコンソールにエラー**: JSON パースエラー、undefined エラーが大量に出力される
- **サーバーログにエラー**: Webpack の internal エラーが表示される

### 発生タイミング

- **大規模な型定義変更後**: 複数ファイルで TypeScript の型を変更した場合
- **依存関係の更新後**: `npm install` や `package.json` を変更した場合
- **Next.js の設定変更後**: `next.config.js` を変更した場合
- **Prisma スキーマ変更後**: データベーススキーマを大きく変更した場合

## 根本原因

### ビルドキャッシュの不整合

Next.js は `.next/` ディレクトリにビルド結果をキャッシュします。これにより、2回目以降のビルドが高速化されます。

```
【通常のビルドフロー】
1. TypeScript → JavaScript にコンパイル
2. コンパイル結果を .next/ に保存（キャッシュ）
3. 次回ビルド時、変更されたファイルだけコンパイル
4. 変更されていないファイルはキャッシュから読み込む

【問題が発生するケース】
1. types/workspace.ts を変更（sender: User → User | null）
2. 複数のファイル（page.tsx, messageView.tsx など）で型を変更
3. キャッシュに古い型情報と新しい型情報が混在
4. Webpack が「どっちが正しいの？」と混乱
5. エラー発生
```

### Webpack のモジュール解決エラー

Webpack は依存関係を解決する際、キャッシュされた情報を使用します。型定義が変わった場合、キャッシュ内の依存関係が古いままになり、モジュールが正しくロードできなくなります。

## エラーメッセージ例

### 1. Webpack Internal Error

```
TypeError: Cannot read properties of undefined (reading 'call')
    at eval (webpack-internal:///(rsc)/./src/lib/supabase/server.ts:5:71)
    at <unknown> (rsc)/./src/lib/supabase/server.ts (/path/to/.next/server/app/api/messages/[channelId]/route.js:76:1)
```

**説明**: Webpack がモジュールをロードする際、キャッシュされた依存関係情報が不正なため、関数呼び出しに失敗しています。

### 2. API 500 エラー

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
:3000/api/messages/cmgpuhlij001tj01jbwhiohm7:1
```

**説明**: API ルートがビルドエラーにより正常に動作せず、500 エラーを返しています。

### 3. JSON パースエラー

```
SyntaxError: Failed to execute 'json' on 'Response': Unexpected token '<', "<!DOCTYPE "... is not valid JSON
    at ChannelPage.useEffect.initData (page.tsx:122:51)
```

**説明**: API が JSON ではなく HTML エラーページを返しているため、クライアント側で JSON パースに失敗しています。

## 解決方法

### 方法1: ビルドキャッシュを削除して再起動（推奨）

```bash
# 開発サーバーを停止（Ctrl+C）
# キャッシュを削除して再起動
rm -rf .next && npm run dev
```

**説明**:
- `rm -rf .next`: `.next` ディレクトリ（ビルドキャッシュ）を完全削除
- `npm run dev`: 開発サーバーを起動（自動的にクリーンビルドされる）

### 方法2: 段階的に実行

```bash
# ステップ1: 開発サーバーを停止
# ターミナルで Ctrl+C を押す

# ステップ2: ビルドキャッシュを削除
rm -rf .next

# ステップ3: 開発サーバーを再起動
npm run dev
```

### 方法3: node_modules も削除（重度のエラーの場合）

```bash
# 開発サーバーを停止（Ctrl+C）

# すべてのキャッシュと依存関係を削除
rm -rf .next node_modules package-lock.json

# 依存関係を再インストール
npm install

# 開発サーバーを起動
npm run dev
```

**注意**: この方法は時間がかかるため、通常は方法1で十分です。

## ビルドキャッシュの仕組み

### キャッシュの役割

```
【キャッシュなし】
毎回すべてのファイルをコンパイル
→ 初回: 10秒
→ 2回目: 10秒
→ 3回目: 10秒

【キャッシュあり】
変更されたファイルだけコンパイル
→ 初回: 10秒
→ 2回目: 1秒（90%高速化）
→ 3回目: 1秒
```

### .next/ ディレクトリの構造

```
.next/
├── cache/                  # Webpack のビルドキャッシュ
├── server/                 # サーバーサイドのビルド結果
│   ├── app/               # App Router のページ
│   └── chunks/            # 共通モジュール
├── static/                # 静的ファイル
└── types/                 # 型定義ファイル
```

### キャッシュが壊れる原因

1. **型定義の大規模変更**
   - 複数ファイルで interface や type を変更
   - 依存関係が複雑に絡み合っている場合

2. **依存関係の更新**
   - `package.json` の依存パッケージを更新
   - 新しいパッケージをインストール

3. **設定ファイルの変更**
   - `next.config.js` を変更
   - `tsconfig.json` を変更

4. **Git ブランチの切り替え**
   - 異なるブランチで大きな変更があった場合
   - マージ後にキャッシュが不整合になることがある

## 予防策とベストプラクティス

### 1. 型定義変更後はキャッシュをクリア

大規模な型定義変更を行った場合は、すぐにキャッシュをクリアすることで問題を予防できます。

```bash
# 型定義を変更したら
rm -rf .next && npm run dev
```

### 2. Git の .gitignore に .next を追加

`.next/` ディレクトリは Git で管理しないようにします（通常は自動的に追加されています）。

```.gitignore
# next.js
/.next/
/out/
```

### 3. CI/CD では必ずクリーンビルド

GitHub Actions などの CI/CD では、毎回クリーンビルドを実行します。

```yaml
# GitHub Actions の例
- name: Build
  run: |
    rm -rf .next
    npm run build
```

### 4. 依存関係更新後はキャッシュをクリア

```bash
# 依存関係を更新した後
npm install
rm -rf .next
npm run dev
```

### 5. ブランチ切り替え後の確認

```bash
# ブランチを切り替えた後
git checkout feature-branch
rm -rf .next
npm run dev
```

### 6. エラーが出たらまずキャッシュクリア

原因不明のビルドエラーが発生した場合、まずキャッシュをクリアしてみることが最も効果的な対処法です。

```bash
# エラーが出たら
rm -rf .next && npm run dev
```

## よくある質問

### Q1: キャッシュを削除するとデータは消えますか？

**A**: いいえ、消えません。`.next/` はビルド結果のキャッシュであり、データベースやソースコードには影響しません。

### Q2: 毎回キャッシュを削除する必要がありますか？

**A**: いいえ、通常は不要です。以下の場合のみ削除してください：
- 大規模な型定義変更
- 依存関係の更新
- 原因不明のビルドエラー

### Q3: プロダクションビルドでもキャッシュエラーが起きますか？

**A**: はい、起きる可能性があります。プロダクションビルド前は必ず `.next/` を削除してください。

```bash
# プロダクションビルド
rm -rf .next
npm run build
npm run start
```

### Q4: VS Code でキャッシュを削除するには？

**A**: VS Code のターミナルで同じコマンドを実行します。

```bash
# VS Code のターミナルで
rm -rf .next && npm run dev
```

## 関連ドキュメント

- [INFINITE_LOOP_TROUBLESHOOTING.md](./INFINITE_LOOP_TROUBLESHOOTING.md) - React useEffect 無限ループエラー
- [REALTIME_TROUBLESHOOTING.md](./REALTIME_TROUBLESHOOTING.md) - Supabase Realtime 接続エラー
- [PRISMA_MIGRATION_DRIFT_ERROR.md](./PRISMA_MIGRATION_DRIFT_ERROR.md) - Prisma マイグレーションエラー

## まとめ

- **ビルドキャッシュエラーは `.next/` ディレクトリの不整合が原因**
- **解決方法は `rm -rf .next && npm run dev`**
- **大規模な型定義変更後は必ずキャッシュをクリア**
- **データは消えないので安心して削除できる**
- **原因不明のエラーが出たらまずキャッシュクリア**
