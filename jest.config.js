/**
 * Jest設定ファイル
 *
 * 目的: Jestテストランナーの動作を設定する
 *
 * 主な設定項目:
 * - testEnvironment: ブラウザ環境（jsdom）をシミュレーション
 * - setupFilesAfterEnv: テスト実行前に読み込むファイル
 * - moduleNameMapper: パスエイリアス（@/）を解決
 * - transform: TypeScript/JSXファイルをトランスパイル
 * - collectCoverageFrom: カバレッジ計測対象ファイル
 */

const nextJest = require('next/jest')

/**
 * Next.jsのJest設定を自動生成
 *
 * Next.jsプロジェクトに最適化されたJest設定を提供:
 * - next.config.jsの読み込み
 * - CSS/画像ファイルのモック
 * - パスエイリアスの自動解決
 */
const createJestConfig = nextJest({
  // Next.jsアプリのルートディレクトリ（.env.localなどを読み込むため）
  dir: './',
})

/**
 * カスタムJest設定
 */
const customJestConfig = {
  /**
   * テスト環境の設定
   *
   * 'jsdom': ブラウザのDOM APIを使えるようにする
   * （Reactコンポーネントのテストに必須）
   */
  testEnvironment: 'jest-environment-jsdom',

  /**
   * テスト環境のオプション設定
   *
   * jsdom環境でのwindow.location.originを設定
   * （OAuth認証などでリダイレクトURLを生成する際に使用）
   */
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },

  /**
   * テスト実行前のセットアップファイル
   *
   * jest.setup.js が各テストファイル実行前に読み込まれる
   * → @testing-library/jest-domのカスタムマッチャーが使える
   */
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  /**
   * モジュール名のマッピング（パスエイリアス解決）
   *
   * '@/...' → '<rootDir>/src/...' に変換
   * 例: import { foo } from '@/lib/utils' → src/lib/utils から読み込む
   */
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // カバレッジ計測対象ファイルの設定
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}', // すべてのソースコード
    '!src/**/*.d.ts', // TypeScript型定義ファイルは除外
    '!src/**/*.config.*', // 設定ファイルは除外
    '!src/**/__tests__/**', // テストファイル自体は除外
    '!**/node_modules/**', // 外部パッケージは除外
    '!**/.next/**', // Next.jsビルド成果物は除外
  ],

  /**
   * カバレッジレポーターの設定
   *
   * - text: コンソールに結果表示
   * - lcov: 詳細なHTMLレポート生成（coverage/フォルダ）
   */
  coverageReporters: ['text', 'lcov'],

  // テストファイルのパターン設定
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}', // __tests__ ディレクトリ内
    '**/*.test.{js,jsx,ts,tsx}', // .test 拡張子
    '**/*.spec.{js,jsx,ts,tsx}', // .spec 拡張子
  ],

  /**
   * モジュールのファイル拡張子解決順序
   *
   * import時に拡張子を省略した場合、この順番で解決される
   */
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}

/**
 * Next.jsの設定とカスタム設定をマージして export
 *
 * createJestConfig関数が:
 * 1. Next.jsのデフォルト設定を適用
 * 2. customJestConfigの内容で上書き
 * 3. 最終的なJest設定を生成
 */
module.exports = createJestConfig(customJestConfig)
