/**
 * 全チャンネル一覧取得API
 *
 * 用途: チャンネル検索モーダルで全チャンネル（参加済み・未参加の両方）を表示
 *
 * レスポンス:
 * - 全チャンネルリスト
 * - 各チャンネルの参加状態（isJoined）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 全チャンネル一覧取得開始');

    // 認証チェック：現在ログインしているユーザーを取得
    const { user, error: authError, status: authStatus } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError
      }, { status: authStatus });
    }

    // 全チャンネルを取得（DMは除外、通常チャンネルのみ）
    const allChannels = await prisma.channel.findMany({
      where: {
        type: 'channel'
      },
      include: {
        members: {
          select: {
            userId: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // 各チャンネルに参加状態を追加
    const channelsWithJoinStatus = allChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      memberCount: channel.members.length,
      isJoined: channel.members.some(member => member.userId === user.id),
      createdAt: channel.createdAt
    }));

    console.log(`✅ 全チャンネル取得成功: ${channelsWithJoinStatus.length}件`);

    return NextResponse.json({
      success: true,
      channels: channelsWithJoinStatus,
      count: channelsWithJoinStatus.length
    });

  } catch (error) {
    console.error('❌ 全チャンネル取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: '全チャンネルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
