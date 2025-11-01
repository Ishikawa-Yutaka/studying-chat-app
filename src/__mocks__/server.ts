/**
 * MSW (Mock Service Worker) サーバー設定
 *
 * 目的: Jest（Node.js環境）でMSWを使えるようにする
 *
 * このファイルでやっていること:
 * 1. handlers.ts で定義したAPIモックを読み込む
 * 2. Node.js用のMSWサーバーインスタンスを作成
 * 3. テスト開始前・終了後の処理を定義
 *
 * 使い方:
 * - jest.setup.js でこのファイルをインポートし、サーバーを起動
 * - すべてのテストで自動的にAPIモックが有効になる
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSWサーバーインスタンス作成
 *
 * setupServer() に handlers を渡すことで、
 * テスト中のすべてのHTTPリクエストがインターセプトされます。
 *
 * 例:
 * ```typescript
 * // テストコード内で fetch を呼び出す
 * const response = await fetch('/api/user/user-1')
 * // → MSWがキャッチして、handlers.ts のモックレスポンスを返す
 * ```
 */
export const server = setupServer(...handlers)

/**
 * テストライフサイクルフック
 *
 * beforeAll: すべてのテストが始まる前に1回だけ実行
 * afterEach: 各テストが終わるたびに実行
 * afterAll: すべてのテストが終わった後に1回だけ実行
 */

/**
 * テスト開始前: MSWサーバーを起動
 *
 * これにより、テスト中のすべてのネットワークリクエストが
 * モックハンドラーにルーティングされます。
 */
beforeAll(() => {
  console.log('🎭 MSW サーバーを起動します...')
  server.listen({
    // ハンドラーが定義されていないリクエストがあった場合、警告を出す
    onUnhandledRequest: 'warn',
  })
})

/**
 * 各テスト終了後: ハンドラーをリセット
 *
 * テスト内で server.use() を使って一時的にハンドラーを上書きした場合、
 * 次のテストに影響しないようにリセットします。
 *
 * 例:
 * ```typescript
 * test('エラーケース', () => {
 *   server.use(
 *     http.get('/api/user/:userId', () => {
 *       return HttpResponse.json({ error: 'エラー' }, { status: 500 })
 *     })
 *   )
 *   // このテストだけエラーレスポンス
 * })
 *
 * test('正常ケース', () => {
 *   // server.resetHandlers() により、元のハンドラーに戻る
 *   // → 正常なレスポンスが返る
 * })
 * ```
 */
afterEach(() => {
  server.resetHandlers()
})

/**
 * テスト終了後: MSWサーバーを停止
 *
 * テストが全て完了したら、MSWサーバーをクリーンアップします。
 * メモリリークを防ぐために重要です。
 */
afterAll(() => {
  console.log('🎭 MSW サーバーを停止します...')
  server.close()
})

/**
 * 使用例: テストファイル内での使い方
 *
 * ```typescript
 * // src/__tests__/api/messages.test.ts
 *
 * import { server } from '@/__mocks__/server'
 * import { http, HttpResponse } from 'msw'
 *
 * describe('メッセージAPI', () => {
 *   test('メッセージ一覧取得', async () => {
 *     const response = await fetch('/api/messages/channel-1')
 *     const data = await response.json()
 *
 *     expect(data.success).toBe(true)
 *     expect(data.messages).toHaveLength(2) // handlers.ts のモックデータ
 *   })
 *
 *   test('エラーハンドリング', async () => {
 *     // このテストだけエラーレスポンスを返す
 *     server.use(
 *       http.get('/api/messages/:channelId', () => {
 *         return HttpResponse.json(
 *           { success: false, error: 'サーバーエラー' },
 *           { status: 500 }
 *         )
 *       })
 *     )
 *
 *     const response = await fetch('/api/messages/channel-1')
 *     const data = await response.json()
 *
 *     expect(response.status).toBe(500)
 *     expect(data.success).toBe(false)
 *   })
 * })
 * ```
 */
