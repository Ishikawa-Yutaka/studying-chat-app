/**
 * Supabase Presenceフック
 *
 * リアルタイムでユーザーのオンライン状態を追跡
 *
 * 機能:
 * - ユーザーがページを開いた時に自動的にオンラインとして登録
 * - タブを閉じたり、ネットワークが切断されると自動的にオフラインに
 * - 他のユーザーのオンライン状態をリアルタイムで取得
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  user_id: string;
  online_at: string;
}

interface UsePresenceOptions {
  userId: string | null;      // 現在のユーザーID
  enabled?: boolean;           // Presenceを有効にするかどうか（デフォルト: true）
}

interface UsePresenceReturn {
  onlineUsers: string[];       // オンラインユーザーのID一覧
  isUserOnline: (userId: string) => boolean;  // 指定ユーザーがオンラインか確認
}

/**
 * Presenceフック
 *
 * 使い方:
 * const { onlineUsers, isUserOnline } = usePresence({ userId: currentUser.id });
 *
 * if (isUserOnline('user123')) {
 *   console.log('ユーザー123はオンラインです');
 * }
 */
export function usePresence({
  userId,
  enabled = true,
}: UsePresenceOptions): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  /**
   * 指定ユーザーがオンラインか確認
   */
  const isUserOnline = useCallback(
    (targetUserId: string) => {
      return onlineUsers.includes(targetUserId);
    },
    [onlineUsers]
  );

  useEffect(() => {
    // Presenceが無効、またはユーザーIDがない場合は何もしない
    if (!enabled || !userId) {
      return;
    }

    const supabase = createClient();

    // グローバルなPresenceチャンネルに接続
    // すべてのユーザーが同じチャンネルに参加することで、
    // 全員のオンライン状態を把握できる
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId, // ユーザーIDをキーとして使用
        },
      },
    });

    // Presenceステートが変更された時の処理
    // （誰かがオンライン/オフラインになった時）
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // 現在オンラインの全ユーザーを取得
        const state = presenceChannel.presenceState<PresenceState>();

        // オンラインユーザーのID一覧を抽出
        const users = Object.keys(state).flatMap((key) => {
          const presences = state[key];
          return presences.map((p) => p.user_id);
        });

        // 重複を除去
        const uniqueUsers = Array.from(new Set(users));

        console.log('📡 オンラインユーザー更新:', uniqueUsers);
        setOnlineUsers(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('✅ ユーザーがオンラインになりました:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('👋 ユーザーがオフラインになりました:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // チャンネル接続成功後、自分の状態をブロードキャスト
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });

          console.log('✅ Presenceチャンネルに参加しました:', userId);
        }
      });

    setChannel(presenceChannel);

    // クリーンアップ: コンポーネントがアンマウントされたら
    // Presenceチャンネルから離脱
    return () => {
      console.log('🔌 Presenceチャンネルから離脱します:', userId);

      // チャンネルから離脱（自動的にオフラインになる）
      presenceChannel.unsubscribe();
      supabase.removeChannel(presenceChannel);
    };
  }, [userId, enabled]);

  return {
    onlineUsers,
    isUserOnline,
  };
}
