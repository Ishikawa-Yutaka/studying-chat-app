/**
 * アカウント削除API
 *
 * 処理の流れ:
 * 1. 現在ログインしているユーザーを取得
 * 2. Prisma DBからユーザー削除
 *    - Message.senderId → null (メッセージは残る)
 *    - Channel.creatorId → null (チャンネルは残る)
 *    - ChannelMember → 削除 (メンバーシップは削除)
 * 3. Supabase Authからログアウト
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  try {
    console.log('🗑️ アカウント削除開始...');

    // 現在ログインしているユーザーを取得
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '認証が必要です'
      }, { status: 401 });
    }

    console.log('👤 削除対象ユーザー:', user.email, 'Auth ID:', user.id);

    // Prisma DBからユーザーを削除
    // onDelete: SetNull により、以下の動作:
    // - Message.senderId → null (メッセージは残る、送信者名は「削除済みユーザー」表示)
    // - Channel.creatorId → null (チャンネルは残る、削除権限は全メンバーに)
    // - ChannelMember → Cascade削除 (メンバーシップは削除される)
    const deletedUser = await prisma.user.delete({
      where: {
        authId: user.id
      }
    });

    console.log('✅ Prisma DBからユーザー削除完了:', deletedUser.email);

    // Supabase Authからログアウト
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error('⚠️ セッションクリアエラー（無視）:', signOutError);
    }

    console.log('✅ アカウント削除完了');

    return NextResponse.json({
      success: true,
      message: 'アカウントを削除しました'
    });

  } catch (error) {
    console.error('❌ アカウント削除エラー:', error);

    // ユーザーが見つからない場合
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーが見つかりません'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'アカウントの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
