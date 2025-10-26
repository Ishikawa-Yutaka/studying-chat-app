/**
 * ユーザーのオンライン状態を更新するAPI
 *
 * POST /api/user/update-online-status
 *
 * リクエストボディ:
 * {
 *   isOnline: boolean  // オンライン状態（true: オンライン、false: オフライン）
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Supabaseで認証確認
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディからisOnlineを取得
    const { isOnline } = await request.json();

    // オンライン状態を更新
    await prisma.user.update({
      where: { authId: user.id },
      data: {
        isOnline: isOnline ?? false,
        lastSeen: new Date(),
      },
    });

    console.log(
      `✅ オンライン状態更新成功: ${user.email} -> ${isOnline ? 'オンライン' : 'オフライン'}`
    );

    return NextResponse.json({
      success: true,
      message: 'オンライン状態を更新しました',
    });
  } catch (error) {
    console.error('❌ オンライン状態更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'オンライン状態の更新に失敗しました' },
      { status: 500 }
    );
  }
}
