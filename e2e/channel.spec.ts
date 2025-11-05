/**
 * チャンネル機能のE2Eテスト
 *
 * このファイルは、ブラウザを使った自動テストでチャンネル関連の機能を検証します。
 *
 * テスト内容:
 * - チャンネル一覧が表示されるか
 * - 新しいチャンネルを作成できるか
 * - チャンネルに参加できるか
 * - メッセージを送信できるか
 * - メッセージがリアルタイムで表示されるか
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

test.describe('チャンネル機能', () => {
  /**
   * 各テスト実行前にログイン
   *
   * チャンネル機能はログインが必須なので、毎回自動でログインします
   */
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'user1');
  });

  test('チャンネル一覧が表示される', async ({ page }) => {
    // ワークスペースページに移動
    await page.goto('/workspace');

    // サイドバーにチャンネル一覧が表示されているか確認
    const channelList = page.locator('[data-testid="channel-list"]');
    await expect(channelList).toBeVisible();

    // チャンネルアイテムが少なくとも1つ表示されているか
    const channelItems = page.locator('[data-testid="channel-item"]');
    await expect(channelItems.first()).toBeVisible();
  });

  test('新しいチャンネルを作成できる', async ({ page }) => {
    // ワークスペースページに移動
    await page.goto('/workspace');

    // チャンネル作成ボタンをクリック
    await page.click('button:has-text("チャンネル作成")');

    // モーダルが表示されるまで待機
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // チャンネル名を入力
    const channelName = `テストチャンネル-${Date.now()}`;
    await page.fill('input[name="name"]', channelName);

    // 説明を入力
    await page.fill(
      'input[name="description"]',
      'E2Eテストで作成されたチャンネル'
    );

    // 作成ボタンをクリック
    await page.click('button[type="submit"]');

    // モーダルが閉じるまで待機
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // 新しいチャンネルがサイドバーに表示されているか確認
    const newChannel = page.locator(`text=${channelName}`);
    await expect(newChannel).toBeVisible();
  });

  test('チャンネルをクリックするとチャット画面が表示される', async ({
    page,
  }) => {
    // ワークスペースページに移動
    await page.goto('/workspace');

    // 最初のチャンネルをクリック
    const firstChannel = page.locator('[data-testid="channel-item"]').first();
    await firstChannel.click();

    // チャンネル名がヘッダーに表示されているか確認
    const channelHeader = page.locator('[data-testid="channel-header"]');
    await expect(channelHeader).toBeVisible();

    // メッセージ入力フォームが表示されているか確認
    const messageForm = page.locator('[data-testid="message-form"]');
    await expect(messageForm).toBeVisible();

    // メッセージ一覧が表示されているか確認
    const messageList = page.locator('[data-testid="message-list"]');
    await expect(messageList).toBeVisible();
  });

  test('メッセージを送信できる', async ({ page }) => {
    // ワークスペースページに移動
    await page.goto('/workspace');

    // 最初のチャンネルをクリック
    await page.locator('[data-testid="channel-item"]').first().click();

    // メッセージを入力
    const messageContent = `テストメッセージ ${Date.now()}`;
    await page.fill(
      'textarea[data-testid="message-input"]',
      messageContent
    );

    // 送信ボタンをクリック
    await page.click('button[data-testid="send-button"]');

    // 送信したメッセージが表示されるまで待機
    const sentMessage = page.locator(`text=${messageContent}`);
    await expect(sentMessage).toBeVisible({ timeout: 5000 });
  });

  test('メッセージがリアルタイムで他のユーザーに表示される', async ({
    browser,
  }) => {
    // ユーザー1のブラウザコンテキスト
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await loginAsTestUser(page1, 'user1');
    await page1.goto('/workspace');
    await page1.locator('[data-testid="channel-item"]').first().click();

    // ユーザー2のブラウザコンテキスト
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await loginAsTestUser(page2, 'user2');
    await page2.goto('/workspace');
    await page2.locator('[data-testid="channel-item"]').first().click();

    // ユーザー1がメッセージを送信
    const messageContent = `リアルタイムテスト ${Date.now()}`;
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
});
