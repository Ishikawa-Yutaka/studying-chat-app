/**
 * /api/avatar/upload エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/avatar/upload/route.ts
 *
 * このテストでは、アバター画像アップロードAPIの
 * 動作を確認します。
 *
 * テストする機能:
 * - アバター画像アップロード（POST）
 * - 認証チェック
 * - ファイル検証（サイズ、MIME type）
 * - Supabase Storageへのアップロード
 * - データベース更新
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/avatar/upload/route';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';

// モック設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-server');
jest.mock('@/lib/supabase/server');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('POST /api/avatar/upload - アバター画像アップロード', () => {
  // テスト用データ
  const mockUser = {
    id: 'user-123',
    authId: 'auth-123',
    name: 'テストユーザー',
    email: 'test@example.com',
    avatarUrl: null,
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // モック用のSupabaseクライアント
  const mockSupabaseStorage = {
    upload: jest.fn(),
    getPublicUrl: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトの認証モック
    mockGetCurrentUser.mockResolvedValue({
      user: mockUser,
      error: null,
      status: 200,
    });

    // デフォルトのSupabaseモック
    mockCreateClient.mockResolvedValue({
      storage: {
        from: jest.fn().mockReturnValue(mockSupabaseStorage),
      },
    } as any);

    // デフォルトのアップロード成功モック
    mockSupabaseStorage.upload.mockResolvedValue({
      data: { path: 'auth-123-1234567890.jpg' },
      error: null,
    });

    mockSupabaseStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/avatars/auth-123-1234567890.jpg' },
    });

    // Prisma更新成功モック
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      avatarUrl: 'https://example.supabase.co/storage/v1/object/public/avatars/auth-123-1234567890.jpg',
    });
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('画像ファイルを正常にアップロードできる（JPEG）', async () => {
      // ファイルデータ作成（JPEG）
      const fileContent = new Blob(['fake image content'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' });

      // FormData作成
      const formData = new FormData();
      formData.append('avatar', file);

      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      // API実行
      const response = await POST(request);
      const data = await response.json();

      // レスポンス確認
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('アバター画像をアップロードしました');
      expect(data.avatarUrl).toContain('https://example.supabase.co/storage');

      // Supabase Storageが呼ばれているか確認
      expect(mockSupabaseStorage.upload).toHaveBeenCalled();
      expect(mockSupabaseStorage.getPublicUrl).toHaveBeenCalled();

      // Prismaが更新されているか確認
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatarUrl: expect.stringContaining('https://') },
      });
    });

    test('PNG画像をアップロードできる', async () => {
      const fileContent = new Blob(['fake png content'], { type: 'image/png' });
      const file = new File([fileContent], 'avatar.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('WebP画像をアップロードできる', async () => {
      const fileContent = new Blob(['fake webp content'], { type: 'image/webp' });
      const file = new File([fileContent], 'avatar.webp', { type: 'image/webp' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('GIF画像をアップロードできる', async () => {
      const fileContent = new Blob(['fake gif content'], { type: 'image/gif' });
      const file = new File([fileContent], 'avatar.gif', { type: 'image/gif' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('upsert=trueで同じファイル名を上書きできる', async () => {
      const fileContent = new Blob(['fake image'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      // uploadがupsert:trueで呼ばれているか確認
      expect(mockSupabaseStorage.upload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(File),
        expect.objectContaining({ upsert: true })
      );
    });
  });

  /**
   * バリデーションエラー
   */
  describe('バリデーションエラー', () => {
    test('ファイルが含まれていない場合、400エラーを返す', async () => {
      // 空のFormData
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('ファイルが必要です');
    });

    test('ファイルサイズが2MBを超える場合、400エラーを返す', async () => {
      // 3MBのファイルを作成
      const largeContent = new Blob([new ArrayBuffer(3 * 1024 * 1024)], { type: 'image/jpeg' });
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ファイルサイズは2MB以下にしてください');
    });

    test('許可されていないMIME type（PDF）の場合、400エラーを返す', async () => {
      const pdfContent = new Blob(['fake pdf'], { type: 'application/pdf' });
      const file = new File([pdfContent], 'document.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('画像ファイル（JPEG、PNG、WebP、GIF）のみアップロード可能です');
    });

    test('許可されていないMIME type（SVG）の場合、400エラーを返す', async () => {
      const svgContent = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      const file = new File([svgContent], 'icon.svg', { type: 'image/svg+xml' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('画像ファイル（JPEG、PNG、WebP、GIF）のみアップロード可能です');
    });
  });

  /**
   * 認証エラー
   */
  describe('認証エラー', () => {
    test('未認証ユーザーの場合、401エラーを返す', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です',
        status: 401,
      });

      const fileContent = new Blob(['fake image'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です');
    });

    test('認証エラー時、ファイルアップロードは実行されない', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です',
        status: 401,
      });

      const fileContent = new Blob(['fake image'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      // Supabase Storageは呼ばれない
      expect(mockSupabaseStorage.upload).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  /**
   * Supabase Storageエラー
   */
  describe('Supabase Storageエラー', () => {
    test('Supabaseアップロードエラー時、500エラーを返す', async () => {
      mockSupabaseStorage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      const fileContent = new Blob(['fake image'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('アップロードに失敗しました');

      // Prismaは更新されない
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  /**
   * データベースエラー
   */
  describe('データベースエラー', () => {
    test('Prisma更新エラー時、500エラーを返す', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('DB connection failed'));

      const fileContent = new Blob(['fake image'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('サーバーエラーが発生しました');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, avatarUrl, messageフィールドを含む', async () => {
      const fileContent = new Blob(['fake image'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('avatarUrl');
      expect(data).toHaveProperty('message');
      expect(data.success).toBe(true);
    });

    test('エラー時、success, errorフィールドを含む', async () => {
      mockGetCurrentUser.mockResolvedValue({
        user: null,
        error: '認証が必要です',
        status: 401,
      });

      const fileContent = new Blob(['fake image'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(data).not.toHaveProperty('avatarUrl');
    });
  });
});
