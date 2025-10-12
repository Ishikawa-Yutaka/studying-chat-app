/**
 * Supabase Realtimeを使用したメッセージのリアルタイム更新カスタムフック（修正版）
 * 無限ループ問題を根本的に解決
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

// メッセージの型定義
interface User {
  id: string;
  name: string;
  email?: string;
}

interface Message {
  id: string;
  sender: User;
  content: string;
  createdAt: Date | string;
}

interface UseRealtimeMessagesProps {
  channelId: string;
  initialMessages: Message[];
}

export function useRealtimeMessages({ channelId, initialMessages }: UseRealtimeMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const supabase = createClient();

  // メッセージを追加する関数（楽観的更新用）
  const addMessage = useCallback((newMessage: Message) => {
    setMessages(prevMessages => {
      // 重複チェック：同じIDのメッセージが既に存在する場合は追加しない
      const exists = prevMessages.some(msg => msg.id === newMessage.id);
      if (exists) {
        console.log('🔄 重複メッセージをスキップ:', newMessage.id);
        return prevMessages;
      }
      console.log('✅ 新しいメッセージを追加:', newMessage.id);
      return [...prevMessages, newMessage];
    });
  }, []);

  // 初期メッセージの更新（リセット）
  useEffect(() => {
    if (initialMessages.length > 0) {
      console.log('🔄 初期メッセージを設定:', initialMessages.length, '件');
      setMessages(initialMessages);
    }
  }, [initialMessages.length]);

  // Supabase Realtimeの設定
  useEffect(() => {
    // channelIdとsupabaseが有効な場合のみ実行
    if (!channelId || !supabase) {
      console.log('⚠️ channelIdまたはsupabaseが無効のため、Realtime監視をスキップ');
      return;
    }

    console.log(`🔄 チャンネル ${channelId} のリアルタイム監視を開始`);

    // Realtimeチャンネルを作成（PostgreSQLの変更を監視）
    const channel = supabase
      .channel(`messages_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',  // INSERTイベント（新しいメッセージ）を監視
          schema: 'public',
          table: 'Message',
          filter: `channelId=eq.${channelId}` // 特定のチャンネルのみ監視
        },
        async (payload) => {
          console.log('📨 Realtimeで新しいメッセージを受信:', payload);
          console.log('📨 受信データ詳細:', JSON.stringify(payload, null, 2));
          
          try {
            // データベースから送信されたpayloadをMessage型に変換
            const newMessage = payload.new as any;
            
            // 送信者の情報を取得
            const response = await fetch(`/api/user/${newMessage.senderId}`);
            let senderInfo = {
              id: newMessage.senderId,
              name: 'Unknown User',
              email: ''
            };
            
            if (response.ok) {
              const userData = await response.json();
              if (userData.success) {
                senderInfo = userData.user;
              }
            }
            
            // メッセージにsender情報を追加
            const messageWithSender: Message = {
              id: newMessage.id,
              content: newMessage.content,
              createdAt: newMessage.createdAt,
              sender: senderInfo
            };

            addMessage(messageWithSender);
          } catch (error) {
            console.error('❌ リアルタイムメッセージの処理に失敗:', error);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 Realtime接続状況: ${status}`);
        if (err) {
          console.error('❌ Realtime接続エラー:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtimeサブスクリプション成功');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtimeチャンネルエラー');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Realtime接続タイムアウト');
        } else if (status === 'CLOSED') {
          console.log('🔌 Realtime接続クローズ');
        }
      });

    // クリーンアップ関数：コンポーネントがアンマウントされた時にサブスクリプションを解除
    return () => {
      console.log(`🔌 チャンネル ${channelId} のリアルタイム監視を停止`);
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase, addMessage]);

  return {
    messages,
    addMessage,  // 楽観的更新用（メッセージ送信時に即座に画面更新）
    setMessages  // メッセージリスト全体の更新用
  };
}