/**
 * Supabase Realtimeを使用したダッシュボード統計情報のリアルタイム更新カスタムフック
 * 
 * メッセージ送信、チャンネル作成・削除、ユーザー追加等によって
 * ダッシュボードの統計情報が自動的に更新されます
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

// ダッシュボード統計の型定義
interface DashboardStats {
  channelCount: number;
  dmCount: number;
  totalRoomsCount: number;
  userMessageCount: number;
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

  // 初期データの更新（useRefを使用して安全に更新）
  const initializedRef = useRef(false);
  const lastInitialStatsRef = useRef(null);
  
  useEffect(() => {
    // 初期データが存在し、まだ初期化されていない、または初期データが変更された場合
    if (initialStats && initialChannels && initialDirectMessages && 
        (!initializedRef.current || lastInitialStatsRef.current !== initialStats)) {
      
      setStats(initialStats);
      setChannels(initialChannels);
      setDirectMessages(initialDirectMessages);
      
      initializedRef.current = true;
      lastInitialStatsRef.current = initialStats;
    }
  }, [initialStats, initialChannels, initialDirectMessages]);

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