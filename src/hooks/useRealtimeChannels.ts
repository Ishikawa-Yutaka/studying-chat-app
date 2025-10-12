/**
 * Supabase Realtimeを使用したチャンネルのリアルタイム更新カスタムフック
 * 
 * データベースでChannel テーブルの変更（INSERT/UPDATE/DELETE）を監視し、
 * 自動的にチャンネルリストを更新します
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

// チャンネルの型定義
interface Channel {
  id: string;
  name: string;
  description?: string;
  type: string;
  memberCount?: number;
}

interface UseRealtimeChannelsProps {
  initialChannels: Channel[];
}

export function useRealtimeChannels({ initialChannels }: UseRealtimeChannelsProps) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const supabase = createClient();

  // チャンネルを追加する関数
  const addChannel = useCallback((newChannel: Channel) => {
    setChannels(prevChannels => {
      // 重複チェック：同じIDのチャンネルが既に存在する場合は追加しない
      const exists = prevChannels.some(channel => channel.id === newChannel.id);
      if (exists) {
        return prevChannels;
      }
      return [...prevChannels, newChannel];
    });
  }, []);

  // チャンネルを更新する関数
  const updateChannel = useCallback((updatedChannel: Channel) => {
    setChannels(prevChannels => 
      prevChannels.map(channel => 
        channel.id === updatedChannel.id ? updatedChannel : channel
      )
    );
  }, []);

  // チャンネルを削除する関数
  const removeChannel = useCallback((channelId: string) => {
    setChannels(prevChannels => 
      prevChannels.filter(channel => channel.id !== channelId)
    );
  }, []);

  // 初期チャンネルの更新（useRefを使用して安全に更新）
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (initialChannels && !initializedRef.current) {
      setChannels(initialChannels);
      initializedRef.current = true;
    }
  }, [initialChannels?.length]);

  // Supabase Realtimeの設定
  useEffect(() => {
    console.log('🔄 チャンネル一覧のリアルタイム監視を開始');

    // Realtimeチャンネルを作成（PostgreSQLの変更を監視）
    const channel = supabase
      .channel('channels_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',  // 新しいチャンネル作成
          schema: 'public',
          table: 'Channel',
          filter: `type=eq.CHANNEL` // 通常のチャンネルのみ（DMは除外）
        },
        (payload) => {
          console.log('📢 新しいチャンネルが作成されました:', payload);
          const newChannel = payload.new as Channel;
          addChannel(newChannel);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',  // チャンネル更新
          schema: 'public',
          table: 'Channel',
          filter: `type=eq.CHANNEL`
        },
        (payload) => {
          console.log('📝 チャンネルが更新されました:', payload);
          const updatedChannel = payload.new as Channel;
          updateChannel(updatedChannel);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',  // チャンネル削除
          schema: 'public',
          table: 'Channel',
          filter: `type=eq.CHANNEL`
        },
        (payload) => {
          console.log('🗑️ チャンネルが削除されました:', payload);
          const deletedChannel = payload.old as Channel;
          removeChannel(deletedChannel.id);
        }
      )
      .subscribe((status) => {
        console.log(`📡 チャンネルRealtime接続状況: ${status}`);
      });

    // クリーンアップ関数：コンポーネントがアンマウントされた時にサブスクリプションを解除
    return () => {
      console.log('🔌 チャンネル一覧のリアルタイム監視を停止');
      supabase.removeChannel(channel);
    };
  }, [supabase, addChannel, updateChannel, removeChannel]);

  return {
    channels,
    addChannel,     // チャンネル追加（将来のチャンネル作成機能用）
    updateChannel,  // チャンネル更新
    removeChannel   // チャンネル削除
  };
}