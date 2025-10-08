/**
 * ワークスペースレイアウト
 * 
 * サイドバー付きのレイアウト
 * デスクトップではサイドバー固定、モバイルではハンバーガーメニュー
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import AppLogo from '@/components/workspace/appLogo';
import ChannelList from '@/components/workspace/channelList';
import DirectMessageList from '@/components/workspace/directMessageList';
import UserProfileBar from '@/components/workspace/userProfileBar';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<boolean>(false);

  // 仮のデータ（後でデータベースから取得）
  const currentUser = {
    id: '1',
    name: 'テストユーザー',
    email: 'test@example.com'
  };

  const channels = [
    { id: '1', name: '一般', description: '一般的な話題' },
    { id: '2', name: '開発', description: '開発に関する議論' },
    { id: '3', name: '雑談', description: '自由な雑談' }
  ];

  const directMessages = [
    { id: 'dm1', partnerName: '田中さん' },
    { id: 'dm2', partnerName: '佐藤さん' }
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* モバイルナビゲーション */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">ナビゲーションメニューを開く</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0">
            <div className="px-6 py-4">
              <AppLogo />
            </div>
            <Separator />
            <div className="flex-1">
              <ChannelList channels={channels} pathname={pathname} />
              <Separator className="my-2" />
              <DirectMessageList directMessages={directMessages} pathname={pathname} />
            </div>
            <Separator />
            <div className="p-4">
              <UserProfileBar user={currentUser} />
            </div>
          </SheetContent>
        </Sheet>
        <AppLogo />
      </header>

      {/* デスクトップレイアウト */}
      <div className="flex-1 items-start lg:grid lg:grid-cols-[280px_1fr]">
        {/* サイドバー (デスクトップのみ表示) */}
        <aside className="hidden border-r bg-background lg:flex lg:flex-col lg:justify-between lg:h-screen">
          <div className="flex h-14 items-center border-b px-6">
            <AppLogo />
          </div>
          <div className="flex-1 py-2">
            <ChannelList channels={channels} pathname={pathname} />
            <Separator className="my-2" />
            <DirectMessageList directMessages={directMessages} pathname={pathname} />
          </div>
          <div className="sticky bottom-0 border-t bg-background p-4">
            <UserProfileBar user={currentUser} />
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex flex-col h-screen">{children}</main>
      </div>
    </div>
  );
}