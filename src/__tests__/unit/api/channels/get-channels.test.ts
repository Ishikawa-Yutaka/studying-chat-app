/**
 * チャンネル一覧取得API（GET /api/channels）のユニットテスト
 *
 * テスト対象:
 * - 正常系: チャンネルとDMの一覧を取得できる
 * - 正常系: 現在のユーザー情報も返却される
 * - 認証エラー: 未ログインユーザーは拒否される
 * - エラーハンドリング: データベースエラー時の適切なレスポンス
 * - エッジケース: チャンネルが0件の場合
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/channels/route'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// モック設定
jest.mock('@/lib/auth-server')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channelMember: {
      findMany: jest.fn(),
    },
  },
}))

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

describe('GET /api/channels', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * テスト1: 正常系
   * チャンネルとDMの一覧を正しく取得できる
   */
  test('チャンネルとDMの一覧を正常に取得できる', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'テストユーザー',
      email: 'test@example.com',
      authId: 'auth-123',
      avatarUrl: 'https://example.com/avatar.jpg',
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // チャンネルメンバーのモックデータ
    const mockChannelMembers = [
      {
        id: 'member-1',
        userId: 'user-123',
        channelId: 'channel-1',
        channel: {
          id: 'channel-1',
          name: '一般',
          description: '一般的な話題',
          type: 'channel',
          creatorId: 'user-123',
          members: [
            { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', email: 'test@example.com', authId: 'auth-123', avatarUrl: null, lastSeen: new Date() } },
            { userId: 'user-456', user: { id: 'user-456', name: 'ユーザー2', email: 'user2@example.com', authId: 'auth-456', avatarUrl: null, lastSeen: new Date() } },
          ],
        },
      },
      {
        id: 'member-2',
        userId: 'user-123',
        channelId: 'dm-1',
        channel: {
          id: 'dm-1',
          name: null,
          description: null,
          type: 'dm',
          creatorId: 'user-123',
          members: [
            { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', email: 'test@example.com', authId: 'auth-123', avatarUrl: null, lastSeen: new Date('2024-01-01T10:00:00Z') } },
            { userId: 'user-789', user: { id: 'user-789', name: 'DM相手', email: 'dm@example.com', authId: 'auth-789', avatarUrl: 'https://example.com/dm-avatar.jpg', lastSeen: new Date('2024-01-01T11:00:00Z') } },
          ],
        },
      },
    ]

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    ;(prisma.channelMember.findMany as jest.Mock).mockResolvedValue(mockChannelMembers)

    const request = new NextRequest('http://localhost:3000/api/channels')
    const response = await GET(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // チャンネル一覧の確認
    expect(data.channels).toHaveLength(1)
    expect(data.channels[0]).toEqual({
      id: 'channel-1',
      name: '一般',
      description: '一般的な話題',
      memberCount: 2,
      creatorId: 'user-123',
    })

    // DM一覧の確認
    expect(data.directMessages).toHaveLength(1)
    expect(data.directMessages[0]).toMatchObject({
      id: 'dm-1',
      partnerId: 'auth-789',  // DM相手のAuthID
      partnerName: 'DM相手',
      partnerEmail: 'dm@example.com',
      partnerAvatarUrl: 'https://example.com/dm-avatar.jpg',
    })
    // lastSeenは文字列形式でシリアライズされる
    expect(data.directMessages[0].lastSeen).toBeDefined()

    // 現在のユーザー情報の確認
    expect(data.currentUser).toEqual({
      id: 'user-123',
      name: 'テストユーザー',
      email: 'test@example.com',
      authId: 'auth-123',
      avatarUrl: 'https://example.com/avatar.jpg',
    })

    // 件数の確認
    expect(data.counts).toEqual({
      channels: 1,
      directMessages: 1,
    })

    // モック関数が正しく呼ばれたか確認
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
    expect(prisma.channelMember.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            creatorId: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    authId: true,
                    avatarUrl: true,
                    lastSeen: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  })

  /**
   * テスト2: 認証エラー
   * 未ログインユーザーは401エラーを返す
   */
  test('未ログインユーザーは401エラーを返す', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: null,
      error: '認証が必要です。ログインしてください。',
      status: 401,
    })

    const request = new NextRequest('http://localhost:3000/api/channels')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('認証が必要です。ログインしてください。')

    // データベースクエリは実行されないはず
    expect(prisma.channelMember.findMany).not.toHaveBeenCalled()
  })

  /**
   * テスト3: チャンネル0件の場合
   * 空配列を返す
   */
  test('チャンネルが0件の場合は空配列を返す', async () => {
    const mockUser = {
      id: 'user-new',
      name: '新規ユーザー',
      email: 'new@example.com',
      authId: 'auth-new',
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

    ;(prisma.channelMember.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/channels')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.channels).toEqual([])
    expect(data.directMessages).toEqual([])
    expect(data.counts).toEqual({
      channels: 0,
      directMessages: 0,
    })
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

    // データベースエラーをシミュレート
    ;(prisma.channelMember.findMany as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = new NextRequest('http://localhost:3000/api/channels')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('チャンネルの取得に失敗しました')
    expect(data.details).toBe('Database connection failed')
  })

  /**
   * テスト5: チャンネルのみ（DMなし）
   * 通常のチャンネルだけが存在する場合
   */
  test('チャンネルのみ（DMなし）の場合を正しく処理する', async () => {
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

    const mockChannelMembers = [
      {
        id: 'member-1',
        userId: 'user-123',
        channelId: 'channel-1',
        channel: {
          id: 'channel-1',
          name: '一般',
          description: 'テストチャンネル',
          type: 'channel',
          creatorId: 'user-123',
          members: [
            { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', email: 'test@example.com', authId: 'auth-123', avatarUrl: null, lastSeen: new Date() } },
          ],
        },
      },
    ]

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    ;(prisma.channelMember.findMany as jest.Mock).mockResolvedValue(mockChannelMembers)

    const request = new NextRequest('http://localhost:3000/api/channels')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.channels).toHaveLength(1)
    expect(data.directMessages).toHaveLength(0)
    expect(data.counts).toEqual({
      channels: 1,
      directMessages: 0,
    })
  })

  /**
   * テスト6: DMのみ（チャンネルなし）
   * DMだけが存在する場合
   */
  test('DMのみ（チャンネルなし）の場合を正しく処理する', async () => {
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

    const mockChannelMembers = [
      {
        id: 'member-1',
        userId: 'user-123',
        channelId: 'dm-1',
        channel: {
          id: 'dm-1',
          name: null,
          description: null,
          type: 'dm',
          creatorId: 'user-123',
          members: [
            { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', email: 'test@example.com', authId: 'auth-123', avatarUrl: null, lastSeen: new Date() } },
            { userId: 'user-789', user: { id: 'user-789', name: 'DM相手', email: 'dm@example.com', authId: 'auth-789', avatarUrl: null, lastSeen: new Date() } },
          ],
        },
      },
    ]

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    ;(prisma.channelMember.findMany as jest.Mock).mockResolvedValue(mockChannelMembers)

    const request = new NextRequest('http://localhost:3000/api/channels')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.channels).toHaveLength(0)
    expect(data.directMessages).toHaveLength(1)
    expect(data.counts).toEqual({
      channels: 0,
      directMessages: 1,
    })
  })
})
