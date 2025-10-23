/**
 * チャンネル削除API
 *
 * DELETE /api/channels/[channelId] - 指定したチャンネルを削除
 *
 * セキュリティ強化版:
 * - 認証チェック：ログインしているユーザーのみアクセス可能
 * - 作成者確認：チャンネルを作成したユーザーのみ削除可能
 *
 * 処理の流れ:
 * 1. チャンネルIDを取得
 * 2. 認証チェック：ログインユーザーを確認
 * 3. チャンネル情報を取得（作成者IDを含む）
 * 4. 作成者チェック：このユーザーが作成者か確認
 * 5. チャンネルを削除（メンバー・メッセージも自動削除される）
 * 6. 成功レスポンスを返却
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    console.log('🗑️ チャンネル削除API開始');

    // 1. チャンネルID取得
    const { channelId } = await context.params;

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルIDが必要です'
      }, { status: 400 });
    }

    console.log(`📝 チャンネル削除リクエスト - ID: ${channelId}`);

    // 2. 認証チェック：現在ログインしているユーザーを取得
    const { user, error: authError, status: authStatus } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError
      }, { status: authStatus });
    }

    console.log(`✅ 認証確認: ${user.name} (ID: ${user.id})`);

    // 3. チャンネル情報を取得（作成者IDを含む）
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        name: true,
        type: true,
        creatorId: true
      }
    });

    if (!channel) {
      console.error('❌ チャンネルが見つかりません');
      return NextResponse.json({
        success: false,
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }

    // DMは削除できない（退出機能を使用）
    if (channel.type === 'dm') {
      return NextResponse.json({
        success: false,
        error: 'ダイレクトメッセージは削除できません。退出機能を使用してください。'
      }, { status: 400 });
    }

    // 4. 作成者チェック：このユーザーがチャンネルの作成者か確認
    if (channel.creatorId !== user.id) {
      console.error('❌ 作成者ではありません - 作成者ID:', channel.creatorId, 'ユーザーID:', user.id);
      return NextResponse.json({
        success: false,
        error: 'チャンネルを削除する権限がありません。作成者のみが削除できます。'
      }, { status: 403 }); // 403 Forbidden
    }

    console.log(`🔑 作成者確認OK - ユーザー: ${user.name}, チャンネル: ${channel.name}`);

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
    });

  } catch (error) {
    console.error('❌ チャンネル削除エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
