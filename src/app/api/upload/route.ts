/**
 * ファイルアップロードAPI
 * POST /api/upload - ファイルをSupabase Storageにアップロード
 *
 * 処理の流れ:
 * 1. ユーザー認証チェック
 * 2. ファイルのバリデーション（サイズ・形式）
 * 3. Supabase Storageにアップロード
 * 4. 公開URLを返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * ファイルアップロードエンドポイント（POST）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: '認証が必要です'
        },
        { status: 401 }
      );
    }

    // FormDataからファイルを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'ファイルが選択されていません'
        },
        { status: 400 }
      );
    }

    console.log('アップロード開始:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // ファイルサイズチェック（50MB = 50 * 1024 * 1024 bytes）
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'ファイルサイズが大きすぎます（最大50MB）'
        },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = [
      // 画像
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      // 動画
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      // ドキュメント
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/msword', // .doc
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-powerpoint', // .ppt
      // その他
      'application/zip',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'このファイル形式はサポートされていません'
        },
        { status: 400 }
      );
    }

    // ファイル名を一意にする（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${timestamp}_${randomStr}.${fileExt}`;

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Supabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(uniqueFileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase Storageアップロードエラー:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'ファイルのアップロードに失敗しました'
        },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(uniqueFileName);

    console.log('アップロード成功:', {
      path: data.path,
      publicUrl
    });

    // アップロード情報を返す
    return NextResponse.json({
      success: true,
      file: {
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size
      }
    });

  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ファイルのアップロード中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
