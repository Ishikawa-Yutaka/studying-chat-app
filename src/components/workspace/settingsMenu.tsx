/**
 * 設定メニューコンポーネント
 *
 * サイドバー下部に表示される設定メニュー（歯車アイコン）
 * - アバター設定
 * - ダークモード切り替え
 */

'use client';

import { useState } from 'react';
import { Settings, User, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface SettingsMenuProps {
  onAvatarSettingsClick: () => void;
  onSignOut?: () => void;
}

export default function SettingsMenu({ onAvatarSettingsClick, onSignOut }: SettingsMenuProps) {
  const { theme, setTheme } = useTheme();

  /**
   * テーマ切り替え処理
   */
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    if (onSignOut) {
      await onSignOut();
    }
    // ログアウト後にログインページにリダイレクト
    window.location.href = '/login';
  };
  return (
    <div className="p-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-accent hover:text-accent-foreground text-foreground"
            title="設定"
          >
            <Settings size={23} strokeWidth={2.5} style={{ width: '23px', height: '23px' }} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 border border-border shadow-lg"
          style={{ backgroundColor: 'hsl(var(--background))', opacity: 1 }}
        >
          <DropdownMenuLabel>設定</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* アバター設定 */}
          <DropdownMenuItem
            onClick={onAvatarSettingsClick}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>アバター設定</span>
          </DropdownMenuItem>

          {/* ダークモード切り替え */}
          <DropdownMenuItem
            onClick={toggleTheme}
            className="cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                <span>ライトモード</span>
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                <span>ダークモード</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* ログアウト */}
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>ログアウト</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
