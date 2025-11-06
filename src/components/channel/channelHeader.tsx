'use client';

import { Hash } from 'lucide-react';

// ChannelHeaderコンポーネントのprops型定義
interface ChannelHeaderProps {
  channelName: string;      // チャンネル名
  channelDescription?: string;  // チャンネル説明（オプショナル）
  memberCount?: number;     // メンバー数（オプショナル）
}

export default function ChannelHeader({
  channelName,
  channelDescription,
  memberCount
}: ChannelHeaderProps) {
  return (
    <header className="border-b bg-background z-10" data-testid="channel-header">
      <div className="h-14 flex items-center gap-4 px-4">
        {/* チャンネル情報表示 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            <h1 className="font-semibold">{channelName}</h1>
          </div>

          {/* チャンネル詳細情報（説明とメンバー数） */}
          {(channelDescription || memberCount) && (
            <>
              {/* 縦の区切り線 */}
              <div className="h-6 w-px bg-border" />

              {/* 説明文とメンバー数 */}
              <p className="text-sm text-muted-foreground hidden md:block">
                {channelDescription && channelDescription}
                {channelDescription && memberCount && ' '}
                {memberCount && `(${memberCount} 人のメンバー)`}
              </p>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
