/**
 * Playwright E2Eテスト設定ファイル
 *
 * このファイルはブラウザを使った自動テストの設定を行います。
 *
 * 主な設定:
 * - テストファイルの場所
 * - ブラウザの種類（Chrome、Firefox、Safari）
 * - ベースURL（テスト対象のサーバーURL）
 * - タイムアウト設定
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * 環境変数の設定
 */
const PORT = process.env.PORT || 3001;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  /**
   * テストファイルの場所
   * e2e/ ディレクトリ内の *.spec.ts ファイルをテストとして実行
   */
  testDir: './e2e',

  /**
   * テストの並列実行設定
   * E2Eテストは重いので、並列数を制限
   */
  fullyParallel: false,
  workers: 1, // 1つずつ順番に実行（データベース競合を避けるため）

  /**
   * 失敗時の動作
   * - forbidOnly: CI環境で .only() を使ったテストを禁止
   * - retries: 失敗したテストを何回再試行するか
   */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  /**
   * レポート設定
   * - html: HTML形式のレポートを生成
   * - list: コンソールにテスト結果を表示
   */
  reporter: 'html',

  /**
   * 全テスト共通の設定
   */
  use: {
    /**
     * テスト対象のベースURL
     */
    baseURL,

    /**
     * 失敗時のスクリーンショット・動画保存
     */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /**
     * トレース設定（デバッグ用）
     * 失敗時のみトレースを保存
     */
    trace: 'on-first-retry',
  },

  /**
   * テスト対象のブラウザ設定
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 必要に応じてFirefoxやSafariも追加可能
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /**
   * 開発サーバーの自動起動設定
   *
   * テスト実行前に自動的にNext.jsサーバーを起動します。
   * テスト終了後は自動的にサーバーを停止します。
   *
   * 注意: 既にサーバーが起動している場合は、この設定をコメントアウトしてください
   */
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI, // ローカル開発時は既存のサーバーを再利用
    timeout: 120000, // サーバー起動のタイムアウト（2分）
  },
});
