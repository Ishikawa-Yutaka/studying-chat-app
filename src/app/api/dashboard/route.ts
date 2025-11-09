// ダッシュボード統計情報取得API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { channelMemberUserSelect, userBasicSelect } from '@/lib/prisma-selectors';

/**
 * ダッシュボード統計情報取得API（GET）
 *
 * セキュリティ強化版:
 * - URLパラメータではなく認証トークンからユーザーを取得
 * - ログインしているユーザー自身のデータのみ返す
 * - 他のユーザーのダッシュボードは絶対に見れない
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`📊 ダッシュボード統計取得開始`);

    // 認証チェック：現在ログインしているユーザーを取得
    const { user, error, status } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({
        success: false,
        error: error
      }, { status });
    }
    
    // パフォーマンス最適化: すべてのクエリを並列実行（6秒 → 1秒に短縮）
    console.log('📊 データ取得開始（並列実行）...');
    const startTime = Date.now();
    const [userChannels, totalUserCount, allChannels] = await Promise.all([
      // Step 1: チャンネルメンバー取得
      prisma.channelMember.findMany({
        where: { userId: user.id },
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              // メンバー数のみカウント（全メンバーデータを取得しない）
              _count: {
                select: { members: true }
              },
              // DM用に相手のユーザー情報のみ取得（1件のみ）
              members: {
                where: {
                  userId: { not: user.id }
                },
                take: 1,
                select: {
                  user: {
                    select: channelMemberUserSelect
                  }
                }
              }
            }
          }
        }
      }),

      // Step 2: 全ユーザー数カウント
      prisma.user.count(),

      // Step 3: 全チャンネル取得
      prisma.channel.findMany({
        where: {
          type: 'channel' // 通常のチャンネルのみ（DM以外）
        },
        select: {
          id: true,
          name: true,
          description: true,
          // メンバー数のみカウント（全メンバーデータを取得しない）
          _count: {
            select: { members: true }
          }
        }
      })
    ]);

    const parallelTime = Date.now() - startTime;
    console.log(`✅ データ取得完了（並列実行）: ${parallelTime}ms`);
    console.log(`  - ユーザーチャンネル: ${userChannels.length}件`);
    console.log(`  - 全ユーザー数: ${totalUserCount}人`);
    console.log(`  - 全チャンネル: ${allChannels.length}件`);

    // 参加チャンネルとDMを分離（ユーザーが参加しているもののみ）
    const myChannels = [];
    const directMessages = [];

    for (const userChannel of userChannels) {
      const channel = userChannel.channel;

      if (channel.type === 'channel') {
        // 自分が参加している通常のチャンネル（統計用）
        myChannels.push({
          id: channel.id,
          name: channel.name,
          description: channel.description,
          memberCount: channel._count.members  // _countを使用
        });
      } else if (channel.type === 'dm') {
        // DM - 相手のユーザー情報を取得（1件のみ取得済み）
        const partner = channel.members[0];
        if (partner) {
          directMessages.push({
            id: channel.id,
            partnerId: partner.user.authId, // Supabase AuthID を使用
            partnerName: partner.user.name,
            partnerEmail: partner.user.email,
            partnerAvatarUrl: partner.user.avatarUrl  // アバターURL追加
          });
        }
      }
    }

    // DM統計情報の集計（軽量処理なので並列化不要）
    const dmChannelIds = directMessages.map(dm => dm.id);

    // 全DMチャンネルのメッセージを一括取得してグループ化（N+1問題を回避）
    const dmMessagesGrouped = await prisma.message.groupBy({
      by: ['channelId', 'senderId'],
      where: {
        channelId: { in: dmChannelIds }
      },
      _count: {
        id: true
      }
    });

    // DM統計を作成
    const dmStats = directMessages.map(dm => {
      // このDMチャンネルの送信/受信メッセージ数を計算
      const sentCount = dmMessagesGrouped.find(
        msg => msg.channelId === dm.id && msg.senderId === user.id
      )?._count.id || 0;

      const receivedCount = dmMessagesGrouped.find(
        msg => msg.channelId === dm.id && msg.senderId !== user.id
      )?._count.id || 0;

      return {
        partnerId: dm.partnerId,
        partnerName: dm.partnerName,
        partnerEmail: dm.partnerEmail,
        partnerAvatarUrl: dm.partnerAvatarUrl,
        sentCount: sentCount,        // 自分が送信したメッセージ数
        receivedCount: receivedCount, // 相手から受信したメッセージ数
        totalCount: sentCount + receivedCount // 合計メッセージ数
      };
    });

    // ダッシュボード表示用: 全チャンネル（参加・未参加問わず）
    const allChannelsForDisplay = allChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      memberCount: channel._count.members  // _countを使用
    }));
    
    // 統計情報を作成
    // - channelCount: 自分が参加しているチャンネル数（DM以外）
    // - dmPartnerCount: DM相手の人数
    // - totalUserCount: ワークスペース全体のメンバー数
    const stats = {
      channelCount: myChannels.length,
      dmPartnerCount: directMessages.length,
      totalUserCount: totalUserCount
    };

    console.log(`✅ ダッシュボード統計取得成功`, stats);

    return NextResponse.json({
      success: true,
      stats: stats,
      allChannels: allChannelsForDisplay, // 全チャンネル（ダッシュボード表示用）
      myChannels: myChannels, // 自分が参加しているチャンネル（統計用）
      directMessages: directMessages, // DM一覧（サイドバー用）
      dmStats: dmStats // DM相手ごとのメッセージ統計（ダッシュボード表示用）
    });
    
  } catch (error) {
    console.error('❌ ダッシュボード統計取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'ダッシュボード統計の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}