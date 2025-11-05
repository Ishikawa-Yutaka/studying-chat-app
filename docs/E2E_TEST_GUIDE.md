# E2Eテスト実行ガイド

このドキュメントは、E2Eテストの実行手順と修正履歴をまとめたものです。

## 目次

1. [E2Eテストとは](#e2eテストとは)
2. [環境準備](#環境準備)
3. [テスト実行コマンド](#テスト実行コマンド)
4. [初回実行と修正履歴](#初回実行と修正履歴)
5. [トラブルシューティング](#トラブルシューティング)

---

## E2Eテストとは

**E2E (End-to-End)** テストは、ユーザーが実際にアプリを操作する流れを自動化したテストです。

### 具体例

- ユーザーがログインする
- チャンネルをクリックする
- メッセージを入力して送信する
- 他のユーザーの画面にメッセージが表示される

### なぜ必要？

- **バグの早期発見**: コードを変更した時、既存機能が壊れていないか確認
- **手動テストの削減**: ブラウザで何度もクリックする作業を自動化
- **品質保証**: 本番環境にデプロイする前に動作確認

### 使用ツール

- **Playwright**: ブラウザ自動操作ツール
- **Chromium, Firefox, WebKit**: テスト実行用ブラウザ

---

## 環境準備

### 1. Playwrightのインストール

```bash
# Playwrightパッケージをインストール
npm install --save-dev @playwright/test

# ブラウザをインストール
npx playwright install
```

**インストールされるもの**:
- Chromium (Chrome系)
- Firefox
- WebKit (Safari系)

**容量**: 約377 MB
**保存場所**: `/Users/Uni/Library/Caches/ms-playwright/`

### 2. テストユーザーの作成

E2Eテストでは、実際にログインできるユーザーが必要です。

#### Supabase Authにユーザーを作成

1. Supabaseダッシュボードを開く
2. **Authentication → Users** に移動
3. **Add user** をクリック
4. 以下の情報でユーザーを2人作成:

**ユーザー1**:
- Email: `test1@example.com`
- Password: `password123`
- Auto Confirm User: ✅ チェック

**ユーザー2**:
- Email: `test2@example.com`
- Password: `password123`
- Auto Confirm User: ✅ チェック

#### アプリにログインしてPrismaにユーザー情報を作成

Supabase Authだけではメールアドレスしか保存されません。
名前などの情報はPrisma Databaseに保存する必要があります。

1. ブラウザで `http://localhost:3001/login` を開く
2. `test1@example.com` でログイン
3. プロフィールで名前を「テストユーザー1」に設定
4. ログアウト
5. `test2@example.com` でログイン
6. プロフィールで名前を「テストユーザー2」に設定

### 3. 開発サーバーの起動

E2Eテストを実行する前に、開発サーバーが起動している必要があります。

```bash
npm run dev
```

または、ポート3001で起動している場合はそのままでOK。

---

## テスト実行コマンド

### 基本コマンド

```bash
# UIモードで実行（初心者におすすめ）
npm run test:e2e:ui

# 通常実行（ヘッドレスモード）
npm run test:e2e

# ブラウザを表示して実行
npm run test:e2e:headed

# デバッグモード
npm run test:e2e:debug
```

### コマンドの違い

| コマンド | 説明 | 用途 |
|---------|------|------|
| `test:e2e:ui` | Playwright UIツールが開く | テスト開発・デバッグ |
| `test:e2e` | ヘッドレスモード（速い） | CI/CD、通常実行 |
| `test:e2e:headed` | ブラウザが見える | 動作確認 |
| `test:e2e:debug` | ステップ実行可能 | 詳細デバッグ |

---

## 初回実行と修正履歴

### 実行日時: 2025-01-05

#### 実行前の状態

- Playwrightインストール済み
- テストユーザー2人作成済み
- 開発サーバー起動中（ポート3001）

#### 初回実行コマンド

```bash
npm run test:e2e:ui
```

#### 実行結果

（ここに実行結果を記録していきます）

---

## トラブルシューティング

### よくあるエラー

#### 1. `Error: page.goto: net::ERR_CONNECTION_REFUSED`

**原因**: 開発サーバーが起動していない

**解決方法**:
```bash
npm run dev
```

#### 2. `Timeout 30000ms exceeded`

**原因**: 要素が見つからない、またはページの読み込みが遅い

**解決方法**:
- `data-testid` が正しく設定されているか確認
- タイムアウト時間を延長

#### 3. `Invalid email or password`

**原因**: テストユーザーが正しく作成されていない

**解決方法**:
- Supabaseダッシュボードでユーザーを確認
- パスワードが `password123` になっているか確認

---

## data-testid属性について

### data-testidとは

テストで要素を特定するための目印（識別子）です。

### 例

```tsx
// ❌ テストで見つけにくい
<button>送信</button>

// ✅ テストで見つけやすい
<button data-testid="send-button">送信</button>
```

### テストでの使い方

```typescript
// data-testidを使って要素を取得
await page.click('button[data-testid="send-button"]');
```

### 必要な箇所

このプロジェクトで追加が必要な `data-testid`:

| data-testid | 要素 | ファイル |
|------------|------|---------|
| `channel-list` | チャンネル一覧 | `src/components/workspace/channelList.tsx` |
| `channel-item` | チャンネルアイテム | `src/components/workspace/channelList.tsx` |
| `channel-header` | チャンネルヘッダー | `src/components/channel/channelHeader.tsx` |
| `message-form` | メッセージフォーム | `src/components/channel/messageForm.tsx` |
| `message-list` | メッセージ一覧 | `src/components/channel/messageView.tsx` |
| `message-input` | メッセージ入力欄 | `src/components/channel/messageForm.tsx` |
| `send-button` | 送信ボタン | `src/components/channel/messageForm.tsx` |
| `dm-list` | DM一覧 | `src/components/workspace/directMessageList.tsx` |
| `dm-item` | DMアイテム | `src/components/workspace/directMessageList.tsx` |
| `dm-header` | DMヘッダー | `src/components/dm/dmHeader.tsx` |
| `user-item` | ユーザーアイテム | `src/components/workspace/userManagement.tsx` |

---

## 次のステップ

1. UIモードでテストを実行
2. 失敗したテストを確認
3. 必要な `data-testid` を追加
4. テストを再実行
5. 全テスト成功まで繰り返す

---

最終更新日: 2025-01-05
