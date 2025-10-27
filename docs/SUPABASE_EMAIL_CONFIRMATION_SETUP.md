# Supabase メール確認設定ガイド

## 問題

新規ユーザー登録後、メール確認のリンクをクリックしても：
1. トップページ（`/`）にリダイレクトされる
2. `/workspace` にリダイレクトされない
3. Prismaにユーザーが作成されない

## 原因

Supabaseのメール確認設定で、リダイレクトURLが正しく設定されていない可能性があります。

## 解決方法

### 1. Supabaseダッシュボードにアクセス

https://supabase.com/dashboard にアクセスしてログイン

### 2. プロジェクトを選択

該当するプロジェクトを選択

### 3. Authentication設定を開く

左サイドバーから **Authentication** → **Email Templates** を選択

### 4. Confirm signupテンプレートを編集

「Confirm signup」テンプレートを開く

確認すべき内容：
- **Redirect URL**: `{{ .ConfirmationURL }}` が含まれていること
- このURLが `/auth/callback` にリダイレクトされること

### 5. URL Configurationを確認

**Authentication** → **URL Configuration** を選択

以下の設定を確認：

#### Site URL（開発環境）
```
http://localhost:3000
```

#### Redirect URLs（開発環境）
```
http://localhost:3000/auth/callback
http://localhost:3000/workspace
```

#### Site URL（本番環境）
本番環境のURLに変更（例）:
```
https://your-domain.com
```

#### Redirect URLs（本番環境）
```
https://your-domain.com/auth/callback
https://your-domain.com/workspace
```

### 6. メール確認を有効化

**Authentication** → **Providers** → **Email** を選択

以下の設定を確認：
- ✅ **Enable email confirmations**: ON
- ✅ **Confirm email**: ON

### 7. テストメールを確認

メールテンプレートの「Send Test Email」ボタンでテストメールを送信し、リンクを確認

メール内のリンクは以下の形式になっているはず：
```
http://localhost:3000/auth/callback?token_hash=xxx&type=email&next=/workspace
```

## 開発環境でメール確認を無効化する方法（推奨）

開発中はメール確認を無効化することで、スムーズに開発できます。

### 手順

1. **Authentication** → **Providers** → **Email** を選択
2. **Confirm email** を **OFF** に設定
3. これで、サインアップ後すぐにログイン状態になります

### 注意点

- 本番環境では必ず **ON** に戻すこと
- セキュリティ上、本番環境ではメール確認は必須

## 確認手順

### 1. 新規ユーザーを作成

サインアップページから新規ユーザーを作成

### 2. メールを確認

登録したメールアドレスに確認メールが届くことを確認

### 3. リンクをクリック

メール内のリンクをクリック

### 4. リダイレクト先を確認

`/workspace` にリダイレクトされることを確認

### 5. コンソールログを確認

ブラウザのコンソールに以下のログが表示されることを確認：
```
✅ ユーザー認証成功: user@example.com
🔄 Prismaユーザー同期開始: { authId: "...", email: "...", userName: "...", avatarUrl: "無し" }
✅ Prismaにユーザー情報を同期成功: { id: "...", authId: "...", name: "...", email: "..." }
```

### 6. Prisma Studioで確認

```bash
npx prisma studio
```

Userテーブルに新しいユーザーが作成されていることを確認

## トラブルシューティング

### 問題: メールが届かない

#### 原因
- Supabaseの無料プランでは1日のメール送信数に制限がある
- 迷惑メールフォルダに振り分けられている

#### 解決策
1. 迷惑メールフォルダを確認
2. Supabaseダッシュボードの **Settings** → **Project Settings** → **Email** でメール送信履歴を確認
3. 無料プランの制限を確認（1日30通など）

### 問題: リンクをクリックしてもログインできない

#### 原因
- Redirect URLsが正しく設定されていない
- 認証コードの有効期限が切れている（通常24時間）

#### 解決策
1. Redirect URLsを再確認
2. 新しい確認メールを再送信（もう一度サインアップ）
3. ブラウザのキャッシュをクリア

### 問題: Prismaにユーザーが作成されない

#### 原因
- データベース接続エラー
- Prismaのマイグレーションが実行されていない

#### 解決策
1. ターミナルのログを確認
2. Prismaマイグレーションを実行
   ```bash
   npx prisma migrate dev
   ```
3. データベース接続を確認
   ```bash
   npx prisma studio
   ```

## 参考資料

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Next.js Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**作成日**: 2025年10月26日
**対象プロジェクト**: リアルタイムチャットアプリ（卒業制作）
