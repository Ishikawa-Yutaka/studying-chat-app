/**
 * ユーザーの最終オンライン時刻を更新するAPI
 *
 * POST /api/user/update-online-status
 *
 * 用途: ユーザーがオフラインになった時（タブを閉じる、別のタブに移動）に呼び出される
 *
 * 動作:
 * - lastSeen を現在時刻に更新
 * - オンライン状態はPresenceで管理（データベースには保存しない）
 *
 * 注: リクエストボディは不要（常に現在時刻を記録するだけ）
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
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

    // lastSeen を現在時刻に更新（オフライン時刻を記録）
    await prisma.user.update({
      where: { authId: user.id },
      data: {
        lastSeen: new Date(),
      },
    });

    console.log(
      `✅ lastSeen更新成功: ${user.email} -> ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: 'lastSeenを更新しました',
    });
  } catch (error) {
    console.error('❌ lastSeen更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'lastSeenの更新に失敗しました' },
      { status: 500 }
    );
  }
}
