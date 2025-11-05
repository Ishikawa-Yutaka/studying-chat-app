/**
 * 認証機能のE2Eテスト
 *
 * このファイルは、ブラウザを使った自動テストでログイン・ログアウト機能を検証します。
 *
 * テスト内容:
 * - ログインページが表示されるか
 * - 正しい認証情報でログインできるか
 * - ログイン後、ダッシュボードにリダイレクトされるか
 * - ログアウトできるか
 * - 間違った認証情報でログインできないか
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser, logout, TEST_USERS } from './utils/auth';

test.describe('認証機能', () => {
  /**
   * 各テスト実行後にログアウト
   *
   * テストが終わるたびにログアウトして、次のテストに影響しないようにします
   */
  test.afterEach(async ({ page }) => {
    try {
      // ログアウトボタンが存在する場合のみログアウト
      const logoutButton = page.locator('button:has-text("ログアウト")');
      const isVisible = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        await logout(page);
      }
    } catch (error) {
      // エラーが出ても無視（既にログアウトしている場合など）
      console.log('ログアウトをスキップ:', error);
    }
  });

  test('ログインページが表示される', async ({ page }) => {
    // ログインページに移動
    await page.goto('/login');

    // ページタイトルを確認
    await expect(page).toHaveTitle(/ログイン/);

    // メールアドレス入力欄が表示されているか
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // パスワード入力欄が表示されているか
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // ログインボタンが表示されているか
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('正しい認証情報でログインできる', async ({ page }) => {
    // テストユーザー1でログイン（読み込み完了まで自動的に待機）
    await loginAsTestUser(page, 'user1');

    // URLが /workspace になっているか確認
    expect(page.url()).toContain('/workspace');

    // ユーザー名が表示されているか確認（完全一致で取得）
    const userName = page.getByText(TEST_USERS.user1.name, { exact: true });
    await expect(userName).toBeVisible({ timeout: 10000 });
  });

  test('ログアウトできる', async ({ page }) => {
    // まずログイン（読み込み完了まで自動的に待機）
    await loginAsTestUser(page, 'user1');

    // ログアウトボタンをクリック
    await logout(page);

    // URLが /login になっているか確認
    expect(page.url()).toContain('/login');
  });

  test('未ログイン状態で /workspace にアクセスすると /login にリダイレクトされる', async ({
    page,
  }) => {
    // 直接 /workspace にアクセス
    await page.goto('/workspace');

    // /login にリダイレクトされるまで待機
    await page.waitForURL('/login', { timeout: 5000 });

    // URLが /login になっているか確認
    expect(page.url()).toContain('/login');
  });

  test('間違ったパスワードでログインできない', async ({ page }) => {
    // ログインページに移動
    await page.goto('/login');

    // 間違った認証情報を入力
    await page.fill('input[type="email"]', TEST_USERS.user1.email);
    await page.fill('input[type="password"]', 'wrong-password');

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されるまで待機（最大5秒）
    await page.waitForSelector('text=/エラー|失敗|無効/', {
      timeout: 5000,
    });

    // URLがまだ /login のままか確認（リダイレクトされていない）
    expect(page.url()).toContain('/login');
  });

  test('存在しないメールアドレスでログインできない', async ({ page }) => {
    // ログインページに移動
    await page.goto('/login');

    // 存在しない認証情報を入力
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'password123');

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されるまで待機
    await page.waitForSelector('text=/エラー|失敗|無効/', {
      timeout: 5000,
    });

    // URLがまだ /login のままか確認
    expect(page.url()).toContain('/login');
  });
});
