/**
 * チャンネル作成API（POST /api/channels）のユニットテスト
 *
 * テスト対象:
 * - 正常系: 新しいチャンネルを作成できる
 * - 正常系: 説明なしでチャンネルを作成できる
 * - バリデーションエラー: チャンネル名が空の場合は拒否される
 * - 重複エラー: 同名のチャンネルが既に存在する場合は409エラー
 * - 認証エラー: 未ログインユーザーは拒否される
 * - エラーハンドリング: データベースエラー時の適切なレスポンス
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/channels/route'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// モック設定
jest.mock('@/lib/auth-server')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

describe('POST /api/channels', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * テスト1: 正常系（説明あり）
   * チャンネル名と説明を指定して新しいチャンネルを作成できる
   */
  test('正常に新しいチャンネルを作成できる', async () => {
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

    const mockCreatedChannel = {
      id: 'channel-new',
      name: '新しいチャンネル',
      description: 'テスト用チャンネル',
      type: 'channel',
      creatorId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          id: 'member-1',
          userId: 'user-123',
          channelId: 'channel-new',
          user: {
            id: 'user-123',
            name: 'テストユーザー',
            email: 'test@example.com',
            authId: 'auth-123',
          },
        },
      ],
    }

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    // 同名チャンネルが存在しないことを確認
    ;(prisma.channel.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.channel.create as jest.Mock).mockResolvedValue(mockCreatedChannel)

    const requestBody = {
      name: '新しいチャンネル',
      description: 'テスト用チャンネル',
    }

    const request = new NextRequest('http://localhost:3000/api/channels', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.channel).toEqual({
      id: 'channel-new',
      name: '新しいチャンネル',
      description: 'テスト用チャンネル',
      memberCount: 1,
      createdBy: {
        name: 'テストユーザー',
        email: 'test@example.com',
      },
    })

    // モック関数が正しく呼ばれたか確認
    expect(prisma.channel.findFirst).toHaveBeenCalledWith({
      where: {
        name: '新しいチャンネル',
        type: 'channel',
      },
    })

    expect(prisma.channel.create).toHaveBeenCalledWith({
      data: {
        name: '新しいチャンネル',
        description: 'テスト用チャンネル',
        type: 'channel',
        creatorId: 'user-123',
        members: {
          create: {
            userId: 'user-123',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                authId: true,
              },
            },
          },
        },
      },
    })
  })

  /**
   * テスト2: 正常系（説明なし）
   * 説明を省略してチャンネルを作成できる
   */
  test('説明なしで新しいチャンネルを作成できる', async () => {
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

    const mockCreatedChannel = {
      id: 'channel-new',
      name: 'シンプルチャンネル',
      description: null,
      type: 'channel',
      creatorId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          id: 'member-1',
          userId: 'user-123',
          channelId: 'channel-new',
          user: {
            id: 'user-123',
            name: 'テストユーザー',
            email: 'test@example.com',
            authId: 'auth-123',
          },
        },
      ],
    }

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    ;(prisma.channel.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.channel.create as jest.Mock).mockResolvedValue(mockCreatedChannel)

    const requestBody = {
      name: 'シンプルチャンネル',
    }

    const request = new NextRequest('http://localhost:3000/api/channels', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.channel.name).toBe('シンプルチャンネル')
    expect(data.channel.description).toBeNull()

    // descriptionはnullで保存される
    expect(prisma.channel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'シンプルチャンネル',
          description: null,
        }),
      })
    )
  })

  /**
   * テスト3: バリデーションエラー（チャンネル名が空）
   * チャンネル名が空文字の場合は400エラーを返す
   */
  test('チャンネル名が空の場合は400エラーを返す', async () => {
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

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })

    const requestBody = {
      name: '',  // 空のチャンネル名
      description: 'テスト',
    }

    const request = new NextRequest('http://localhost:3000/api/channels', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('チャンネル名を入力してください')

    // データベースクエリは実行されないはず
    expect(prisma.channel.findFirst).not.toHaveBeenCalled()
    expect(prisma.channel.create).not.toHaveBeenCalled()
  })

  /**
   * テスト4: バリデーションエラー（チャンネル名がスペースのみ）
   * チャンネル名がスペースのみの場合は400エラーを返す
   */
  test('チャンネル名がスペースのみの場合は400エラーを返す', async () => {
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

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })

    const requestBody = {
      name: '   ',  // スペースのみ
      description: 'テスト',
    }

    const request = new NextRequest('http://localhost:3000/api/channels', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('チャンネル名を入力してください')
  })

  /**
   * テスト5: 重複エラー
   * 同名のチャンネルが既に存在する場合は409エラーを返す
   */
  test('同名のチャンネルが既に存在する場合は409エラーを返す', async () => {
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

    const existingChannel = {
      id: 'channel-existing',
      name: '既存チャンネル',
      description: '既に存在するチャンネル',
      type: 'channel',
      creatorId: 'user-456',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    ;(prisma.channel.findFirst as jest.Mock).mockResolvedValue(existingChannel)

    const requestBody = {
      name: '既存チャンネル',
      description: '新しいチャンネル',
    }

    const request = new NextRequest('http://localhost:3000/api/channels', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toBe('このチャンネル名は既に使用されています')

    // createは実行されないはず
    expect(prisma.channel.create).not.toHaveBeenCalled()
  })

  /**
   * テスト6: 認証エラー
   * 未ログインユーザーは401エラーを返す
   */
  test('未ログインユーザーは401エラーを返す', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: null,
      error: '認証が必要です。ログインしてください。',
      status: 401,
    })

    const requestBody = {
      name: '新しいチャンネル',
      description: 'テスト',
    }

    const request = new NextRequest('http://localhost:3000/api/channels', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('認証が必要です。ログインしてください。')

    // データベースクエリは実行されないはず
    expect(prisma.channel.findFirst).not.toHaveBeenCalled()
    expect(prisma.channel.create).not.toHaveBeenCalled()
  })

  /**
   * テスト7: データベースエラー
   * チャンネル作成時にエラーが発生した場合は500エラーを返す
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

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    ;(prisma.channel.findFirst as jest.Mock).mockResolvedValue(null)

    // データベースエラーをシミュレート
    ;(prisma.channel.create as jest.Mock).mockRejectedValue(
      new Error('Database constraint violation')
    )

    const requestBody = {
      name: '新しいチャンネル',
      description: 'テスト',
    }

    const request = new NextRequest('http://localhost:3000/api/channels', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('チャンネルの作成に失敗しました')
    expect(data.details).toBe('Database constraint violation')
  })
})
