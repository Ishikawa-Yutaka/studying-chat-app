/**
 * 設定メニューコンポーネント
 *
 * サイドバー下部に表示される設定メニュー（歯車アイコン）
 * - アバター設定
 * - ダークモード切り替え（将来実装）
 */

'use client';

import { useState } from 'react';
import { Settings, User, Moon, LogOut } from 'lucide-react';
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
    <div className="border-t bg-background p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10 hover:bg-accent hover:text-accent-foreground text-foreground"
            title="設定"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
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

          {/* ダークモード切り替え（将来実装） */}
          <DropdownMenuItem
            disabled
            className="cursor-not-allowed opacity-50"
          >
            <Moon className="mr-2 h-4 w-4" />
            <span>ダークモード（準備中）</span>
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
