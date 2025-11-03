/**
 * ダッシュボード統計情報取得API（GET /api/dashboard）のユニットテスト
 *
 * テスト対象:
 * - 正常系: ダッシュボード統計情報を取得できる
 * - 正常系: チャンネルとDMの統計を正しく集計できる
 * - 正常系: DM相手ごとのメッセージ統計を取得できる
 * - 認証エラー: 未ログインユーザーは拒否される
 * - エラーハンドリング: データベースエラー時の適切なレスポンス
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/dashboard/route'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// モック設定
jest.mock('@/lib/auth-server')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channelMember: {
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    channel: {
      findMany: jest.fn(),
    },
    message: {
      count: jest.fn(),
    },
  },
}))

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * テスト1: 正常系
   * ダッシュボード統計情報を正しく取得できる
   */
  test('ダッシュボード統計情報を取得できる', async () => {
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

    // ユーザーが参加しているチャンネル・DM
    const mockUserChannels = [
      {
        id: 'member-1',
        userId: 'user-123',
        channelId: 'channel-1',
        channel: {
          id: 'channel-1',
          name: '一般',
          description: '一般チャンネル',
          type: 'channel',
          members: [
            { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', authId: 'auth-123', avatarUrl: null, lastSeen: new Date() } },
            { userId: 'user-456', user: { id: 'user-456', name: 'ユーザー2', authId: 'auth-456', avatarUrl: null, lastSeen: new Date() } },
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
          members: [
            { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', authId: 'auth-123', email: 'test@example.com', avatarUrl: null, lastSeen: new Date() } },
            { userId: 'user-789', user: { id: 'user-789', name: 'DM相手', authId: 'auth-789', email: 'dm@example.com', avatarUrl: 'https://example.com/avatar.jpg', lastSeen: new Date() } },
          ],
        },
      },
    ]

    // 全チャンネル（参加・未参加問わず）
    const mockAllChannels = [
      {
        id: 'channel-1',
        name: '一般',
        description: '一般チャンネル',
        type: 'channel',
        members: [
          { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', authId: 'auth-123', lastSeen: new Date() } },
          { userId: 'user-456', user: { id: 'user-456', name: 'ユーザー2', authId: 'auth-456', lastSeen: new Date() } },
        ],
      },
      {
        id: 'channel-2',
        name: 'ランダム',
        description: '雑談チャンネル',
        type: 'channel',
        members: [
          { userId: 'user-456', user: { id: 'user-456', name: 'ユーザー2', authId: 'auth-456', lastSeen: new Date() } },
        ],
      },
    ]

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    ;(prisma.channelMember.findMany as jest.Mock).mockResolvedValue(mockUserChannels)
    ;(prisma.user.count as jest.Mock).mockResolvedValue(10) // 全ユーザー数
    ;(prisma.channel.findMany as jest.Mock).mockResolvedValue(mockAllChannels)

    // DM統計用のメッセージ数カウント
    ;(prisma.message.count as jest.Mock)
      .mockResolvedValueOnce(5)  // 自分が送信したメッセージ数
      .mockResolvedValueOnce(3)  // 相手から受信したメッセージ数

    const request = new NextRequest('http://localhost:3000/api/dashboard')
    const response = await GET(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // 統計情報の確認
    expect(data.stats).toEqual({
      channelCount: 1,      // 自分が参加しているチャンネル数
      dmPartnerCount: 1,    // DM相手の人数
      totalUserCount: 10,   // ワークスペース全体のメンバー数
    })

    // 全チャンネル一覧（参加・未参加問わず）
    expect(data.allChannels).toHaveLength(2)
    expect(data.allChannels[0]).toEqual({
      id: 'channel-1',
      name: '一般',
      description: '一般チャンネル',
      memberCount: 2,
    })

    // 自分が参加しているチャンネル
    expect(data.myChannels).toHaveLength(1)
    expect(data.myChannels[0]).toEqual({
      id: 'channel-1',
      name: '一般',
      description: '一般チャンネル',
      memberCount: 2,
    })

    // DM一覧
    expect(data.directMessages).toHaveLength(1)
    expect(data.directMessages[0]).toEqual({
      id: 'dm-1',
      partnerId: 'auth-789',
      partnerName: 'DM相手',
      partnerEmail: 'dm@example.com',
      partnerAvatarUrl: 'https://example.com/avatar.jpg',
    })

    // DM統計
    expect(data.dmStats).toHaveLength(1)
    expect(data.dmStats[0]).toEqual({
      partnerId: 'auth-789',
      partnerName: 'DM相手',
      partnerEmail: 'dm@example.com',
      partnerAvatarUrl: 'https://example.com/avatar.jpg',
      sentCount: 5,         // 自分が送信
      receivedCount: 3,     // 相手から受信
      totalCount: 8,        // 合計
    })

    // モック関数の呼び出し確認
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
    expect(prisma.channelMember.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
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
   * テスト2: チャンネルとDMが0件の場合
   * 新規ユーザーで何も参加していない場合のレスポンス
   */
  test('チャンネルとDMが0件の場合を正しく処理する', async () => {
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
    ;(prisma.user.count as jest.Mock).mockResolvedValue(5)
    ;(prisma.channel.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/dashboard')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.stats).toEqual({
      channelCount: 0,
      dmPartnerCount: 0,
      totalUserCount: 5,
    })
    expect(data.allChannels).toEqual([])
    expect(data.myChannels).toEqual([])
    expect(data.directMessages).toEqual([])
    expect(data.dmStats).toEqual([])
  })

  /**
   * テスト3: 認証エラー
   * 未ログインユーザーは401エラーを返す
   */
  test('未ログインユーザーは401エラーを返す', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: null,
      error: '認証が必要です。ログインしてください。',
      status: 401,
    })

    const request = new NextRequest('http://localhost:3000/api/dashboard')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('認証が必要です。ログインしてください。')

    // データベースクエリは実行されないはず
    expect(prisma.channelMember.findMany).not.toHaveBeenCalled()
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

    ;(prisma.channelMember.findMany as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = new NextRequest('http://localhost:3000/api/dashboard')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('ダッシュボード統計の取得に失敗しました')
    expect(data.details).toBe('Database connection failed')
  })

  /**
   * テスト5: DM相手が複数人いる場合
   * 複数のDMチャンネルの統計を正しく集計できる
   */
  test('複数のDMチャンネルの統計を正しく集計できる', async () => {
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

    const mockUserChannels = [
      {
        id: 'member-1',
        userId: 'user-123',
        channelId: 'dm-1',
        channel: {
          id: 'dm-1',
          name: null,
          description: null,
          type: 'dm',
          members: [
            { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', authId: 'auth-123', email: 'test@example.com', avatarUrl: null, lastSeen: new Date() } },
            { userId: 'user-456', user: { id: 'user-456', name: '相手A', authId: 'auth-456', email: 'a@example.com', avatarUrl: null, lastSeen: new Date() } },
          ],
        },
      },
      {
        id: 'member-2',
        userId: 'user-123',
        channelId: 'dm-2',
        channel: {
          id: 'dm-2',
          name: null,
          description: null,
          type: 'dm',
          members: [
            { userId: 'user-123', user: { id: 'user-123', name: 'テストユーザー', authId: 'auth-123', email: 'test@example.com', avatarUrl: null, lastSeen: new Date() } },
            { userId: 'user-789', user: { id: 'user-789', name: '相手B', authId: 'auth-789', email: 'b@example.com', avatarUrl: null, lastSeen: new Date() } },
          ],
        },
      },
    ]

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    ;(prisma.channelMember.findMany as jest.Mock).mockResolvedValue(mockUserChannels)
    ;(prisma.user.count as jest.Mock).mockResolvedValue(10)
    ;(prisma.channel.findMany as jest.Mock).mockResolvedValue([])

    // DM統計用のメッセージ数カウント（2つのDM）
    ;(prisma.message.count as jest.Mock)
      .mockResolvedValueOnce(10) // DM1: 自分が送信
      .mockResolvedValueOnce(5)  // DM1: 相手から受信
      .mockResolvedValueOnce(2)  // DM2: 自分が送信
      .mockResolvedValueOnce(8)  // DM2: 相手から受信

    const request = new NextRequest('http://localhost:3000/api/dashboard')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats.dmPartnerCount).toBe(2)
    expect(data.dmStats).toHaveLength(2)

    // 1つ目のDM統計
    expect(data.dmStats[0]).toMatchObject({
      partnerId: 'auth-456',
      partnerName: '相手A',
      sentCount: 10,
      receivedCount: 5,
      totalCount: 15,
    })

    // 2つ目のDM統計
    expect(data.dmStats[1]).toMatchObject({
      partnerId: 'auth-789',
      partnerName: '相手B',
      sentCount: 2,
      receivedCount: 8,
      totalCount: 10,
    })
  })
})
