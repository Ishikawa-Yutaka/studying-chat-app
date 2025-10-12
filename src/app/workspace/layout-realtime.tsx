/**
 * ワークスペースレイアウト
 * 
 * サイドバー付きのレイアウト
 * デスクトップではサイドバー固定、モバイルではハンバーガーメニュー
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import AppLogo from '@/components/workspace/appLogo';
import ChannelList from '@/components/workspace/channelList';
import DirectMessageList from '@/components/workspace/directMessageList';
import UserProfileBar from '@/components/workspace/userProfileBar';

// リアルタイム機能のカスタムフック
import { useRealtimeChannels } from '@/hooks/useRealtimeChannels';
import { useRealtimeDirectMessages } from '@/hooks/useRealtimeDirectMessages';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<boolean>(false);
  
  // 実データベース状態管理
  const [initialChannels, setInitialChannels] = useState<any[]>([]);
  const [initialDirectMessages, setInitialDirectMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 現在のユーザー（テストデータの田中太郎）
  const currentUser = {
    id: 'cmglkz5uq0000j0x2kxp1oy71',
    name: '田中太郎',
    email: 'tanaka@example.com'
  };
  
  // リアルタイムチャンネルフック：自動的にチャンネルがリアルタイム更新される
  const { channels } = useRealtimeChannels({
    initialChannels
  });
  
  // リアルタイムDMフック：自動的にDM一覧がリアルタイム更新される
  const { directMessages } = useRealtimeDirectMessages({
    initialDirectMessages,
    currentUserId: currentUser.id
  });

  // データベースからチャンネル・DM一覧を取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📋 サイドバーデータ取得開始...');
        
        const response = await fetch(`/api/channels?userId=${currentUser.id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'チャンネル取得に失敗しました');
        }
        
        if (data.success) {
          console.log(`✅ サイドバーデータ取得成功:`, data.counts);
          setInitialChannels(data.channels);
          setInitialDirectMessages(data.directMessages);
        } else {
          throw new Error(data.error);
        }
        
      } catch (error) {
        console.error('❌ サイドバーデータ取得エラー:', error);
        // エラー時は空配列を設定
        setInitialChannels([]);
        setInitialDirectMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser.id]);

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