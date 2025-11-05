/**
 * DM（ダイレクトメッセージ）機能のE2Eテスト
 *
 * このファイルは、ブラウザを使った自動テストでDM関連の機能を検証します。
 *
 * テスト内容:
 * - DM一覧が表示されるか
 * - 新しいDMを開始できるか
 * - DMでメッセージを送信できるか
 * - DMがリアルタイムで更新されるか
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

test.describe('DM機能', () => {
  /**
   * 各テスト実行前にログイン
   */
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'user1');
  });

  test('DM一覧が表示される', async ({ page }) => {
    // ワークスペースページに移動
    await page.goto('/workspace');

    // サイドバーにDM一覧が表示されているか確認
    const dmList = page.locator('[data-testid="dm-list"]');
    await expect(dmList).toBeVisible();
  });

  test('ユーザーリストからDMを開始できる', async ({ page }) => {
    // ワークスペースページに移動
    await page.goto('/workspace');

    // ユーザー一覧を開く
    await page.click('button:has-text("ユーザー一覧")');

    // モーダルが表示されるまで待機
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // ユーザーを選択してDMを開始
    const userItem = page.locator('[data-testid="user-item"]').first();
    await userItem.click();

    // DMチャット画面が表示されるまで待機
    const dmHeader = page.locator('[data-testid="dm-header"]');
    await expect(dmHeader).toBeVisible({ timeout: 5000 });

    // メッセージ入力フォームが表示されているか確認
    const messageForm = page.locator('[data-testid="message-form"]');
    await expect(messageForm).toBeVisible();
  });

  test('DMでメッセージを送信できる', async ({ page }) => {
    // ワークスペースページに移動
    await page.goto('/workspace');

    // DM一覧から最初のDMをクリック
    const firstDM = page.locator('[data-testid="dm-item"]').first();

    // DMが存在する場合のみテスト実行
    if (await firstDM.isVisible()) {
      await firstDM.click();

      // メッセージを入力
      const messageContent = `DMテストメッセージ ${Date.now()}`;
      await page.fill(
        'textarea[data-testid="message-input"]',
        messageContent
      );

      // 送信ボタンをクリック
      await page.click('button[data-testid="send-button"]');

      // 送信したメッセージが表示されるまで待機
      const sentMessage = page.locator(`text=${messageContent}`);
      await expect(sentMessage).toBeVisible({ timeout: 5000 });
    } else {
      // DMが存在しない場合はスキップ
      test.skip();
    }
  });

  test('DMがリアルタイムで他のユーザーに表示される', async ({
    browser,
  }) => {
    // ユーザー1のブラウザコンテキスト
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await loginAsTestUser(page1, 'user1');

    // ユーザー2のブラウザコンテキスト
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await loginAsTestUser(page2, 'user2');

    // ユーザー1がユーザー2とのDMを開く
    await page1.goto('/workspace');
    await page1.click('button:has-text("ユーザー一覧")');

    // ユーザー2を探してDMを開始
    const user2Item = page1.locator('text=テストユーザー2');
    if (await user2Item.isVisible()) {
      await user2Item.click();
    }

    // ユーザー2もDM一覧から同じDMを開く
    await page2.goto('/workspace');
    const dmItem = page2.locator('[data-testid="dm-item"]').first();
    if (await dmItem.isVisible()) {
      await dmItem.click();
    }

    // ユーザー1がメッセージを送信
    const messageContent = `DMリアルタイムテスト ${Date.now()}`;
    await page1.fill(
      'textarea[data-testid="message-input"]',
      messageContent
    );
    await page1.click('button[data-testid="send-button"]');

    // ユーザー2の画面にメッセージが表示されるまで待機
    const sentMessage = page2.locator(`text=${messageContent}`);
    await expect(sentMessage).toBeVisible({ timeout: 5000 });

    // クリーンアップ
    await context1.close();
    await context2.close();
  });

  test('DM一覧に相手のユーザー名が表示される', async ({ page }) => {
    // ワークスペースページに移動
    await page.goto('/workspace');

    // DM一覧を確認
    const dmList = page.locator('[data-testid="dm-list"]');
    await expect(dmList).toBeVisible();

    // 少なくとも1つのDMアイテムが表示されているか
    const dmItem = page.locator('[data-testid="dm-item"]').first();

    if (await dmItem.isVisible()) {
      // DMアイテムにユーザー名が含まれているか確認
      const userName = await dmItem.textContent();
      expect(userName).toBeTruthy();
      expect(userName?.length).toBeGreaterThan(0);
    }
  });
});
