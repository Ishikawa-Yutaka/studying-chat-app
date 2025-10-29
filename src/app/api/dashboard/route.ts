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
    
    // データを順次取得（エラー特定のため）
    console.log('📊 Step 1: チャンネルメンバー取得開始');
    const userChannels = await prisma.channelMember.findMany({
      where: { userId: user.id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            members: {
              include: {
                user: {
                  select: channelMemberUserSelect
                }
              }
            }
          }
        }
      }
    });
    console.log('✅ Step 1完了:', userChannels.length, '件');

    console.log('📊 Step 2: 全ユーザー数カウント開始');
    const totalUserCount = await prisma.user.count();
    console.log('✅ Step 2完了:', totalUserCount, '人');

    console.log('📊 Step 3: 全チャンネル取得開始');
    const allChannels = await prisma.channel.findMany({
      where: {
        type: 'channel' // 通常のチャンネルのみ（DM以外）
      },
      include: {
        members: {
          include: {
            user: {
              select: userBasicSelect
            }
          }
        }
      }
    });
    console.log('✅ Step 3完了:', allChannels.length, '件');

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
          memberCount: channel.members.length
        });
      } else if (channel.type === 'dm') {
        // DM - 相手のユーザー情報を取得
        const partner = channel.members.find(member => member.userId !== user.id);
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

    console.log('📊 Step 4: DM相手ごとのメッセージ数を集計開始');
    // DM相手ごとのメッセージ統計を取得
    const dmStats = [];
    for (const dm of directMessages) {
      // このDMチャンネル内の自分が送信したメッセージ数
      const sentCount = await prisma.message.count({
        where: {
          channelId: dm.id,
          senderId: user.id
        }
      });

      // このDMチャンネル内の相手が送信したメッセージ数
      const receivedCount = await prisma.message.count({
        where: {
          channelId: dm.id,
          senderId: { not: user.id }
        }
      });

      dmStats.push({
        partnerId: dm.partnerId,
        partnerName: dm.partnerName,
        partnerEmail: dm.partnerEmail,
        partnerAvatarUrl: dm.partnerAvatarUrl,  // アバターURL追加
        sentCount: sentCount,        // 自分が送信したメッセージ数
        receivedCount: receivedCount, // 相手から受信したメッセージ数
        totalCount: sentCount + receivedCount // 合計メッセージ数
      });
    }
    console.log('✅ Step 4完了:', dmStats.length, '件');

    // ダッシュボード表示用: 全チャンネル（参加・未参加問わず）
    const allChannelsForDisplay = allChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      memberCount: channel.members.length
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