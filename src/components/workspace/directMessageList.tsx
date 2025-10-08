/**
 * ダイレクトメッセージ一覧コンポーネント
 * 
 * サイドバーに表示されるDM（1対1チャット）の一覧
 */

'use client';

import Link from 'next/link';
import { User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 仮のDM型
interface DirectMessage {
  id: string;
  partnerName: string;
}

interface DirectMessageListProps {
  directMessages: DirectMessage[];
  pathname: string;
}

export default function DirectMessageList({ directMessages, pathname }: DirectMessageListProps) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">ダイレクトメッセージ</h2>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {directMessages.map((dm) => {
          const isActive = pathname === `/workspace/channel/${dm.id}`;
          return (
            <Link
              key={dm.id}
              href={`/workspace/channel/${dm.id}`}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <User className="h-3 w-3 text-primary-foreground" />
              </div>
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
    </div>
  );
}