/**
 * チャンネル一覧コンポーネント
 *
 * サイドバーに表示されるチャンネル（グループチャット）の一覧
 * チャンネル作成ボタンとモーダルダイアログを含む
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Hash, Plus, Search, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateChannelDialog from './createChannelDialog';
import JoinChannelDialog from '@/components/channel/joinChannelDialog';
import ChannelSettingsDialog from '@/components/channel/channelSettingsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// チャンネル型（Prismaと連携）
interface Channel {
  id: string;
  name: string;
  description?: string;
  creatorId?: string | null; // チャンネル作成者のID
}

interface ChannelListProps {
  channels: Channel[];
  pathname: string;
  currentUserId?: string; // 現在ログイン中のユーザーID（作成者判定用）
  onChannelCreated?: () => void; // チャンネル作成後にチャンネル一覧を再取得するコールバック
  onChannelJoined?: (channel: { id: string; name: string; description?: string; memberCount: number }) => void; // チャンネル参加時に即座にUIを更新するコールバック
  onChannelLeft?: (channelId: string) => void; // チャンネル退出時に即座にUIを更新するコールバック
}

export default function ChannelList({ channels, pathname, currentUserId, onChannelCreated, onChannelJoined, onChannelLeft }: ChannelListProps) {
  const router = useRouter();

  // モーダルの開閉状態管理
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  // チャンネル設定ダイアログの状態管理
  const [settingsChannel, setSettingsChannel] = useState<Channel | null>(null);
  // 退出確認ダイアログの状態管理
  const [leaveChannel, setLeaveChannel] = useState<Channel | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  /**
   * チャンネル退出処理
   */
  const handleLeaveChannel = async () => {
    if (!leaveChannel) return;

    setIsLeaving(true);

    try {
      console.log('🔄 チャンネル退出開始:', leaveChannel.id);

      const response = await fetch(`/api/channels/leave/${leaveChannel.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'チャンネルからの退出に失敗しました');
      }

      console.log('✅ チャンネル退出成功:', data.channelName);

      // 退出成功: モーダルを閉じる
      setLeaveChannel(null);

      // 即座にUIを更新（楽観的更新）
      if (onChannelLeft) {
        onChannelLeft(leaveChannel.id);
      }

      // 現在そのチャンネルページにいる場合はワークスペースに遷移
      if (pathname === `/workspace/channel/${leaveChannel.id}`) {
        router.push('/workspace');
      }

    } catch (err) {
      console.error('❌ チャンネル退出エラー:', err);
      alert(err instanceof Error ? err.message : 'チャンネルからの退出に失敗しました');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">チャンネル</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-accent hover:text-accent-foreground text-foreground"
            onClick={() => setIsJoinDialogOpen(true)}
            title="チャンネルを探す"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-accent hover:text-accent-foreground text-foreground"
            onClick={() => setIsCreateDialogOpen(true)}
            title="新しいチャンネルを作成"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        {channels.map((channel) => {
          const isActive = pathname === `/workspace/channel/${channel.id}`;
          return (
            <div
              key={channel.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <Link
                href={`/workspace/channel/${channel.id}`}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <Hash className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
              </Link>

              {/* アクションボタンエリア - 固定幅で常に同じレイアウト */}
              <div className="flex items-center gap-0.5">
                {/* 退出アイコン（常に表示） */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="group/leave h-5 w-5 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLeaveChannel(channel);
                  }}
                  title="チャンネルから退出"
                >
                  <LogOut className="h-3.5 w-3.5 text-gray-400 group-hover/leave:text-orange-500 transition-colors" />
                </Button>

                {/* 削除アイコン（作成者のみ表示、それ以外はスペース確保のため非表示） */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`group/delete h-5 w-5 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ${
                    currentUserId && channel.creatorId === currentUserId ? '' : 'invisible pointer-events-none'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSettingsChannel(channel);
                  }}
                  title="チャンネル設定"
                  disabled={!(currentUserId && channel.creatorId === currentUserId)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-400 group-hover/delete:text-red-500 transition-colors" />
                </Button>
              </div>
            </div>
          );
        })}
        {channels.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">
            チャンネルがありません
          </p>
        )}
      </div>

      {/* チャンネル作成モーダル */}
      <CreateChannelDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onChannelCreated={onChannelCreated}
      />

      {/* チャンネル参加モーダル */}
      <JoinChannelDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
        onChannelJoined={onChannelJoined}
      />

      {/* チャンネル設定ダイアログ */}
      {settingsChannel && (
        <ChannelSettingsDialog
          open={settingsChannel !== null}
          onOpenChange={(open) => {
            if (!open) setSettingsChannel(null);
          }}
          channelId={settingsChannel.id}
          channelName={settingsChannel.name}
          channelDescription={settingsChannel.description}
        />
      )}

      {/* チャンネル退出確認ダイアログ */}
      <AlertDialog open={leaveChannel !== null} onOpenChange={(open) => !open && setLeaveChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>チャンネルから退出しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              チャンネル「{leaveChannel?.name}」から退出しようとしています。
              <br />
              <br />
              このチャンネルがあなたのチャンネル一覧から削除されます。再度参加することは可能です。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveChannel}
              disabled={isLeaving}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isLeaving ? '退出中...' : '退出する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}