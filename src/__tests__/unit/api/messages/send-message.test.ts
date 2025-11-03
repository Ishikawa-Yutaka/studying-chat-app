/**
 * メッセージ送信API（POST /api/messages/[channelId]）のユニットテスト
 *
 * テスト対象:
 * - 正常系: テキストメッセージを送信できる
 * - 正常系: ファイル付きメッセージを送信できる
 * - バリデーションエラー: 空のメッセージは拒否される
 * - 認証エラー: 未ログインユーザーは拒否される
 * - メンバーシップエラー: チャンネルメンバーでないユーザーは拒否される
 * - チャンネル存在チェック: 存在しないチャンネルは404エラー
 * - ユーザー存在チェック: 送信者が見つからない場合は404エラー
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/messages/[channelId]/route'
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// モック設定
jest.mock('@/lib/auth-server')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
  },
}))

// 型定義
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockCheckChannelMembership = checkChannelMembership as jest.MockedFunction<typeof checkChannelMembership>

describe('POST /api/messages/[channelId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * テスト1: 正常系（テキストメッセージ）
   * 認証済みユーザーがテキストメッセージを送信できる
   */
  test('正常にテキストメッセージを送信できる', async () => {
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

    const mockChannel = {
      id: 'channel-1',
      name: '一般',
      description: 'テストチャンネル',
      type: 'channel',
      creatorId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockCreatedMessage = {
      id: 'msg-new',
      content: 'こんにちは',
      senderId: 'user-123',
      channelId: 'channel-1',
      parentMessageId: null,
      fileUrl: null,
      fileName: null,
      fileType: null,
      fileSize: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: {
        id: 'user-123',
        name: 'テストユーザー',
        email: 'test@example.com',
        authId: 'auth-123',
        avatarUrl: null,
      },
    }

    // モック設定
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

    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(mockChannel)
    ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.message.create as jest.Mock).mockResolvedValue(mockCreatedMessage)

    // リクエスト作成
    const requestBody = {
      content: 'こんにちは',
      senderId: 'auth-123', // Supabase AuthID
    }

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const params = Promise.resolve({ channelId: 'channel-1' })

    // API実行
    const response = await POST(request, { params })
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.message.content).toBe('こんにちは')
    expect(data.message.sender.name).toBe('テストユーザー')

    // Prismaメソッドが正しく呼ばれたか確認
    expect(prisma.channel.findUnique).toHaveBeenCalledWith({
      where: { id: 'channel-1' },
    })
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { authId: 'auth-123' },
    })
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        content: 'こんにちは',
        senderId: 'user-123', // Prisma内部ID
        channelId: 'channel-1',
        fileUrl: null,
        fileName: null,
        fileType: null,
        fileSize: null,
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
      },
    })
  })

  /**
   * テスト2: 正常系（ファイル付きメッセージ）
   * ファイルを添付したメッセージを送信できる
   */
  test('ファイル付きメッセージを送信できる', async () => {
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

    const mockChannel = {
      id: 'channel-1',
      name: '一般',
      description: null,
      type: 'channel',
      creatorId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockCreatedMessage = {
      id: 'msg-new',
      content: 'ファイルを共有します',
      senderId: 'user-123',
      channelId: 'channel-1',
      parentMessageId: null,
      fileUrl: 'https://example.com/file.pdf',
      fileName: 'document.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: {
        id: 'user-123',
        name: 'テストユーザー',
        email: 'test@example.com',
        authId: 'auth-123',
        avatarUrl: null,
      },
    }

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    mockCheckChannelMembership.mockResolvedValue({ isMember: true, error: null, status: 200 })
    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(mockChannel)
    ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.message.create as jest.Mock).mockResolvedValue(mockCreatedMessage)

    const requestBody = {
      content: 'ファイルを共有します',
      senderId: 'auth-123',
      fileUrl: 'https://example.com/file.pdf',
      fileName: 'document.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
    }

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const params = Promise.resolve({ channelId: 'channel-1' })
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.message.fileUrl).toBe('https://example.com/file.pdf')
    expect(data.message.fileName).toBe('document.pdf')
  })

  /**
   * テスト3: バリデーションエラー（空のメッセージ）
   * contentとfileUrlの両方が空の場合は400エラー
   */
  test('空のメッセージは400エラーを返す', async () => {
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
    mockCheckChannelMembership.mockResolvedValue({ isMember: true, error: null, status: 200 })

    const requestBody = {
      content: '',  // 空のメッセージ
      senderId: 'auth-123',
    }

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const params = Promise.resolve({ channelId: 'channel-1' })
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  /**
   * テスト4: 認証エラー
   * 未ログインユーザーは401エラーを返す
   */
  test('未ログインユーザーは401エラーを返す', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: null,
      error: '認証が必要です。ログインしてください。',
      status: 401,
    })

    const requestBody = {
      content: 'こんにちは',
      senderId: 'auth-123',
    }

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const params = Promise.resolve({ channelId: 'channel-1' })
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('認証が必要です。ログインしてください。')
  })

  /**
   * テスト5: メンバーシップエラー
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

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    mockCheckChannelMembership.mockResolvedValue({
      isMember: false,
      error: 'このチャンネルにアクセスする権限がありません',
      status: 403,
    })

    const requestBody = {
      content: 'こんにちは',
      senderId: 'auth-123',
    }

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const params = Promise.resolve({ channelId: 'channel-1' })
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })

  /**
   * テスト6: チャンネルが存在しない
   * 存在しないチャンネルIDの場合は404エラー
   */
  test('存在しないチャンネルは404エラーを返す', async () => {
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
    mockCheckChannelMembership.mockResolvedValue({ isMember: true, error: null, status: 200 })
    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(null) // チャンネルが見つからない

    const requestBody = {
      content: 'こんにちは',
      senderId: 'auth-123',
    }

    const request = new NextRequest('http://localhost:3000/api/messages/non-existent-channel', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const params = Promise.resolve({ channelId: 'non-existent-channel' })
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('チャンネルが見つかりません')
  })

  /**
   * テスト7: 送信者ユーザーが見つからない
   * SupabaseのAuthIDに対応するPrismaユーザーが見つからない場合は404エラー
   */
  test('送信者が見つからない場合は404エラーを返す', async () => {
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

    const mockChannel = {
      id: 'channel-1',
      name: '一般',
      description: null,
      type: 'channel',
      creatorId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockGetCurrentUser.mockResolvedValue({ user: mockUser, error: null, status: 200 })
    mockCheckChannelMembership.mockResolvedValue({ isMember: true, error: null, status: 200 })
    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(mockChannel)
    ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(null) // ユーザーが見つからない

    const requestBody = {
      content: 'こんにちは',
      senderId: 'auth-unknown',
    }

    const request = new NextRequest('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const params = Promise.resolve({ channelId: 'channel-1' })
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('送信者が見つかりません')
  })
})
