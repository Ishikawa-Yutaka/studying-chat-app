# ソーシャル認証セットアップガイド

Google、GitHub、Twitter/X、Facebookでのソーシャルログイン機能を実装するための設定ガイドです。

## 目次

1. [概要](#概要)
2. [Supabase側の設定](#supabase側の設定)
   - [Google認証](#1-google認証)
   - [GitHub認証](#2-github認証)
   - [Twitter/X認証](#3-twitterx認証)
   - [Facebook認証](#4-facebook認証-オプション)
3. [Next.js側の実装](#nextjs側の実装)
4. [トラブルシューティング](#トラブルシューティング)

---

## 概要

### ソーシャル認証とは

ユーザーが既存のソーシャルアカウント（Google、GitHubなど）を使ってログインできる機能です。

### メリット

- パスワード管理が不要
- ユーザー登録が簡単
- セキュリティが向上（各プロバイダーの認証を利用）

### フロー

```
1. ユーザーが「Googleでログイン」ボタンをクリック
2. Googleのログイン画面にリダイレクト
3. ユーザーがGoogleでログイン
4. アプリにリダイレクトバック
5. Supabaseがユーザー情報を取得・保存
6. ログイン完了
```

---

## Supabase側の設定

各プロバイダーのOAuth設定を行います。

### 準備

1. Supabase Dashboardにログイン: https://app.supabase.com
2. プロジェクトを選択
3. 左サイドバーの「Authentication」→「Providers」に移動

---

### 1. Google認証

#### 1-1. Google Cloud Consoleでの設定

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com

2. **新しいプロジェクトを作成（または既存のプロジェクトを選択）**
   - 左上のプロジェクト名をクリック → 「新しいプロジェクト」
   - プロジェクト名: `chat-app`（任意）

3. **OAuth同意画面を設定**
   - 左サイドバー → 「APIとサービス」→「OAuth同意画面」
   - User Type: 「外部」を選択 → 「作成」
   - アプリ名: `リアルタイムチャットアプリ`
   - ユーザーサポートメール: 自分のメールアドレス
   - デベロッパーの連絡先情報: 自分のメールアドレス
   - 「保存して次へ」

4. **スコープの設定**
   - デフォルトのまま → 「保存して次へ」

5. **テストユーザーの追加（開発中のみ）**
   - 自分のGoogleアカウントを追加
   - 「保存して次へ」

6. **OAuth 2.0クライアントIDを作成**
   - 左サイドバー → 「認証情報」→「認証情報を作成」→「OAuth 2.0 クライアント ID」
   - アプリケーションの種類: 「ウェブアプリケーション」
   - 名前: `Chat App Web Client`
   - 承認済みのリダイレクトURI:
     ```
     https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
     ```
     ※ `<YOUR_SUPABASE_PROJECT_REF>` は Supabase の Project URL から取得
     例: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`

7. **クライアントIDとシークレットをコピー**
   - 表示されるクライアントIDとクライアントシークレットをメモ

#### 1-2. Supabaseでの設定

1. Supabase Dashboard → Authentication → Providers → Google
2. 「Google enabled」をONにする
3. **Client ID**: Google Cloud ConsoleでコピーしたクライアントID
4. **Client Secret**: Google Cloud Consoleでコピーしたクライアントシークレット
5. 「Save」をクリック

---

### 2. GitHub認証

#### 2-1. GitHub OAuth Appの作成

1. **GitHubにログイン**
   - https://github.com

2. **Settings → Developer settings に移動**
   - 右上のプロフィール → Settings
   - 左サイドバー最下部 → Developer settings
   - OAuth Apps → New OAuth App

3. **OAuth Appの情報を入力**
   - Application name: `Chat App`
   - Homepage URL: `http://localhost:3000`（開発環境）
   - Application description: `リアルタイムチャットアプリ`（任意）
   - Authorization callback URL:
     ```
     https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
     ```

4. **「Register application」をクリック**

5. **Client IDとClient Secretを取得**
   - Client ID: 表示されているIDをコピー
   - Client Secret: 「Generate a new client secret」をクリック → 表示されるシークレットをコピー

#### 2-2. Supabaseでの設定

1. Supabase Dashboard → Authentication → Providers → GitHub
2. 「GitHub enabled」をONにする
3. **Client ID**: GitHubでコピーしたClient ID
4. **Client Secret**: GitHubでコピーしたClient Secret
5. 「Save」をクリック

---

### 3. Twitter/X認証

#### 3-1. Twitter Developer Portalでの設定

1. **Twitter Developer Portalにアクセス**
   - https://developer.twitter.com/en/portal/dashboard
   - Twitterアカウントでログイン

2. **新しいAppを作成**
   - 「+ Create App」または「Projects & Apps」→「+ Create App」
   - App name: `ChatApp`（一意である必要があります）

3. **API KeysとSecretを取得**
   - App作成後、API KeyとAPI Key Secretが表示される
   - これらをコピー（後で確認できないので必ず保存）

4. **App SettingsでCallback URLを設定**
   - App Settings → Authentication settings → Edit
   - **Enable 3-legged OAuth**: ON
   - **Callback URLs**:
     ```
     https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
     ```
   - **Website URL**: `http://localhost:3000`
   - 「Save」

#### 3-2. Supabaseでの設定

1. Supabase Dashboard → Authentication → Providers → Twitter
2. 「Twitter enabled」をONにする
3. **API Key**: TwitterのAPI Key
4. **API Secret Key**: TwitterのAPI Key Secret
5. 「Save」をクリック

**注意**: Twitter APIは申請が必要な場合があります。開発目的であれば、Free tierで十分です。

---

### 4. Facebook認証（オプション）

#### 4-1. Facebook Developers Consoleでの設定

1. **Facebook Developers にアクセス**
   - https://developers.facebook.com/
   - Facebookアカウントでログイン

2. **新しいアプリを作成**
   - 「アプリを作成」→「消費者」を選択
   - アプリ名: `Chat App`
   - アプリの連絡先メールアドレス: 自分のメールアドレス

3. **Facebook Loginを追加**
   - ダッシュボード → 「製品を追加」→「Facebook Login」→「設定」

4. **有効なOAuthリダイレクトURIを設定**
   - Facebook Login → 設定
   - 有効なOAuthリダイレクトURI:
     ```
     https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
     ```
   - 「変更を保存」

5. **App IDとApp Secretを取得**
   - 左サイドバー → 設定 → ベーシック
   - アプリID: コピー
   - app secret: 「表示」をクリック → コピー

#### 4-2. Supabaseでの設定

1. Supabase Dashboard → Authentication → Providers → Facebook
2. 「Facebook enabled」をONにする
3. **Client ID**: FacebookのアプリID
4. **Client Secret**: Facebookのapp secret
5. 「Save」をクリック

---

## Next.js側の実装

### 1. ログイン関数の作成

**ファイル**: `src/lib/social-auth.ts`

```typescript
import { createClient } from '@/lib/supabase/client';

export type SocialProvider = 'google' | 'github' | 'twitter' | 'facebook';

/**
 * ソーシャルログイン関数
 *
 * @param provider - 'google' | 'github' | 'twitter' | 'facebook'
 */
export async function signInWithSocial(provider: SocialProvider) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(`${provider}ログインエラー:`, error);
    throw error;
  }

  return data;
}
```

### 2. ログインページにボタンを追加

**ファイル**: `src/app/login/page.tsx`

既存のログインフォームの下に、ソーシャルログインボタンを追加します。

```typescript
import { signInWithSocial } from '@/lib/social-auth';

// コンポーネント内
const handleSocialLogin = async (provider: SocialProvider) => {
  try {
    await signInWithSocial(provider);
    // リダイレクトは自動的に行われる
  } catch (error) {
    console.error('ソーシャルログインエラー:', error);
    alert('ログインに失敗しました');
  }
};

// JSX
<div className="mt-6">
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white text-gray-500">または</span>
    </div>
  </div>

  <div className="mt-6 grid grid-cols-2 gap-3">
    <button
      onClick={() => handleSocialLogin('google')}
      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
    >
      <img src="/icons/google.svg" alt="Google" className="w-5 h-5" />
      Google
    </button>

    <button
      onClick={() => handleSocialLogin('github')}
      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
    >
      <img src="/icons/github.svg" alt="GitHub" className="w-5 h-5" />
      GitHub
    </button>

    <button
      onClick={() => handleSocialLogin('twitter')}
      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
    >
      <img src="/icons/twitter.svg" alt="Twitter" className="w-5 h-5" />
      Twitter
    </button>

    <button
      onClick={() => handleSocialLogin('facebook')}
      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
    >
      <img src="/icons/facebook.svg" alt="Facebook" className="w-5 h-5" />
      Facebook
    </button>
  </div>
</div>
```

### 3. コールバックページの確認

**ファイル**: `src/app/auth/callback/route.ts`

既存のコールバック処理がソーシャル認証にも対応しているか確認します。

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // ダッシュボードにリダイレクト
  return NextResponse.redirect(new URL('/workspace', request.url));
}
```

---

## トラブルシューティング

### 1. リダイレクトURIが一致しない

**エラー**: `redirect_uri_mismatch`

**原因**: 各プロバイダーで設定したリダイレクトURIが正しくない

**解決策**:
- Supabase Project URLを確認: `https://<PROJECT_REF>.supabase.co`
- 各プロバイダーのコンソールで以下のURLを設定:
  ```
  https://<PROJECT_REF>.supabase.co/auth/v1/callback
  ```

### 2. Client IDまたはSecretが無効

**エラー**: `Invalid client credentials`

**解決策**:
- 各プロバイダーのコンソールでClient IDとSecretを再確認
- Supabase Dashboardに正しく入力されているか確認
- 余分なスペースが入っていないか確認

### 3. Google認証で「このアプリは確認されていません」

**原因**: OAuth同意画面が「本番環境」になっていない

**解決策**:
- 開発中は「テストユーザー」に自分のアカウントを追加
- 本番環境では、Googleの審査を申請

### 4. GitHub認証が動作しない

**原因**: Authorization callback URLが正しくない

**解決策**:
- GitHub OAuth App設定で、callback URLを確認
- 必ず `https://<PROJECT_REF>.supabase.co/auth/v1/callback` を設定

---

## 本番環境への移行

開発環境で動作確認後、本番環境用の設定を行います。

### 各プロバイダーで本番URLを追加

- Homepage URL: `https://your-domain.com`
- Redirect URI: 両方とも追加
  - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
  - `https://your-domain.com/auth/callback`

---

## 参考リンク

- [Supabase Auth - Social Login](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Twitter OAuth](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/)

---

**作成日**: 2025-01-18
**対象プロジェクト**: リアルタイムチャットアプリ（卒業制作）
