/**
 * スレッド返信のリアルタイム更新カスタムフック
 *
 * 特定の親メッセージIDに紐づくスレッド返信をリアルタイムで監視・更新します
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// メッセージの型定義
interface User {
  id: string;
  name: string;
  email?: string;
  authId?: string;
  avatarUrl?: string | null;
}

interface Message {
  id: string;
  sender: User | null;
  content: string;
  createdAt: Date | string;
  parentMessageId?: string | null;
  // ファイル添付情報（オプショナル）
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
}

interface UseRealtimeThreadRepliesProps {
  parentMessageId: string | null; // 親メッセージのID
  initialReplies: Message[];      // 初期スレッド返信一覧
}

/**
 * スレッド返信をリアルタイムで監視するカスタムフック
 *
 * 使い方:
 * const { replies, addReply } = useRealtimeThreadReplies({
 *   parentMessageId: currentThreadParent?.id || null,
 *   initialReplies: threadReplies
 * });
 */
export function useRealtimeThreadReplies({
  parentMessageId,
  initialReplies
}: UseRealtimeThreadRepliesProps) {
  const [replies, setReplies] = useState<Message[]>(initialReplies);

  // useMemoでsupabaseインスタンスを安定化（無限ループ防止）
  const supabase = useMemo(() => createClient(), []);

  // スレッド返信を追加する関数（楽観的更新用）
  const addReply = useCallback((newReply: Message) => {
    setReplies(prevReplies => {
      // 重複チェック：同じIDのメッセージが既に存在する場合は追加しない
      const exists = prevReplies.some(msg => msg.id === newReply.id);
      if (exists) {
        console.log('🔄 重複スレッド返信をスキップ:', newReply.id);
        return prevReplies;
      }

      // 楽観的更新の仮メッセージを置き換える
      // temp- で始まるIDのメッセージがあり、内容が同じなら置き換え
      const tempIndex = prevReplies.findIndex(
        msg => msg.id.startsWith('temp-') && msg.content === newReply.content
      );

      if (tempIndex !== -1) {
        console.log('⚡ 楽観的更新スレッド返信を本物に置き換え:', newReply.id);
        const updated = [...prevReplies];
        updated[tempIndex] = newReply;
        return updated;
      }

      console.log('✅ 新しいスレッド返信を追加:', newReply.id);
      return [...prevReplies, newReply];
    });
  }, []);

  // 初期返信の更新（リセット）
  // parentMessageId が変わった時にリセット
  useEffect(() => {
    console.log('🔄 初期スレッド返信を設定:', initialReplies.length, '件 (parentId:', parentMessageId, ')');
    setReplies(initialReplies);
  }, [parentMessageId, initialReplies.length]);

  // Supabase Realtimeの設定
  useEffect(() => {
    // parentMessageIdが無効な場合はスキップ
    if (!parentMessageId || !supabase) {
      console.log('⚠️ parentMessageIdまたはsupabaseが無効のため、スレッドRealtime監視をスキップ', {
        parentMessageId: parentMessageId || '(empty)',
        hasSupabase: !!supabase
      });
      return;
    }

    console.log(`🔄 スレッド ${parentMessageId} のリアルタイム監視を開始`);

    // Realtimeチャンネルを作成（特定の親メッセージの返信のみ監視）
    const channel = supabase
      .channel(`thread_${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `parentMessageId=eq.${parentMessageId}` // 特定の親メッセージの返信のみ
        },
        async (payload) => {
          console.log('📨 Realtimeで新しいスレッド返信を受信:', payload);
          console.log('📨 受信データ詳細:', JSON.stringify(payload, null, 2));

          try {
            const newReply = payload.new as any;

            // 送信者の情報を取得
            let senderInfo = {
              id: newReply.senderId || 'deleted-user',
              name: '削除済みユーザー',
              email: '',
              authId: undefined,
              avatarUrl: null
            };

            // senderId が存在する場合のみAPI呼び出し
            if (newReply.senderId) {
              const response = await fetch(`/api/user/${newReply.senderId}`);
              if (response.ok) {
                const userData = await response.json();
                if (userData.success) {
                  senderInfo = userData.user;
                }
              }
            }

            // メッセージにsender情報とファイル情報を追加
            const replyWithSender: Message = {
              id: newReply.id,
              content: newReply.content,
              createdAt: newReply.createdAt,
              sender: senderInfo,
              parentMessageId: newReply.parentMessageId,
              // ファイル情報（存在する場合のみ）
              fileUrl: newReply.fileUrl || null,
              fileName: newReply.fileName || null,
              fileType: newReply.fileType || null,
              fileSize: newReply.fileSize || null,
            };

            addReply(replyWithSender);
          } catch (error) {
            console.error('❌ リアルタイムスレッド返信の処理に失敗:', error);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 スレッドRealtime接続状況: ${status}`);
        if (err) {
          console.error('❌ スレッドRealtime接続エラー:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ スレッドRealtimeサブスクリプション成功');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ スレッドRealtimeチャンネルエラー');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ スレッドRealtime接続タイムアウト');
        } else if (status === 'CLOSED') {
          console.log('🔌 スレッドRealtime接続クローズ');
        }
      });

    // クリーンアップ関数：スレッドパネルが閉じられた時にサブスクリプションを解除
    return () => {
      console.log(`🔌 スレッド ${parentMessageId} のリアルタイム監視を停止`);
      supabase.removeChannel(channel);
    };
    // supabaseはuseMemoで安定化されているため、依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentMessageId, addReply]);

  return {
    replies,      // リアルタイム更新されるスレッド返信一覧
    addReply,     // 楽観的更新用（返信送信時に即座に画面更新）
    setReplies    // スレッド返信リスト全体の更新用
  };
}
