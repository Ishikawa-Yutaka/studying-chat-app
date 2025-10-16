/**
 * Supabase Realtimeを使用したダッシュボード統計情報のリアルタイム更新カスタムフック（修正版）
 * 無限ループ問題を根本的に解決
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

// ダッシュボード統計の型定義
// - channelCount: 自分が参加しているチャンネル数（DM以外）
// - dmPartnerCount: DM相手の人数
// - totalUserCount: ワークスペース全体のメンバー数
interface DashboardStats {
  channelCount: number;
  dmPartnerCount: number;
  totalUserCount: number;
}

// チャンネル・DM情報の型定義
interface Channel {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

interface DirectMessage {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
}

interface UseRealtimeDashboardProps {
  initialStats: DashboardStats;
  initialChannels: Channel[];
  initialDirectMessages: DirectMessage[];
  currentUserId: string;
}

export function useRealtimeDashboard({
  initialStats,
  initialChannels,
  initialDirectMessages,
  currentUserId
}: UseRealtimeDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(initialDirectMessages);
  const supabase = createClient();

  // ダッシュボードデータ全体を再取得する関数
  const refreshDashboardData = useCallback(async () => {
    try {
      console.log('🔄 ダッシュボードデータを再取得中...');
      
      const response = await fetch(`/api/dashboard?userId=${currentUserId}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setChannels(data.channels);
        setDirectMessages(data.directMessages);
        console.log('✅ ダッシュボードデータを更新しました');
      }
    } catch (error) {
      console.error('❌ ダッシュボードデータの更新に失敗:', error);
    }
  }, [currentUserId]);

  // 初期データが変更された時の処理（useMemoで安定した比較）
  const hasInitialDataChanged = useMemo(() => {
    return (
      initialStats.channelCount !== stats.channelCount ||
      initialStats.dmPartnerCount !== stats.dmPartnerCount ||
      initialChannels.length !== channels.length ||
      initialDirectMessages.length !== directMessages.length
    );
  }, [
    initialStats.channelCount,
    initialStats.dmPartnerCount,
    initialChannels.length,
    initialDirectMessages.length,
    stats.channelCount,
    stats.dmPartnerCount,
    channels.length,
    directMessages.length
  ]);

  // 初期データの更新（安全な方法）
  useEffect(() => {
    if (hasInitialDataChanged) {
      setStats(initialStats);
      setChannels(initialChannels);
      setDirectMessages(initialDirectMessages);
    }
  }, [hasInitialDataChanged, initialStats, initialChannels, initialDirectMessages]);

  // Supabase Realtimeの設定
  useEffect(() => {
    console.log('🔄 ダッシュボードのリアルタイム監視を開始');

    // メッセージ数の変化を監視（統計情報に影響）
    const messageChannel = supabase
      .channel('dashboard_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message'
        },
        async (payload) => {
          console.log('📨 新しいメッセージが送信されました（ダッシュボード更新）');
          await refreshDashboardData();
        }
      )
      .subscribe();

    // チャンネルの変化を監視（チャンネル数・一覧に影響）
    const channelChannel = supabase
      .channel('dashboard_channels')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT/UPDATE/DELETE全てを監視
          schema: 'public',
          table: 'Channel'
        },
        async (payload) => {
          console.log('🏢 チャンネルが変更されました（ダッシュボード更新）');
          await refreshDashboardData();
        }
      )
      .subscribe();

    // ユーザーの変化を監視（メンバー数に影響）
    const userChannel = supabase
      .channel('dashboard_users')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT/UPDATE/DELETE全てを監視
          schema: 'public',
          table: 'User'
        },
        async (payload) => {
          console.log('👤 ユーザーが変更されました（ダッシュボード更新）');
          await refreshDashboardData();
        }
      )
      .subscribe();

    // チャンネルメンバーの変化を監視（参加・脱退）
    const memberChannel = supabase
      .channel('dashboard_members')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT/DELETE全てを監視
          schema: 'public',
          table: 'ChannelMember'
        },
        async (payload) => {
          console.log('👥 チャンネルメンバーが変更されました（ダッシュボード更新）');
          await refreshDashboardData();
        }
      )
      .subscribe();

    // クリーンアップ関数：コンポーネントがアンマウントされた時にサブスクリプションを解除
    return () => {
      console.log('🔌 ダッシュボードのリアルタイム監視を停止');
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(channelChannel);
      supabase.removeChannel(userChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [supabase, refreshDashboardData]);

  return {
    stats,
    channels,
    directMessages,
    refreshDashboardData  // 手動更新用
  };
}