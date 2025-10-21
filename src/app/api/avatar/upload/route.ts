/**
 * アバター画像アップロードAPI
 *
 * POST /api/avatar/upload
 *
 * 処理の流れ:
 * 1. Supabaseで認証チェック
 * 2. FormDataから画像ファイル取得
 * 3. ファイル検証（サイズ、MIME type）
 * 4. ユニークなファイル名を生成
 * 5. Supabase Storageにアップロード
 * 6. 公開URLを取得
 * 7. PrismaデータベースでユーザーのavatarUrlを更新
 */

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ 認証エラー:', authError);
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    console.log('🔄 アバターアップロード開始:', user.id);

    // 2. FormDataから画像ファイル取得
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが必要です' },
        { status: 400 }
      );
    }

    // 3. ファイル検証
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'ファイルサイズは2MB以下にしてください' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '画像ファイル（JPEG、PNG、WebP、GIF）のみアップロード可能です' },
        { status: 400 }
      );
    }

    console.log('✅ ファイル検証OK:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(1)} KB`
    });

    // 4. ユニークなファイル名を生成（重複を避ける）
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    // 5. Supabase Storageにアップロード
    console.log('🔄 Supabase Storageにアップロード中...');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true  // 同じファイル名の場合は上書き
      });

    if (uploadError) {
      console.error('❌ Supabase Storageアップロードエラー:', uploadError);
      return NextResponse.json(
        { success: false, error: 'アップロードに失敗しました' },
        { status: 500 }
      );
    }

    console.log('✅ Supabase Storageアップロード成功:', uploadData.path);

    // 6. 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    console.log('✅ 公開URL取得:', publicUrl);

    // 7. Prismaデータベースを更新
    console.log('🔄 Prismaデータベース更新中...');

    const updatedUser = await prisma.user.updateMany({
      where: { authId: user.id },
      data: { avatarUrl: publicUrl }
    });

    if (updatedUser.count === 0) {
      console.error('❌ ユーザーが見つかりません:', user.id);
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    console.log('✅ Prismaデータベース更新成功');

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
      message: 'アバター画像をアップロードしました'
    });

  } catch (error) {
    console.error('❌ アバターアップロードエラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
