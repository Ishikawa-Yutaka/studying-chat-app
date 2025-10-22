/**
 * サーバー側専用：API認証チェック関数
 *
 * このファイルの関数はAPIルート（/api/...）内でのみ使用してください。
 * クライアントコンポーネントでは使用できません。
 *
 * next/headersを使用するため、サーバー側でのみ動作します。
 */

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * 現在ログインしているユーザーを取得（サーバー側専用）
 *
 * 処理の流れ:
 * 1. Supabase認証トークンを検証
 * 2. Prismaデータベースからユーザー情報を取得
 * 3. ユーザー情報を返す
 *
 * @returns ユーザー情報とエラー情報
 *
 * 使用例:
 * ```typescript
 * // API Route内で
 * import { getCurrentUser } from '@/lib/auth-server';
 *
 * const { user, error, status } = await getCurrentUser();
 * if (error) {
 *   return NextResponse.json({ error }, { status });
 * }
 * // user を使って処理を続ける
 * ```
 */
export async function getCurrentUser() {
  try {
    // ステップ1: Supabase認証トークンから現在のユーザーを取得
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('❌ 認証エラー:', authError);
      return {
        user: null,
        error: '認証が必要です。ログインしてください。',
        status: 401
      };
    }

    console.log(`✅ 認証済みユーザー: ${authUser.id}`);

    // ステップ2: Prismaデータベースからユーザー情報を取得
    const currentUser = await prisma.user.findFirst({
      where: { authId: authUser.id }
    });

    if (!currentUser) {
      console.error('❌ ユーザーが見つかりません:', authUser.id);
      return {
        user: null,
        error: 'ユーザーが見つかりません',
        status: 404
      };
    }

    console.log(`👤 現在のユーザー: ${currentUser.name} (ID: ${currentUser.id})`);

    return {
      user: currentUser,
      error: null,
      status: 200
    };

  } catch (error) {
    console.error('❌ getCurrentUser エラー:', error);
    return {
      user: null,
      error: '認証処理に失敗しました',
      status: 500
    };
  }
}

/**
 * ユーザーが特定のチャンネルのメンバーかどうかを確認（サーバー側専用）
 *
 * @param userId - Prismaのユーザー内部ID
 * @param channelId - チャンネルID
 * @returns メンバーシップ情報とエラー情報
 *
 * 使用例:
 * ```typescript
 * // API Route内で
 * import { checkChannelMembership } from '@/lib/auth-server';
 *
 * const { isMember, error, status } = await checkChannelMembership(user.id, channelId);
 * if (!isMember) {
 *   return NextResponse.json({ error }, { status });
 * }
 * // メンバーであることが確認できたので処理を続ける
 * ```
 */
export async function checkChannelMembership(userId: string, channelId: string) {
  try {
    // チャンネルメンバーシップを検索
    const membership = await prisma.channelMember.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      }
    });

    if (!membership) {
      console.error(`❌ アクセス拒否: ユーザー ${userId} はチャンネル ${channelId} のメンバーではありません`);
      return {
        isMember: false,
        error: 'このチャンネルにアクセスする権限がありません',
        status: 403
      };
    }

    console.log(`✅ チャンネルメンバーシップ確認OK: ユーザー ${userId} → チャンネル ${channelId}`);

    return {
      isMember: true,
      error: null,
      status: 200
    };

  } catch (error) {
    console.error('❌ checkChannelMembership エラー:', error);
    return {
      isMember: false,
      error: 'メンバーシップの確認に失敗しました',
      status: 500
    };
  }
}
