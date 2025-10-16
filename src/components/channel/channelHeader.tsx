'use client';

import { useState } from 'react';
import { Hash, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChannelSettingsDialog from './channelSettingsDialog';

// ChannelHeaderコンポーネントのprops型定義
interface ChannelHeaderProps {
  channelId: string;        // チャンネルID（設定ダイアログ用）
  channelName: string;      // チャンネル名
  channelDescription?: string;  // チャンネル説明（オプショナル）
  memberCount?: number;     // メンバー数（オプショナル）
}

export default function ChannelHeader({
  channelId,
  channelName,
  channelDescription,
  memberCount
}: ChannelHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="border-b bg-background z-10">
        <div className="h-14 flex items-center justify-between gap-4 px-4">
          {/* 左側: チャンネル情報表示 */}
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

          {/* 右側: 設定ボタン */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            title="チャンネル設定"
            className="text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 設定モーダル */}
      <ChannelSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        channelId={channelId}
        channelName={channelName}
        channelDescription={channelDescription}
      />
    </>
  );
}
