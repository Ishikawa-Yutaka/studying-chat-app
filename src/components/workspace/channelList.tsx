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
  onChannelDeleted?: (channelId: string) => void; // チャンネル削除時に即座にUIを更新するコールバック
  onLinkClick?: () => void; // リンククリック時にサイドバーを閉じるコールバック（モバイル用）
}

export default function ChannelList({ channels, pathname, currentUserId, onChannelCreated, onChannelJoined, onChannelLeft, onChannelDeleted, onLinkClick }: ChannelListProps) {
  const router = useRouter();

  // モーダルの開閉状態管理
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  // 「さらに表示」機能用の状態
  const [showAllChannels, setShowAllChannels] = useState(false);
  // 削除確認ダイアログの状態管理
  const [deleteChannel, setDeleteChannel] = useState<Channel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // 退出確認ダイアログの状態管理
  const [leaveChannel, setLeaveChannel] = useState<Channel | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  /**
   * チャンネル削除処理
   */
  const handleDeleteChannel = async () => {
    if (!deleteChannel) return;

    setIsDeleting(true);

    try {
      console.log('🔄 チャンネル削除開始:', deleteChannel.id);

      const response = await fetch(`/api/channels/${deleteChannel.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'チャンネルの削除に失敗しました');
      }

      console.log('✅ チャンネル削除成功:', data.channelName);

      // 削除成功: モーダルを閉じる
      setDeleteChannel(null);

      // 即座にUIを更新（楽観的更新）
      if (onChannelDeleted) {
        onChannelDeleted(deleteChannel.id);
      }

      // 現在そのチャンネルページにいる場合はワークスペースに遷移
      if (pathname === `/workspace/channel/${deleteChannel.id}`) {
        router.push('/workspace');
      }

    } catch (err) {
      console.error('❌ チャンネル削除エラー:', err);
      alert(err instanceof Error ? err.message : 'チャンネルの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

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
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">参加チャンネル</h2>
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
      <div className="space-y-1" data-testid="channel-list">
        <div className={`${showAllChannels ? 'max-h-[500px]' : 'max-h-[250px]'} overflow-y-auto transition-all duration-300`}>
          {channels.slice(0, showAllChannels ? undefined : 5).map((channel) => {
          const isActive = pathname === `/workspace/channel/${channel.id}`;
          return (
            <div
              key={channel.id}
              data-testid="channel-item"
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground mb-1 ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <Link
                href={`/workspace/channel/${channel.id}`}
                className="flex items-center gap-2 flex-1 min-w-0"
                onClick={onLinkClick}
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

                {/* 削除アイコン（作成者のみ表示、作成者が削除された場合は全メンバー表示） */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`group/delete h-5 w-5 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ${
                    currentUserId && (channel.creatorId === currentUserId || channel.creatorId === null) ? '' : 'invisible pointer-events-none'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteChannel(channel);
                  }}
                  title="チャンネル削除"
                  disabled={!(currentUserId && (channel.creatorId === currentUserId || channel.creatorId === null))}
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
        {channels.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-[80%] mx-auto block mt-2 border-2"
            onClick={() => setShowAllChannels(!showAllChannels)}
          >
            {showAllChannels ? '表示を減らす' : `さらに表示 (${channels.length - 5}件)`}
          </Button>
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

      {/* チャンネル削除確認ダイアログ */}
      <AlertDialog open={deleteChannel !== null} onOpenChange={(open) => !open && setDeleteChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              チャンネル「{deleteChannel?.name}」を削除しようとしています。
              <br />
              <br />
              この操作は取り消せません。チャンネル内のすべてのメッセージとメンバー情報が完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannel}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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