/**
 * チャンネル退出API
 *
 * 用途: ユーザーがチャンネルから退出する
 *
 * 処理の流れ:
 * 1. 認証チェック
 * 2. チャンネルメンバーシップを削除
 * 3. 成功レスポンスを返す
 *
 * 注意: チャンネル自体は削除されない（自分だけが退出）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await context.params;
    console.log('🔄 チャンネル退出開始:', channelId);

    // 認証チェック：現在ログインしているユーザーを取得
    const { user, error: authError, status: authStatus } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError
      }, { status: authStatus });
    }

    // チャンネルが存在するか確認
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        name: true,
        members: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!channel) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }

    // ユーザーがチャンネルのメンバーか確認
    const isMember = channel.members.some(member => member.userId === user.id);
    if (!isMember) {
      return NextResponse.json({
        success: false,
        error: 'このチャンネルのメンバーではありません'
      }, { status: 403 });
    }

    // チャンネルメンバーシップを削除
    await prisma.channelMember.deleteMany({
      where: {
        channelId: channelId,
        userId: user.id
      }
    });

    console.log('✅ チャンネル退出成功:', channel.name);

    return NextResponse.json({
      success: true,
      channelName: channel.name,
      message: 'チャンネルから退出しました'
    });

  } catch (error) {
    console.error('❌ チャンネル退出エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルからの退出に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
