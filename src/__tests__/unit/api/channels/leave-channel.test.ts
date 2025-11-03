/**
 * チャンネル退出API（DELETE /api/channels/leave/[channelId]）のユニットテスト
 *
 * テスト対象:
 * - 正常系: チャンネルから正常に退出できる
 * - 認証エラー: 未ログインユーザーは拒否される
 * - エラー: 存在しないチャンネルは404エラー
 * - エラー: チャンネルメンバーでないユーザーは403エラー
 * - エラーハンドリング: データベースエラー時の適切なレスポンス
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/channels/leave/[channelId]/route'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// モック設定
jest.mock('@/lib/auth-server')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findUnique: jest.fn(),
    },
    channelMember: {
      deleteMany: jest.fn(),
    },
  },
}))

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

describe('DELETE /api/channels/leave/[channelId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * テスト1: 正常系
   * チャンネルから正常に退出できる
   */
  test('チャンネルから正常に退出できる', async () => {
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
      members: [
        { userId: 'user-123' },
        { userId: 'user-456' },
      ],
    }

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(mockChannel)
    ;(prisma.channelMember.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.channelName).toBe('一般')
    expect(data.message).toBe('チャンネルから退出しました')

    // モック関数が正しく呼ばれたか確認
    expect(prisma.channel.findUnique).toHaveBeenCalledWith({
      where: { id: 'channel-1' },
      select: {
        id: true,
        name: true,
        members: {
          select: {
            userId: true,
          },
        },
      },
    })

    expect(prisma.channelMember.deleteMany).toHaveBeenCalledWith({
      where: {
        channelId: 'channel-1',
        userId: 'user-123',
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

    const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('認証が必要です。ログインしてください。')

    // データベースクエリは実行されないはず
    expect(prisma.channel.findUnique).not.toHaveBeenCalled()
  })

  /**
   * テスト3: 存在しないチャンネル
   * チャンネルが見つからない場合は404エラー
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

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/channels/leave/non-existent', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ channelId: 'non-existent' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('チャンネルが見つかりません')

    // 削除処理は実行されないはず
    expect(prisma.channelMember.deleteMany).not.toHaveBeenCalled()
  })

  /**
   * テスト4: メンバーでないユーザー
   * チャンネルメンバーでないユーザーは403エラー
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

    const mockChannel = {
      id: 'channel-1',
      name: '一般',
      members: [
        { userId: 'user-456' }, // 他のユーザーのみ
        { userId: 'user-789' },
      ],
    }

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(mockChannel)

    const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('このチャンネルのメンバーではありません')

    // 削除処理は実行されないはず
    expect(prisma.channelMember.deleteMany).not.toHaveBeenCalled()
  })

  /**
   * テスト5: データベースエラー
   * チャンネルメンバー削除時にエラーが発生した場合は500エラー
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

    const mockChannel = {
      id: 'channel-1',
      name: '一般',
      members: [
        { userId: 'user-123' },
      ],
    }

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(mockChannel)
    ;(prisma.channelMember.deleteMany as jest.Mock).mockRejectedValue(
      new Error('Database constraint violation')
    )

    const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('チャンネルからの退出に失敗しました')
    expect(data.details).toBe('Database constraint violation')
  })

  /**
   * テスト6: 最後のメンバーが退出する場合
   * チャンネルに自分だけがメンバーの場合でも正常に退出できる
   */
  test('最後のメンバーが退出する場合も正常に処理できる', async () => {
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
      members: [
        { userId: 'user-123' }, // 自分だけ
      ],
    }

    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    })

    ;(prisma.channel.findUnique as jest.Mock).mockResolvedValue(mockChannel)
    ;(prisma.channelMember.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const request = new NextRequest('http://localhost:3000/api/channels/leave/channel-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ channelId: 'channel-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('チャンネルから退出しました')

    // 削除処理が実行されたか確認
    expect(prisma.channelMember.deleteMany).toHaveBeenCalledWith({
      where: {
        channelId: 'channel-1',
        userId: 'user-123',
      },
    })
  })
})
