'use client';

import { ChevronLeft, Hash } from 'lucide-react';
import Link from 'next/link';

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
    <header className="sticky top-0 z-10 border-b bg-background" data-testid="channel-header">
      <div className="h-14 flex items-center gap-3 px-4">
        {/* 戻るボタン */}
        <Link
          href="/workspace"
          className="p-2 hover:bg-accent rounded-lg transition-colors -ml-2"
          aria-label="ワークスペースに戻る"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>

        {/* チャンネル情報表示 */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="h-5 w-5 flex-shrink-0" />
            <h1 className="font-semibold truncate">{channelName}</h1>
          </div>

          {/* チャンネル詳細情報（説明とメンバー数） - PCのみ表示 */}
          {(channelDescription || memberCount) && (
            <>
              {/* 縦の区切り線 */}
              <div className="h-6 w-px bg-border hidden md:block" />

              {/* 説明文とメンバー数 */}
              <p className="text-sm text-muted-foreground hidden md:block truncate">
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
