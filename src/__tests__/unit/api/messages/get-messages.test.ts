/**
 * メッセージ取得API（GET /api/messages/[channelId]）のユニットテスト
 *
 * テスト対象:
 * - 正常系: チャンネルのメッセージ一覧を取得できる
 * - 認証エラー: 未ログインユーザーは拒否される
 * - メンバーシップエラー: チャンネルメンバーでないユーザーは拒否される
 * - エラーハンドリング: データベースエラー時の適切なレスポンス
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/messages/[channelId]/route'
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// モック設定
jest.mock('@/lib/auth-server')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    message: {
      findMany: jest.fn(),
    },
  },
}))

// 型定義
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockCheckChannelMembership = checkChannelMembership as jest.MockedFunction<typeof checkChannelMembership>

describe('GET /api/messages/[channelId]', () => {
  // 各テスト前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * テスト1: 正常系
   * 認証済みユーザーがチャンネルメンバーの場合、メッセージ一覧を取得できる
   */
  test('正常にメッセージ一覧を取得できる', async () => {
    // モックデータ準備
    const mockUser = {
      id: 'user-123',
      name: 'テストユーザー',
      email: 'test@example.com',
      authId: 'auth-123',
      avatarUrl: null,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockMessages = [
      {
        id: 'msg-1',
        content: 'こんにちは',
        senderId: 'user-123',
        channelId: 'channel-1',
        parentMessageId: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        fileSize: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        sender: {
          id: 'user-123',
          name: 'テストユーザー',
          email: 'test@example.com',
          authId: 'auth-123',
          avatarUrl: null,
        },
        replies: [],
      },
      {
        id: 'msg-2',
        content: 'こんばんは',
        senderId: 'user-456',
        channelId: 'channel-1',
        parentMessageId: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        fileSize: null,
        createdAt: new Date('2024-01-01T11:00:00Z'),
        updatedAt: new Date('2024-01-01T11:00:00Z'),
        sender: {
          id: 'user-456',
          name: '別のユーザー',
          email: 'other@example.com',
          authId: 'auth-456',
          avatarUrl: null,
        },
        replies: [],
      },
    ]

    // モック関数の戻り値を設定
    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    mockCheckChannelMembership.mockResolvedValue({
      isMember: true,
      error: null,
      status: 200,
    })

    // Prismaのモック設定
    ;(prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages)

    // リクエスト作成
    const request = new NextRequest('http://localhost:3000/api/messages/channel-1')
    const params = Promise.resolve({ channelId: 'channel-1' })

    // API実行
    const response = await GET(request, { params })
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.messages).toHaveLength(2)
    expect(data.messages[0].content).toBe('こんにちは')
    expect(data.messages[1].content).toBe('こんばんは')
    expect(data.count).toBe(2)

    // モック関数が正しく呼ばれたか確認
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockCheckChannelMembership).toHaveBeenCalledWith('user-123', 'channel-1')
    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: {
        channelId: 'channel-1',
        parentMessageId: null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            authId: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                authId: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  })

  /**
   * テスト2: 認証エラー
   * 未ログインユーザーは401エラーを返す
   */
  test('未ログインユーザーは401エラーを返す', async () => {
    // 認証失敗をシミュレート
    mockGetCurrentUser.mockResolvedValue({
      user: null,
      error: '認証が必要です。ログインしてください。',
      status: 401,
    })

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1')
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('認証が必要です。ログインしてください。')

    // チャンネルメンバーシップチェックは実行されないはず
    expect(mockCheckChannelMembership).not.toHaveBeenCalled()
  })

  /**
   * テスト3: メンバーシップエラー
   * チャンネルメンバーでないユーザーは403エラーを返す
   */
  test('チャンネルメンバーでないユーザーは403エラーを返す', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'テストユーザー',
      email: 'test@example.com',
      authId: 'auth-123',
      avatarUrl: null,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // 認証は成功するがメンバーシップチェックで失敗
    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    mockCheckChannelMembership.mockResolvedValue({
      isMember: false,
      error: 'このチャンネルにアクセスする権限がありません',
      status: 403,
    })

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1')
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('このチャンネルにアクセスする権限がありません')

    // Prismaクエリは実行されないはず
    expect(prisma.message.findMany).not.toHaveBeenCalled()
  })

  /**
   * テスト4: データベースエラー
   * Prismaクエリ失敗時に500エラーを返す
   */
  test('データベースエラー時に500エラーを返す', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'テストユーザー',
      email: 'test@example.com',
      authId: 'auth-123',
      avatarUrl: null,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    mockCheckChannelMembership.mockResolvedValue({
      isMember: true,
      error: null,
      status: 200,
    })

    // データベースエラーをシミュレート
    ;(prisma.message.findMany as jest.Mock).mockRejectedValue(
      new Error('Database connection error')
    )

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1')
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('メッセージの取得に失敗しました')
    expect(data.details).toBe('Database connection error')
  })

  /**
   * テスト5: 空のメッセージリスト
   * チャンネルにメッセージが1件もない場合、空配列を返す
   */
  test('メッセージが0件の場合は空配列を返す', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'テストユーザー',
      email: 'test@example.com',
      authId: 'auth-123',
      avatarUrl: null,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    mockCheckChannelMembership.mockResolvedValue({
      isMember: true,
      error: null,
      status: 200,
    })

    // 空配列を返す
    ;(prisma.message.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1')
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.messages).toEqual([])
    expect(data.count).toBe(0)
  })
})
