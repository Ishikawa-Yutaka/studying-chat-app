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

    // パフォーマンス最適化: メンバー数は_countで取得、参加状態は別途確認
    const allChannels = await prisma.channel.findMany({
      where: {
        type: 'channel'
      },
      select: {
        id: true,
        name: true,
        description: true,
        creatorId: true,  // チャンネル作成者のID
        createdAt: true,
        _count: {
          select: { members: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // ユーザーが参加しているチャンネルIDを取得
    const userChannelIds = await prisma.channelMember.findMany({
      where: {
        userId: user.id
      },
      select: {
        channelId: true
      }
    });
    const joinedChannelIds = new Set(userChannelIds.map(uc => uc.channelId));

    // 各チャンネルに参加状態を追加
    const channelsWithJoinStatus = allChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      memberCount: channel._count.members,  // _countを使用
      creatorId: channel.creatorId,
      isJoined: joinedChannelIds.has(channel.id),  // Set検索で高速化
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
