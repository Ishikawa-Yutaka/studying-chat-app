/**
 * チャンネル一覧コンポーネント
 * 
 * サイドバーに表示されるチャンネル（グループチャット）の一覧
 */

'use client';

import Link from 'next/link';
import { Hash, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 仮のチャンネル型（後でPrismaと連携）
interface Channel {
  id: string;
  name: string;
  description?: string;
}

interface ChannelListProps {
  channels: Channel[];
  pathname: string;
}

export default function ChannelList({ channels, pathname }: ChannelListProps) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">チャンネル</h2>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
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
    </div>
  );
}