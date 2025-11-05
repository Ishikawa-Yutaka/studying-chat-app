/**
 * E2Eテスト用認証ヘルパー
 *
 * 目的: テストで使用する認証関連の便利関数をまとめる
 *
 * このファイルには以下の機能があります:
 * - テストユーザーでログイン
 * - ログアウト
 * - 認証状態の確認
 */

import { Page } from '@playwright/test';

/**
 * テストユーザーの認証情報
 *
 * 注意: これらのユーザーはSupabase Authに事前登録されている必要があります
 */
export const TEST_USERS = {
  user1: {
    email: 'test1@example.com',
    password: 'password123',
    name: 'test1',
  },
  user2: {
    email: 'test2@example.com',
    password: 'password123',
    name: 'test2',
  },
};

/**
 * テストユーザーでログインする
 *
 * @param page - Playwrightのページオブジェクト
 * @param userKey - TEST_USERSのキー（'user1' または 'user2'）
 *
 * 処理の流れ:
 * 1. ログインページに移動
 * 2. メールアドレスとパスワードを入力
 * 3. ログインボタンをクリック
 * 4. ダッシュボードにリダイレクトされるまで待機
 *
 * 使用例:
 * ```typescript
 * await loginAsTestUser(page, 'user1');
 * ```
 */
export async function loginAsTestUser(
  page: Page,
  userKey: keyof typeof TEST_USERS
) {
  const user = TEST_USERS[userKey];

  // ログインページに移動
  await page.goto('/login');

  // フォームに入力
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);

  // ログインボタンクリックとナビゲーションを同時に待つ
  // 正規表現パターンで /workspace を含むURLを待機
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/workspace/);

  // ワークスペースページのデータ読み込み完了を待つ
  // 「読み込み中...」が消えるまで待機
  await page.waitForSelector('text=読み込み中', { state: 'hidden', timeout: 15000 });
}

/**
 * ログアウトする
 *
 * @param page - Playwrightのページオブジェクト
 *
 * 処理の流れ:
 * 1. ログアウトボタンを探す
 * 2. ボタンをクリック
 * 3. ログインページにリダイレクトされるまで待機
 */
export async function logout(page: Page) {
  // ログアウトボタンクリックとナビゲーションを同時に待つ
  await Promise.all([
    page.waitForURL(/\/login/),
    page.locator('button:has-text("ログアウト")').click(),
  ]);
}

/**
 * ログイン状態かどうかを確認
 *
 * @param page - Playwrightのページオブジェクト
 * @returns ログイン済みの場合true、未ログインの場合false
 *
 * 確認方法:
 * - /workspace にアクセス
 * - /login にリダイレクトされたら未ログイン
 * - /workspace のままならログイン済み
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto('/workspace');
  const url = page.url();
  return url.includes('/workspace');
}
