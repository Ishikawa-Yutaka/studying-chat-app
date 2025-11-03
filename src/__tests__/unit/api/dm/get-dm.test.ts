/**
 * DM取得・作成API（GET /api/dm/[partnerId]）のユニットテスト
 *
 * テスト対象:
 * - 正常系: 新規DMチャンネルを作成できる
 * - 正常系: 既存のDMチャンネルを取得できる
 * - 正常系: 退出済みのDMチャンネルに再参加できる
 * - バリデーションエラー: myUserIdが指定されていない場合は400エラー
 * - エラー: 自分のユーザー情報が見つからない場合は404エラー
 * - エラー: DM相手が見つからない場合は404エラー
 * - エラーハンドリング: データベースエラー時の適切なレスポンス
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/dm/[partnerId]/route'
import { prisma } from '@/lib/prisma'

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    channel: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    channelMember: {
      create: jest.fn(),
    },
  },
}))

describe('GET /api/dm/[partnerId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * テスト1: 正常系（新規DMチャンネル作成）
   * 既存のDMチャンネルがない場合、新しいDMチャンネルを作成する
   */
  test('新規DMチャンネルを作成できる', async () => {
    const mockMyUser = {
      id: 'user-123',
      name: '自分',
      email: 'me@example.com',
      authId: 'auth-123',
      avatarUrl: null,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockPartner = {
      id: 'user-456',
      name: '相手',
      email: 'partner@example.com',
      authId: 'auth-456',
      avatarUrl: null,
      lastSeen: new Date(),
    }

    const mockNewDmChannel = {
      id: 'dm-new',
      name: '自分 & 相手',
      description: '自分と相手のダイレクトメッセージ',
      type: 'dm',
      creatorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        { userId: 'user-123', user: mockMyUser },
        { userId: 'user-456', user: mockPartner },
      ],
    }

    // モック設定
    ;(prisma.user.findFirst as jest.Mock)
      .mockResolvedValueOnce(mockMyUser)  // 自分のユーザー情報
      .mockResolvedValueOnce(mockPartner) // 相手のユーザー情報

    ;(prisma.channel.findMany as jest.Mock).mockResolvedValue([]) // 既存DMなし
    ;(prisma.channel.create as jest.Mock).mockResolvedValue(mockNewDmChannel)

    const request = new NextRequest('http://localhost:3000/api/dm/auth-456?myUserId=auth-123')
    const params = Promise.resolve({ partnerId: 'auth-456' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.created).toBe(true)
    expect(data.dmChannel).toMatchObject({
      id: 'dm-new',
      type: 'dm',
    })
    expect(data.dmChannel.partner.name).toBe('相手')

    // 新規作成が呼ばれたか確認
    expect(prisma.channel.create).toHaveBeenCalledWith({
      data: {
        name: '自分 & 相手',
        description: '自分と相手のダイレクトメッセージ',
        type: 'dm',
        members: {
          create: [
            { userId: 'user-123' },
            { userId: 'user-456' },
          ],
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
                avatarUrl: true,
                // lastSeenは userBasicSelect に含まれない
              },
            },
          },
        },
      },
    })
  })

  /**
   * テスト2: 正常系（既存DMチャンネル取得）
   * 既にDMチャンネルが存在する場合、そのチャンネルを返す
   */
  test('既存のDMチャンネルを取得できる', async () => {
    const mockMyUser = {
      id: 'user-123',
      name: '自分',
      email: 'me@example.com',
      authId: 'auth-123',
      avatarUrl: null,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockPartner = {
      id: 'user-456',
      name: '相手',
      email: 'partner@example.com',
      authId: 'auth-456',
      avatarUrl: null,
      lastSeen: new Date(),
    }

    const mockExistingDmChannel = {
      id: 'dm-existing',
      name: '自分 & 相手',
      description: '既存のDM',
      type: 'dm',
      creatorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        { userId: 'user-123', user: mockMyUser },
        { userId: 'user-456', user: mockPartner },
      ],
    }

    ;(prisma.user.findFirst as jest.Mock)
      .mockResolvedValueOnce(mockMyUser)
      .mockResolvedValueOnce(mockPartner)

    ;(prisma.channel.findMany as jest.Mock).mockResolvedValue([mockExistingDmChannel])

    const request = new NextRequest('http://localhost:3000/api/dm/auth-456?myUserId=auth-123')
    const params = Promise.resolve({ partnerId: 'auth-456' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.created).toBeUndefined() // 新規作成ではない
    expect(data.dmChannel.id).toBe('dm-existing')

    // 新規作成は呼ばれないはず
    expect(prisma.channel.create).not.toHaveBeenCalled()
  })

  /**
   * テスト3: 正常系（退出済みDMに再参加）
   * 自分が退出済みのDMチャンネルに再度参加する
   */
  test('退出済みのDMチャンネルに再参加できる', async () => {
    const mockMyUser = {
      id: 'user-123',
      name: '自分',
      email: 'me@example.com',
      authId: 'auth-123',
      avatarUrl: null,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockPartner = {
      id: 'user-456',
      name: '相手',
      email: 'partner@example.com',
      authId: 'auth-456',
      avatarUrl: null,
      lastSeen: new Date(),
    }

    // 自分がメンバーから外れているDMチャンネル
    const mockExitedDmChannel = {
      id: 'dm-exited',
      name: '自分 & 相手',
      description: '退出済みDM',
      type: 'dm',
      creatorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        { userId: 'user-456', user: mockPartner }, // 相手のみ
      ],
    }

    ;(prisma.user.findFirst as jest.Mock)
      .mockResolvedValueOnce(mockMyUser)
      .mockResolvedValueOnce(mockPartner)

    ;(prisma.channel.findMany as jest.Mock).mockResolvedValue([mockExitedDmChannel])
    ;(prisma.channelMember.create as jest.Mock).mockResolvedValue({
      id: 'member-new',
      userId: 'user-123',
      channelId: 'dm-exited',
    })

    const request = new NextRequest('http://localhost:3000/api/dm/auth-456?myUserId=auth-123')
    const params = Promise.resolve({ partnerId: 'auth-456' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.dmChannel.id).toBe('dm-exited')

    // 再参加処理が呼ばれたか確認
    expect(prisma.channelMember.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        channelId: 'dm-exited',
      },
    })
  })

  /**
   * テスト4: バリデーションエラー（myUserIdなし）
   * クエリパラメータにmyUserIdが指定されていない場合は400エラー
   */
  test('myUserIdが指定されていない場合は400エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/dm/auth-456') // myUserIdなし
    const params = Promise.resolve({ partnerId: 'auth-456' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('現在のユーザーIDが必要です')

    // データベースクエリは実行されないはず
    expect(prisma.user.findFirst).not.toHaveBeenCalled()
  })

  /**
   * テスト5: エラー（自分のユーザー情報が見つからない）
   * SupabaseのauthIdに対応するPrismaユーザーが存在しない場合は404エラー
   */
  test('自分のユーザー情報が見つからない場合は404エラーを返す', async () => {
    ;(prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null) // 自分が見つからない

    const request = new NextRequest('http://localhost:3000/api/dm/auth-456?myUserId=auth-unknown')
    const params = Promise.resolve({ partnerId: 'auth-456' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('自分のユーザー情報が見つかりません')
  })

  /**
   * テスト6: エラー（DM相手が見つからない）
   * DM相手のユーザー情報が存在しない場合は404エラー
   */
  test('DM相手が見つからない場合は404エラーを返す', async () => {
    const mockMyUser = {
      id: 'user-123',
      name: '自分',
      email: 'me@example.com',
      authId: 'auth-123',
      avatarUrl: null,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(prisma.user.findFirst as jest.Mock)
      .mockResolvedValueOnce(mockMyUser)  // 自分は見つかる
      .mockResolvedValueOnce(null)        // 相手が見つからない

    const request = new NextRequest('http://localhost:3000/api/dm/auth-unknown?myUserId=auth-123')
    const params = Promise.resolve({ partnerId: 'auth-unknown' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('DM相手が見つかりません')
  })

  /**
   * テスト7: データベースエラー
   * Prismaクエリ失敗時に500エラーを返す
   */
  test('データベースエラー時に500エラーを返す', async () => {
    ;(prisma.user.findFirst as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = new NextRequest('http://localhost:3000/api/dm/auth-456?myUserId=auth-123')
    const params = Promise.resolve({ partnerId: 'auth-456' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('DMチャンネルの取得に失敗しました')
    expect(data.details).toBe('Database connection failed')
  })
})
