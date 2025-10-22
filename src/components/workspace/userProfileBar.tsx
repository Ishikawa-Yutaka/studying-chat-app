/**
 * ユーザープロフィールバー
 *
 * サイドバー下部に表示されるユーザー情報
 */

'use client';

import { UserAvatar } from '@/components/userAvatar';

// ユーザー型定義
interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;  // プロフィール画像のURL
}

interface UserProfileBarProps {
  user: User | null;
}

export default function UserProfileBar({ user }: UserProfileBarProps) {

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <UserAvatar
        name={user.name}
        avatarUrl={user.avatarUrl}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.name}</p>
        {user.email && (
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        )}
      </div>
    </div>
  );
}