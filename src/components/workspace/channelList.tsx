/**
 * チャンネル一覧コンポーネント
 *
 * サイドバーに表示されるチャンネル（グループチャット）の一覧
 * チャンネル作成ボタンとモーダルダイアログを含む
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Hash, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateChannelDialog from './createChannelDialog';
import JoinChannelDialog from '@/components/channel/joinChannelDialog';

// チャンネル型（Prismaと連携）
interface Channel {
  id: string;
  name: string;
  description?: string;
}

interface ChannelListProps {
  channels: Channel[];
  pathname: string;
  onChannelCreated?: () => void; // チャンネル作成後にチャンネル一覧を再取得するコールバック
}

export default function ChannelList({ channels, pathname, onChannelCreated }: ChannelListProps) {
  // モーダルの開閉状態管理
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

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
            <Link
              key={channel.id}
              href={`/workspace/channel/${channel.id}`}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <Hash className="h-4 w-4" />
              <span className="truncate">{channel.name}</span>
            </Link>
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
        onChannelJoined={onChannelCreated}
      />
    </div>
  );
}