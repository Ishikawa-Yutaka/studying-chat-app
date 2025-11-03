/**
 * useRealtimeMessagesカスタムフックのユニットテスト
 *
 * テスト対象: src/hooks/useRealtimeMessages.ts
 *
 * このテストでは、Supabase Realtimeを使ったメッセージの
 * リアルタイム更新機能をテストします。
 *
 * テストする機能:
 * - 初期メッセージの設定
 * - メッセージの追加（add Message）
 * - 重複メッセージのスキップ
 * - Realtimeサブスクリプション
 * - channelId変更時のリセット
 * - クリーンアップ
 */

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// global.fetchのモック（送信者情報取得API用）
global.fetch = jest.fn()

import { renderHook, waitFor, act } from '@testing-library/react'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { createClient } from '@/lib/supabase/client'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// テスト用のメッセージデータ
const mockMessage = {
  id: 'msg-1',
  content: 'テストメッセージ',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  sender: {
    id: 'user-1',
    name: 'テストユーザー',
    email: 'test@example.com',
  },
}

const mockMessage2 = {
  id: 'msg-2',
  content: '2番目のメッセージ',
  createdAt: new Date('2024-01-01T00:01:00Z'),
  sender: {
    id: 'user-2',
    name: 'ユーザー2',
    email: 'user2@example.com',
  },
}

describe('useRealtimeMessages - メッセージリアルタイム更新カスタムフック', () => {
  /**
   * 各テストの前に実行される初期化処理
   */
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  /**
   * Supabase Realtimeのモックを作成するヘルパー関数
   */
  const createMockRealtimeChannel = () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        // subscribeが呼ばれたらコールバックを実行（接続成功をシミュレート）
        if (typeof callback === 'function') {
          callback('SUBSCRIBED', null)
        }
        return mockChannel
      }),
    }
    return mockChannel
  }

  /**
   * 初期メッセージ設定のテスト
   */
  describe('初期メッセージ設定', () => {
    test('初期メッセージが正しく設定される', () => {
      const initialMessages = [mockMessage]
      const mockChannel = createMockRealtimeChannel()
      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      const { result } = renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages,
        })
      )

      // 初期メッセージが設定されていることを確認
      expect(result.current.messages).toEqual(initialMessages)
    })

    test('空の初期メッセージでも正しく動作する', () => {
      const mockChannel = createMockRealtimeChannel()
      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      const { result } = renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [],
        })
      )

      expect(result.current.messages).toEqual([])
    })
  })

  /**
   * addMessage関数のテスト
   */
  describe('addMessage - メッセージ追加', () => {
    test('新しいメッセージを追加できる', () => {
      const mockChannel = createMockRealtimeChannel()
      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      const { result } = renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [mockMessage],
        })
      )

      // メッセージを追加
      act(() => {
        result.current.addMessage(mockMessage2)
      })

      // メッセージが追加されたことを確認
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1]).toEqual(mockMessage2)
    })

    test('重複メッセージはスキップされる', () => {
      const mockChannel = createMockRealtimeChannel()
      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      const { result } = renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [mockMessage],
        })
      )

      // 同じIDのメッセージを追加しようとする
      act(() => {
        result.current.addMessage(mockMessage)
      })

      // メッセージ数が変わっていないことを確認
      expect(result.current.messages).toHaveLength(1)
    })
  })

  /**
   * Realtimeサブスクリプションのテスト
   */
  describe('Realtimeサブスクリプション', () => {
    test('Realtimeチャンネルが正しく作成される', () => {
      const mockChannel = createMockRealtimeChannel()
      const mockRemoveChannel = jest.fn()
      const mockChannelFn = jest.fn(() => mockChannel)

      mockCreateClient.mockReturnValue({
        channel: mockChannelFn,
        removeChannel: mockRemoveChannel,
      } as any)

      renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [],
        })
      )

      // チャンネルが作成されたことを確認
      expect(mockChannelFn).toHaveBeenCalledWith('messages_channel-1')
    })

    test('postgres_changesイベントが監視される', () => {
      const mockChannel = createMockRealtimeChannel()
      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [],
        })
      )

      // onメソッドが呼ばれたことを確認
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: 'channelId=eq.channel-1',
        }),
        expect.any(Function)
      )

      // subscribeが呼ばれたことを確認
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    test('新しいメッセージを受信したときに処理される', async () => {
      let realtimeCallback: any

      const mockChannel = {
        on: jest.fn((event, config, callback) => {
          realtimeCallback = callback
          return mockChannel
        }),
        subscribe: jest.fn().mockReturnThis(),
      }

      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      // 送信者情報取得APIのモック
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user: {
            id: 'user-3',
            name: 'リアルタイムユーザー',
            email: 'realtime@example.com',
          },
        }),
      } as Response)

      const { result } = renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [mockMessage],
        })
      )

      // 初期メッセージ数を確認
      expect(result.current.messages).toHaveLength(1)

      // 新しいメッセージの受信をシミュレート
      const newMessagePayload = {
        new: {
          id: 'msg-3',
          senderId: 'user-3',
          content: 'リアルタイムメッセージ',
          createdAt: '2024-01-01T00:02:00Z',
          parentMessageId: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          fileSize: null,
        },
      }

      await act(async () => {
        await realtimeCallback(newMessagePayload)
      })

      // メッセージが追加されるまで待つ
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2)
      })

      // 新しいメッセージが追加されたことを確認
      expect(result.current.messages[1]).toMatchObject({
        id: 'msg-3',
        content: 'リアルタイムメッセージ',
        sender: {
          id: 'user-3',
          name: 'リアルタイムユーザー',
          email: 'realtime@example.com',
        },
      })
    })

    test('スレッド返信（parentMessageIdあり）は追加されない', async () => {
      let realtimeCallback: any

      const mockChannel = {
        on: jest.fn((event, config, callback) => {
          realtimeCallback = callback
          return mockChannel
        }),
        subscribe: jest.fn().mockReturnThis(),
      }

      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      const { result } = renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [mockMessage],
        })
      )

      // スレッド返信のpayload（parentMessageIdが存在）
      const threadReplyPayload = {
        new: {
          id: 'msg-thread',
          senderId: 'user-2',
          content: 'スレッド返信',
          createdAt: '2024-01-01T00:03:00Z',
          parentMessageId: 'msg-1', // スレッド返信
          fileUrl: null,
          fileName: null,
          fileType: null,
          fileSize: null,
        },
      }

      await act(async () => {
        await realtimeCallback(threadReplyPayload)
      })

      // メッセージ数が変わっていないことを確認（スレッド返信は追加されない）
      expect(result.current.messages).toHaveLength(1)
    })

    test('削除済みユーザーのメッセージも処理される', async () => {
      let realtimeCallback: any

      const mockChannel = {
        on: jest.fn((event, config, callback) => {
          realtimeCallback = callback
          return mockChannel
        }),
        subscribe: jest.fn().mockReturnThis(),
      }

      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      const { result } = renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [],
        })
      )

      // senderId=nullのメッセージ（削除済みユーザー）
      const deletedUserMessagePayload = {
        new: {
          id: 'msg-deleted',
          senderId: null,
          content: '削除されたユーザーのメッセージ',
          createdAt: '2024-01-01T00:04:00Z',
          parentMessageId: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          fileSize: null,
        },
      }

      await act(async () => {
        await realtimeCallback(deletedUserMessagePayload)
      })

      // メッセージが追加されたことを確認
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1)
      })

      // 送信者が「削除済みユーザー」として設定されていることを確認
      expect(result.current.messages[0].sender).toMatchObject({
        id: 'deleted-user',
        name: '削除済みユーザー',
      })
    })
  })

  /**
   * channelId変更のテスト
   */
  describe('channelId変更時のリセット', () => {
    test('channelIdが変わるとメッセージがリセットされる', () => {
      const mockChannel = createMockRealtimeChannel()
      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      const { result, rerender } = renderHook(
        ({ channelId, initialMessages }) => useRealtimeMessages({ channelId, initialMessages }),
        {
          initialProps: {
            channelId: 'channel-1',
            initialMessages: [mockMessage],
          },
        }
      )

      // 初期メッセージを確認
      expect(result.current.messages).toHaveLength(1)

      // channelIdを変更して再レンダリング
      rerender({
        channelId: 'channel-2',
        initialMessages: [mockMessage2],
      })

      // メッセージがリセットされたことを確認
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0]).toEqual(mockMessage2)
    })
  })

  /**
   * クリーンアップのテスト
   */
  describe('クリーンアップ', () => {
    test('アンマウント時にチャンネルが削除される', () => {
      const mockChannel = createMockRealtimeChannel()
      const mockRemoveChannel = jest.fn()

      mockCreateClient.mockReturnValue({
        channel: jest.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
      } as any)

      const { unmount } = renderHook(() =>
        useRealtimeMessages({
          channelId: 'channel-1',
          initialMessages: [],
        })
      )

      // アンマウント
      unmount()

      // removeChannelが呼ばれたことを確認
      expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel)
    })
  })
})
