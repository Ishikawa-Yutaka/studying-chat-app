/**
 * MSW (Mock Service Worker) ハンドラー定義
 *
 * 目的: テスト時のAPIリクエストをインターセプトし、モックレスポンスを返す
 *
 * 仕組み:
 * 1. テストコードがAPI（fetch）を呼び出す
 * 2. MSWがそのリクエストをキャッチ
 * 3. ここで定義したハンドラーが実行される
 * 4. モックデータをレスポンスとして返す
 * 5. テストコードは実際のサーバーに接続せずにテスト可能
 *
 * メリット:
 * - 実際のサーバーやデータベースが不要
 * - テストが高速（ネットワーク遅延なし）
 * - エラーケースも簡単にテスト可能
 */

import { http, HttpResponse } from 'msw'

/**
 * テスト用のモックデータ
 *
 * 実際のデータベースデータの代わりに使用
 */
const mockUsers = [
  {
    id: 'user-1',
    authId: 'auth-1',
    name: 'テストユーザー1',
    email: 'test1@example.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-2',
    authId: 'auth-2',
    name: 'テストユーザー2',
    email: 'test2@example.com',
    createdAt: new Date().toISOString(),
  },
]

const mockChannels = [
  {
    id: 'channel-1',
    name: '一般',
    description: 'テスト用チャンネル',
    type: 'channel',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'channel-2',
    name: '開発',
    description: '開発用チャンネル',
    type: 'channel',
    createdAt: new Date().toISOString(),
  },
]

const mockMessages = [
  {
    id: 'message-1',
    content: 'こんにちは',
    senderId: 'user-1',
    channelId: 'channel-1',
    createdAt: new Date().toISOString(),
    sender: mockUsers[0],
  },
  {
    id: 'message-2',
    content: 'よろしくお願いします',
    senderId: 'user-2',
    channelId: 'channel-1',
    createdAt: new Date().toISOString(),
    sender: mockUsers[1],
  },
]

/**
 * APIハンドラー定義
 *
 * http.get() / http.post() などで、特定のURLパターンに対する
 * モックレスポンスを定義します。
 */
export const handlers = [
  /**
   * GET /api/user/:userId
   * ユーザー情報取得API
   */
  http.get('/api/user/:userId', ({ params }) => {
    const { userId } = params
    const user = mockUsers.find((u) => u.id === userId)

    if (!user) {
      return HttpResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    return HttpResponse.json({ success: true, user })
  }),

  /**
   * GET /api/channels
   * チャンネル一覧取得API
   */
  http.get('/api/channels', ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return HttpResponse.json(
        { success: false, error: 'userIdが必要です' },
        { status: 400 }
      )
    }

    // 実際にはDBからユーザーが参加しているチャンネルを取得
    // ここではモックデータをそのまま返す
    return HttpResponse.json({
      success: true,
      channels: mockChannels,
      directMessages: [],
    })
  }),

  /**
   * GET /api/messages/:channelId
   * メッセージ一覧取得API
   */
  http.get('/api/messages/:channelId', ({ params }) => {
    const { channelId } = params

    // 指定されたチャンネルのメッセージをフィルタリング
    const channelMessages = mockMessages.filter(
      (msg) => msg.channelId === channelId
    )

    return HttpResponse.json({
      success: true,
      messages: channelMessages,
    })
  }),

  /**
   * POST /api/messages/:channelId
   * メッセージ送信API
   */
  http.post('/api/messages/:channelId', async ({ params, request }) => {
    const { channelId } = params
    const body = (await request.json()) as { content: string; senderId: string }

    // 新しいメッセージを作成（モック）
    const newMessage = {
      id: `message-${Date.now()}`,
      content: body.content,
      senderId: body.senderId,
      channelId: channelId as string,
      createdAt: new Date().toISOString(),
      sender: mockUsers.find((u) => u.id === body.senderId),
    }

    return HttpResponse.json({
      success: true,
      message: newMessage,
    })
  }),

  /**
   * GET /api/dashboard
   * ダッシュボード統計情報取得API
   */
  http.get('/api/dashboard', () => {
    return HttpResponse.json({
      success: true,
      stats: {
        totalChannels: mockChannels.length,
        totalMessages: mockMessages.length,
        totalUsers: mockUsers.length,
      },
    })
  }),

  /**
   * POST /api/channels
   * チャンネル作成API
   */
  http.post('/api/channels', async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      description: string
      userId: string
    }

    const newChannel = {
      id: `channel-${Date.now()}`,
      name: body.name,
      description: body.description,
      type: 'channel',
      createdAt: new Date().toISOString(),
    }

    return HttpResponse.json({
      success: true,
      channel: newChannel,
    })
  }),

  /**
   * DELETE /api/channels/:channelId
   * チャンネル削除API
   */
  http.delete('/api/channels/:channelId', ({ params }) => {
    const { channelId } = params

    // 実際にはDBから削除
    // ここでは成功レスポンスのみ返す
    return HttpResponse.json({
      success: true,
      message: 'チャンネルを削除しました',
    })
  }),

  /**
   * エラーケースのテスト用ハンドラー（例）
   *
   * 特定のテストでエラーレスポンスをシミュレートしたい場合、
   * テストファイル内で server.use() を使ってこのハンドラーを上書きできます。
   *
   * 例:
   * ```typescript
   * import { server } from '@/__mocks__/server'
   * import { http, HttpResponse } from 'msw'
   *
   * test('メッセージ取得エラー', async () => {
   *   server.use(
   *     http.get('/api/messages/:channelId', () => {
   *       return HttpResponse.json(
   *         { success: false, error: 'サーバーエラー' },
   *         { status: 500 }
   *       )
   *     })
   *   )
   *
   *   // エラーケースのテストを実行
   * })
   * ```
   */
]

/**
 * カスタムハンドラーを追加したい場合
 *
 * 新しいAPIエンドポイントのテストを書く際は、
 * ここにハンドラーを追加してください。
 *
 * 例:
 * ```typescript
 * http.get('/api/custom-endpoint', () => {
 *   return HttpResponse.json({ data: 'カスタムデータ' })
 * })
 * ```
 */
