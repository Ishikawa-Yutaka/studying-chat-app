'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { UserAvatar } from '@/components/userAvatar';

// DM相手のユーザー情報型
interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeen?: Date;
}

// DmHeaderコンポーネントのprops型定義
interface DmHeaderProps {
  dmPartner: User;  // DM相手のユーザー情報
}

export default function DmHeader({ dmPartner }: DmHeaderProps) {

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background" data-testid="dm-header">
        <div className="h-16 flex items-center gap-3 px-4">
          {/* 戻るボタン */}
          <Link
            href="/workspace"
            className="p-2 hover:bg-accent rounded-lg transition-colors -ml-2"
            aria-label="ワークスペースに戻る"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>

          {/* ユーザー情報 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* ユーザーアバター */}
            <UserAvatar
              name={dmPartner.name}
              avatarUrl={dmPartner.avatarUrl}
              size="md"
              showOnlineStatus={true}
              isOnline={dmPartner.isOnline}
            />

            {/* ユーザー詳細情報 */}
            <div className="flex flex-col min-w-0">
              <h1 className="font-semibold text-lg truncate">{dmPartner.name}</h1>
              <div className="flex items-center gap-2 text-sm">
                {/* オンライン状態 */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  dmPartner.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-gray-600 truncate">
                  {dmPartner.isOnline
                    ? 'アクティブ'
                    : `${formatRelativeTime(dmPartner.lastSeen)}にアクティブ`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}