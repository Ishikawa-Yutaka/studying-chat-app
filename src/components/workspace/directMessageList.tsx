/**
 * ダイレクトメッセージ一覧コンポーネント
 *
 * サイドバーに表示されるDM（1対1チャット）の一覧
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StartDmDialog from '@/components/dm/startDmDialog';
import { UserAvatar } from '@/components/userAvatar';

// DM型（APIレスポンスと一致）
interface DirectMessage {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerAvatarUrl?: string | null;  // プロフィール画像のURL
}

interface DirectMessageListProps {
  directMessages: DirectMessage[];
  pathname: string;
  onDmCreated?: () => void; // サイドバー更新用コールバック
}

export default function DirectMessageList({ directMessages, pathname, onDmCreated }: DirectMessageListProps) {
  // モーダル開閉状態
  const [isStartDmOpen, setIsStartDmOpen] = useState(false);
  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">ダイレクトメッセージ</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-accent hover:text-accent-foreground text-foreground"
          onClick={() => setIsStartDmOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {directMessages.map((dm) => {
          const isActive = pathname === `/workspace/dm/${dm.partnerId}`;
          return (
            <Link
              key={dm.id}
              href={`/workspace/dm/${dm.partnerId}`}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <UserAvatar
                name={dm.partnerName}
                avatarUrl={dm.partnerAvatarUrl}
                size="sm"
                className="h-6 w-6"
              />
              <span className="truncate">{dm.partnerName}</span>
            </Link>
          );
        })}
        {directMessages.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">
            DMがありません
          </p>
        )}
      </div>

      {/* DM開始モーダル */}
      <StartDmDialog
        open={isStartDmOpen}
        onOpenChange={setIsStartDmOpen}
        onDmCreated={onDmCreated}
      />
    </div>
  );
}