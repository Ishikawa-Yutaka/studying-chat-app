/**
 * DM退出API
 *
 * DELETE /api/dm/leave/[channelId] - 自分だけDMから退出（相手には影響なし）
 *
 * 処理の流れ:
 * 1. チャンネルIDを取得
 * 2. Supabase認証でログインユーザーを確認
 * 3. DMチャンネルであることを確認
 * 4. 自分のChannelMemberレコードだけを削除
 * 5. 成功レスポンスを返却
 *
 * 重要: チャンネル自体は削除しない（相手には影響なし）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    console.log('🔄 DM退出API開始');

    // 1. チャンネルID取得
    const { channelId } = await context.params;

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルIDが必要です'
      }, { status: 400 });
    }

    console.log(`📝 DM退出リクエスト - チャンネルID: ${channelId}`);

    // 2. Supabase認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ 認証エラー:', authError);
      return NextResponse.json({
        success: false,
        error: '認証が必要です。ログインしてください。'
      }, { status: 401 });
    }

    console.log(`✅ 認証確認: ${user.email} (authId: ${user.id})`);

    // 3. SupabaseのauthIdからPrismaユーザーを取得
    const prismaUser = await prisma.user.findFirst({
      where: { authId: user.id }
    });

    if (!prismaUser) {
      console.error('❌ Prismaユーザーが見つかりません');
      return NextResponse.json({
        success: false,
        error: 'ユーザー情報が見つかりません'
      }, { status: 404 });
    }

    console.log(`👤 Prismaユーザー確認: ${prismaUser.name} (内部ID: ${prismaUser.id})`);

    // 4. チャンネルが存在するか確認
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                authId: true
              }
            }
          }
        }
      }
    });

    if (!channel) {
      console.error('❌ チャンネルが見つかりません');
      return NextResponse.json({
        success: false,
        error: 'DMが見つかりません'
      }, { status: 404 });
    }

    // 5. DMチャンネルであることを確認
    if (channel.type !== 'dm') {
      return NextResponse.json({
        success: false,
        error: 'このAPIはDMチャンネル専用です'
      }, { status: 403 });
    }

    // 6. 自分がこのDMのメンバーか確認
    const myMembership = channel.members.find(member => member.userId === prismaUser.id);

    if (!myMembership) {
      console.error('❌ このDMのメンバーではありません');
      return NextResponse.json({
        success: false,
        error: 'このDMのメンバーではありません'
      }, { status: 403 });
    }

    // 7. 相手のユーザー情報を取得（ログ用）
    const partner = channel.members.find(member => member.userId !== prismaUser.id);
    const partnerName = partner?.user.name || '不明';

    console.log(`🚪 DM退出実行: ${prismaUser.name} が ${partnerName} とのDMから退出`);

    // 8. 自分のChannelMemberレコードだけを削除
    await prisma.channelMember.delete({
      where: {
        id: myMembership.id
      }
    });

    console.log(`✅ DM退出成功: ${prismaUser.name} が退出しました`);

    // 9. メンバーが0人になった場合は、チャンネル自体を削除（オプション）
    const remainingMembers = await prisma.channelMember.count({
      where: { channelId }
    });

    if (remainingMembers === 0) {
      console.log('📌 メンバーが0人になったため、チャンネルを削除します');
      await prisma.channel.delete({
        where: { id: channelId }
      });
    }

    // 10. レスポンス返却
    return NextResponse.json({
      success: true,
      message: 'DMから退出しました',
      partnerName: partnerName
    }, { status: 200 });

  } catch (error) {
    console.error('❌ DM退出エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'DMからの退出に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
