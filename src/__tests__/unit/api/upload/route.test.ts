/**
 * /api/upload エンドポイントのユニットテスト
 *
 * テスト対象: src/app/api/upload/route.ts
 *
 * このテストでは、ファイルアップロードAPIの
 * 動作を確認します。
 *
 * テストする機能:
 * - ファイルアップロード（POST）
 * - 認証チェック
 * - ファイル検証（サイズ、形式）
 * - Supabase Storageへのアップロード
 * - エラーハンドリング
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/route';
import { createClient } from '@/lib/supabase/server';

// モック設定
jest.mock('@/lib/supabase/server');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('POST /api/upload - ファイルアップロード', () => {
  // テスト用データ
  const mockSupabaseUser = {
    id: 'auth-123',
    email: 'test@example.com',
  };

  const mockSupabaseStorage = {
    upload: jest.fn(),
    getPublicUrl: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのSupabaseモック
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        }),
      },
      storage: {
        from: jest.fn().mockReturnValue(mockSupabaseStorage),
      },
    } as any);

    // デフォルトのアップロード成功モック
    mockSupabaseStorage.upload.mockResolvedValue({
      data: { path: 'uploads/1234567890_abc123.jpg' },
      error: null,
    });

    mockSupabaseStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/chat-files/1234567890_abc123.jpg' },
    });
  });

  /**
   * 正常系テスト
   */
  describe('正常系', () => {
    test('画像ファイルを正常にアップロードできる（PNG）', async () => {
      const fileContent = new Blob(['fake image content'], { type: 'image/png' });
      const file = new File([fileContent], 'test.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.file).toBeDefined();
      expect(data.file.url).toContain('https://example.supabase.co');
      expect(data.file.name).toBe('test.png');
      expect(data.file.type).toBe('image/png');

      expect(mockSupabaseStorage.upload).toHaveBeenCalled();
      expect(mockSupabaseStorage.getPublicUrl).toHaveBeenCalled();
    });

    test('JPEG画像をアップロードできる', async () => {
      const fileContent = new Blob(['fake jpeg'], { type: 'image/jpeg' });
      const file = new File([fileContent], 'photo.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('PDFファイルをアップロードできる', async () => {
      const fileContent = new Blob(['fake pdf'], { type: 'application/pdf' });
      const file = new File([fileContent], 'document.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('動画ファイル（MP4）をアップロードできる', async () => {
      const fileContent = new Blob(['fake video'], { type: 'video/mp4' });
      const file = new File([fileContent], 'video.mp4', { type: 'video/mp4' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('ZIP圧縮ファイルをアップロードできる', async () => {
      const fileContent = new Blob(['fake zip'], { type: 'application/zip' });
      const file = new File([fileContent], 'archive.zip', { type: 'application/zip' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  /**
   * バリデーションエラー
   */
  describe('バリデーションエラー', () => {
    test('ファイルが含まれていない場合、400エラーを返す', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('ファイルが選択されていません');
    });

    test('ファイルサイズが10MBを超える場合、400エラーを返す', async () => {
      // 11MBのファイルを作成
      const largeContent = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'image/png' });
      const file = new File([largeContent], 'large.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ファイルサイズが大きすぎます（最大10MB）');
    });

    test('許可されていないファイル形式（SVG）の場合、400エラーを返す', async () => {
      const svgContent = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      const file = new File([svgContent], 'icon.svg', { type: 'image/svg+xml' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このファイル形式はサポートされていません');
    });

    test('許可されていないファイル形式（実行ファイル）の場合、400エラーを返す', async () => {
      const exeContent = new Blob(['fake exe'], { type: 'application/x-msdownload' });
      const file = new File([exeContent], 'virus.exe', { type: 'application/x-msdownload' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このファイル形式はサポートされていません');
    });
  });

  /**
   * 認証エラー
   */
  describe('認証エラー', () => {
    test('未認証ユーザーの場合、401エラーを返す', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
        storage: {
          from: jest.fn().mockReturnValue(mockSupabaseStorage),
        },
      } as any);

      const fileContent = new Blob(['fake image'], { type: 'image/png' });
      const file = new File([fileContent], 'test.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です');

      // Storageは呼ばれない
      expect(mockSupabaseStorage.upload).not.toHaveBeenCalled();
    });
  });

  /**
   * Supabase Storageエラー
   */
  describe('Supabase Storageエラー', () => {
    test('Storageアップロードエラー時、500エラーを返す', async () => {
      mockSupabaseStorage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      const fileContent = new Blob(['fake image'], { type: 'image/png' });
      const file = new File([fileContent], 'test.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('ファイルのアップロードに失敗しました');
    });
  });

  /**
   * レスポンス形式テスト
   */
  describe('レスポンス形式', () => {
    test('成功時、success, fileフィールドを含む', async () => {
      const fileContent = new Blob(['fake image'], { type: 'image/png' });
      const file = new File([fileContent], 'test.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('file');
      expect(data.file).toHaveProperty('url');
      expect(data.file).toHaveProperty('name');
      expect(data.file).toHaveProperty('type');
      expect(data.file).toHaveProperty('size');
    });

    test('エラー時、success, errorフィールドを含む', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(data).not.toHaveProperty('file');
    });
  });
});
