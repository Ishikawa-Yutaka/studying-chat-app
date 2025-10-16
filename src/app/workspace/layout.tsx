/**
 * ワークスペースレイアウト
 * 認証機能統合版
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import AppLogo from '@/components/workspace/appLogo';
import ChannelList from '@/components/workspace/channelList';
import DirectMessageList from '@/components/workspace/directMessageList';
import UserProfileBar from '@/components/workspace/userProfileBar';
import { useAuth } from '@/hooks/useAuth';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  
  // 認証状態管理
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  
  // データベース状態管理
  const [channels, setChannels] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    memberCount: number;
  }>>([]);
  const [directMessages, setDirectMessages] = useState<Array<{
    id: string;
    partnerId: string;
    partnerName: string;
    partnerEmail: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🚫 認証されていません。ログインページにリダイレクト');
      router.push('/login');
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  // サイドバーデータ更新関数
  const updateSidebarData = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔄 サイドバーデータ更新開始...');
      setIsLoading(true);
      
      const response = await fetch(`/api/channels?userId=${user.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'チャンネル取得に失敗しました');
      }
      
      if (data.success) {
        console.log(`✅ サイドバーデータ更新成功:`, data.counts);
        setChannels(data.channels);
        setDirectMessages(data.directMessages);
      } else {
        throw new Error(data.error);
      }
      
    } catch (error) {
      console.error('❌ サイドバーデータ更新エラー:', error);
      // エラー時は空配列を設定
      setChannels([]);
      setDirectMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // データベースからチャンネル・DM一覧を取得
  useEffect(() => {
    // 認証が完了していない場合は実行しない
    if (!user) return;

    updateSidebarData();
  }, [user, updateSidebarData]);

  // チャンネル削除・DM退出イベントをリッスン
  useEffect(() => {
    const handleChannelDeleted = () => {
      console.log('📢 チャンネル削除イベント受信 - サイドバー更新');
      updateSidebarData();
    };

    const handleDmLeft = () => {
      console.log('📢 DM退出イベント受信 - サイドバー更新');
      updateSidebarData();
    };

    // イベントリスナー登録
    window.addEventListener('channelDeleted', handleChannelDeleted);
    window.addEventListener('dmLeft', handleDmLeft);

    // クリーンアップ: コンポーネントがアンマウントされた時にリスナーを削除
    return () => {
      window.removeEventListener('channelDeleted', handleChannelDeleted);
      window.removeEventListener('dmLeft', handleDmLeft);
    };
  }, [updateSidebarData]);

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
              <ChannelList channels={channels} pathname={pathname} onChannelCreated={updateSidebarData} />
              <Separator className="my-2" />
              <DirectMessageList directMessages={directMessages} pathname={pathname} onDmCreated={updateSidebarData} />
            </div>
            <Separator />
            <div className="p-4">
              <UserProfileBar 
                user={user ? {
                  id: user.id,
                  name: user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー',
                  email: user.email || ''
                } : null} 
                onSignOut={signOut}
              />
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
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                読み込み中...
              </div>
            ) : (
              <>
                <ChannelList channels={channels} pathname={pathname} onChannelCreated={updateSidebarData} />
                <Separator className="my-2" />
                <DirectMessageList directMessages={directMessages} pathname={pathname} onDmCreated={updateSidebarData} />
              </>
            )}
          </div>
          <div className="sticky bottom-0 border-t bg-background p-4">
            <UserProfileBar 
              user={user ? {
                id: user.id,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー',
                email: user.email || ''
              } : null} 
              onSignOut={signOut}
            />
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex flex-col h-screen">{children}</main>
      </div>
    </div>
  );
}