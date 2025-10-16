/**
 * チャンネル削除API
 *
 * DELETE /api/channels/[channelId] - 指定したチャンネルを削除
 *
 * 処理の流れ:
 * 1. チャンネルIDを取得
 * 2. Supabase認証でログインユーザーを確認
 * 3. チャンネルが存在するか確認
 * 4. チャンネルを削除（メンバー・メッセージも自動削除される）
 * 5. 成功レスポンスを返却
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    console.log('🔄 チャンネル削除API開始');

    // 1. チャンネルID取得
    const { channelId } = await context.params;

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルIDが必要です'
      }, { status: 400 });
    }

    console.log(`📝 チャンネル削除リクエスト - ID: ${channelId}`);

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

    // 3. チャンネルが存在するか確認
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: {
              select: {
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
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }

    // DMは削除できない
    if (channel.type === 'dm') {
      return NextResponse.json({
        success: false,
        error: 'ダイレクトメッセージは削除できません'
      }, { status: 403 });
    }

    // 4. ユーザーがこのチャンネルのメンバーか確認（オプション: より厳密にするならチャンネル作成者のみ削除可能にする）
    const isMember = channel.members.some(member => member.user.authId === user.id);

    if (!isMember) {
      console.error('❌ このチャンネルのメンバーではありません');
      return NextResponse.json({
        success: false,
        error: 'このチャンネルを削除する権限がありません'
      }, { status: 403 });
    }

    console.log(`🗑️ チャンネル削除実行: ${channel.name}`);

    // 5. チャンネル削除（Prismaのcascade設定により、メンバーとメッセージも自動削除される）
    await prisma.channel.delete({
      where: { id: channelId }
    });

    console.log(`✅ チャンネル削除成功: ${channel.name} (ID: ${channelId})`);

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      message: 'チャンネルを削除しました',
      channelName: channel.name
    }, { status: 200 });

  } catch (error) {
    console.error('❌ チャンネル削除エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
