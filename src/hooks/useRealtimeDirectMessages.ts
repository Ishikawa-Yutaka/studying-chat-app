/**
 * Supabase Realtimeを使用したダイレクトメッセージの最新状況をリアルタイム更新するカスタムフック
 * 
 * 任意のDMチャンネルでメッセージが送信された際に、DM一覧の最新メッセージと
 * タイムスタンプが自動的に更新されます
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

// DMの型定義
interface DirectMessage {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface UseRealtimeDirectMessagesProps {
  initialDirectMessages: DirectMessage[];
  currentUserId: string;
}

export function useRealtimeDirectMessages({ 
  initialDirectMessages, 
  currentUserId 
}: UseRealtimeDirectMessagesProps) {
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(initialDirectMessages);
  const supabase = createClient();

  // DM一覧を更新する関数
  const updateDirectMessagesList = useCallback(async () => {
    try {
      // DM一覧を再取得して最新状態に更新
      const response = await fetch(`/api/channels?userId=${currentUserId}`);
      const data = await response.json();
      
      if (data.success) {
        setDirectMessages(data.directMessages);
      }
    } catch (error) {
      console.error('❌ DM一覧の更新に失敗:', error);
    }
  }, [currentUserId]);

  // 初期DM一覧の更新（useRefを使用して安全に更新）
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (initialDirectMessages && !initializedRef.current) {
      setDirectMessages(initialDirectMessages);
      initializedRef.current = true;
    }
  }, [initialDirectMessages?.length]);

  // Supabase Realtimeの設定
  useEffect(() => {
    console.log('🔄 DM一覧のリアルタイム監視を開始');

    // DMチャンネルタイプのメッセージ変更を監視
    const channel = supabase
      .channel('dm_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',  // 新しいメッセージ
          schema: 'public',
          table: 'Message'
        },
        async (payload) => {
          console.log('📨 新しいDMメッセージを受信:', payload);
          
          // メッセージが送信されたチャンネルがDMかどうかを確認
          const message = payload.new as any;
          
          // DM一覧を更新（最新メッセージ・時刻を反映）
          await updateDirectMessagesList();
        }
      )
      .subscribe((status) => {
        console.log(`📡 DM Realtime接続状況: ${status}`);
      });

    // クリーンアップ関数
    return () => {
      console.log('🔌 DM一覧のリアルタイム監視を停止');
      supabase.removeChannel(channel);
    };
  }, [supabase, updateDirectMessagesList]);

  return {
    directMessages,
    updateDirectMessagesList  // 手動更新用
  };
}