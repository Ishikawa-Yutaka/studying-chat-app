/**
 * チャンネル参加ダイアログコンポーネント
 *
 * 用途: 参加可能なチャンネル一覧を表示し、チャンネルに参加できるモーダル
 *
 * 機能:
 * - 参加可能なチャンネル一覧表示（自分がまだ参加していないチャンネル）
 * - チャンネル検索
 * - チャンネル参加
 * - 参加後、自動的にチャンネルページに遷移
 *
 * 参考: StartDmDialogと同様のUI/UX
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// 型定義
interface Channel {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  createdAt: Date | string;
}

interface JoinChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelJoined?: () => void; // サイドバー更新用コールバック
}

export default function JoinChannelDialog({
  open,
  onOpenChange,
  onChannelJoined
}: JoinChannelDialogProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // 状態管理
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 参加可能なチャンネル一覧取得
   *
   * 処理の流れ:
   * 1. GET /api/channels/available で自分が参加していないチャンネルを取得
   * 2. チャンネル一覧を表示
   */
  useEffect(() => {
    // モーダルが開かれていない、または認証されていない場合はスキップ
    if (!open || !currentUser) return;

    const fetchAvailableChannels = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('📋 参加可能なチャンネル一覧取得開始...');

        const response = await fetch(`/api/channels/available?userId=${currentUser.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '参加可能なチャンネルの取得に失敗しました');
        }

        if (data.success) {
          console.log(`✅ 参加可能なチャンネル取得成功: ${data.count}件`);
          setChannels(data.channels);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        console.error('❌ 参加可能なチャンネル取得エラー:', err);
        setError(err instanceof Error ? err.message : '参加可能なチャンネルの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableChannels();
  }, [open, currentUser]);

  /**
   * 検索フィルター
   *
   * チャンネル名または説明で検索
   * 大文字小文字を区別しない
   */
  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (channel.description && channel.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  /**
   * チャンネル参加処理
   *
   * 処理の流れ:
   * 1. API呼び出し（POST /api/channels/join）
   * 2. 成功したらチャンネルページに遷移
   * 3. サイドバーを更新
   *
   * 重要: 参加後は即座にチャンネルページに遷移する
   */
  const handleJoinChannel = async (channel: Channel) => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 チャンネル参加開始:', channel.name);

      const response = await fetch('/api/channels/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: channel.id,
          userId: currentUser.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'チャンネルへの参加に失敗しました');
      }

      if (data.success) {
        console.log('✅ チャンネル参加成功:', data.channelName);

        // モーダルを閉じる
        onOpenChange(false);

        // サイドバー更新（新しいチャンネルを一覧に反映）
        if (onChannelJoined) {
          onChannelJoined();
        }

        // チャンネルページに遷移
        router.push(`/workspace/channel/${channel.id}`);

        // 検索フィールドをリセット
        setSearchTerm('');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('❌ チャンネル参加エラー:', err);
      setError(err instanceof Error ? err.message : 'チャンネルへの参加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>チャンネルに参加</DialogTitle>
          <DialogDescription>
            参加するチャンネルを選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="チャンネル名または説明で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* チャンネル一覧 */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                読み込み中...
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {searchTerm ? '該当するチャンネルが見つかりません' : '参加可能なチャンネルがありません'}
              </div>
            ) : (
              filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  {/* チャンネル情報 */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* アイコン */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>

                    {/* 名前・説明・メンバー数 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {channel.name}
                      </div>
                      {channel.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {channel.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        {channel.memberCount} 人のメンバー
                      </div>
                    </div>
                  </div>

                  {/* 参加ボタン */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleJoinChannel(channel)}
                    disabled={isLoading}
                    className="shrink-0"
                  >
                    参加
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
