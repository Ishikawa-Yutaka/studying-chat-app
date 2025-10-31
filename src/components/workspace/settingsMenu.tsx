/**
 * 設定メニューコンポーネント
 *
 * サイドバー下部に表示される設定メニュー（歯車アイコン）
 * - アバター設定
 * - ダークモード切り替え
 */

'use client';

import { useState } from 'react';
import { Settings, User, Moon, Sun, LogOut, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface SettingsMenuProps {
  onAvatarSettingsClick: () => void;
  onSignOut?: () => void;
}

export default function SettingsMenu({ onAvatarSettingsClick, onSignOut }: SettingsMenuProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  /**
   * アカウント削除処理
   */
  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      console.log('🗑️ アカウント削除リクエスト送信...');

      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'アカウントの削除に失敗しました');
      }

      console.log('✅ アカウント削除成功');

      // ログインページにリダイレクト
      window.location.href = '/login';
    } catch (error) {
      console.error('❌ アカウント削除エラー:', error);
      alert(error instanceof Error ? error.message : 'アカウントの削除に失敗しました');
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
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

          <DropdownMenuSeparator />

          {/* アカウント削除 */}
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>アカウント削除</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* アカウント削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。アカウントを削除しても、送信したメッセージや作成したチャンネルは残ります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
