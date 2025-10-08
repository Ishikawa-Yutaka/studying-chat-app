/**
 * ユーザープロフィールバー
 * 
 * サイドバー下部に表示されるユーザー情報とログアウトボタン
 */

'use client';

import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 仮のユーザー型（後でSupabaseと連携）
interface User {
  id: string;
  name: string;
  email?: string;
}

interface UserProfileBarProps {
  user: User;
}

export default function UserProfileBar({ user }: UserProfileBarProps) {
  const handleLogout = () => {
    // TODO: ログアウト処理を実装
    window.location.href = '/login';
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
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