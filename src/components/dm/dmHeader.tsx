'use client';

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
      <header className="border-b bg-background">
        <div className="h-16 flex items-center px-4">
          {/* ユーザー情報 */}
          <div className="flex items-center gap-3">
            {/* ユーザーアバター */}
            <UserAvatar
              name={dmPartner.name}
              avatarUrl={dmPartner.avatarUrl}
              size="md"
              showOnlineStatus={true}
              isOnline={dmPartner.isOnline}
            />

            {/* ユーザー詳細情報 */}
            <div className="flex flex-col">
              <h1 className="font-semibold text-lg">{dmPartner.name}</h1>
              <div className="flex items-center gap-2 text-sm">
                {/* オンライン状態 */}
                <div className={`w-2 h-2 rounded-full ${
                  dmPartner.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-gray-600">
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