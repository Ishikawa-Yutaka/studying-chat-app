/**
 * ユーザープロフィールバー
 * 
 * サイドバー下部に表示されるユーザー情報とログアウトボタン
 */

'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onSignOut?: () => void;
}

export default function UserProfileBar({ user, onSignOut }: UserProfileBarProps) {
  const handleLogout = async () => {
    if (onSignOut) {
      await onSignOut();
    }
    // ログアウト後にログインページにリダイレクト
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
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
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="h-8 w-8"
        title="ログアウト"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}