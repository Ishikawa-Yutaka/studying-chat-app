/**
 * ワークスペースレイアウト
 * 認証機能統合版
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import AppLogo from '@/components/workspace/appLogo';
import ChannelList from '@/components/workspace/channelList';
import DirectMessageList from '@/components/workspace/directMessageList';
import UserProfileBar from '@/components/workspace/userProfileBar';
import SettingsMenu from '@/components/workspace/settingsMenu';
import AvatarSettingsDialog from '@/components/workspace/avatarSettingsDialog';
import { useAuth } from '@/hooks/useAuth';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [isAvatarSettingsOpen, setIsAvatarSettingsOpen] = useState<boolean>(false);

  // 認証状態管理
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  
  // データベース状態管理
  const [channels, setChannels] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    memberCount: number;
    creatorId?: string | null;
  }>>([]);
  const [directMessages, setDirectMessages] = useState<Array<{
    id: string;
    partnerId: string;
    partnerName: string;
    partnerEmail: string;
    partnerAvatarUrl?: string | null;
  }>>([]);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🚫 認証されていません。ログインページにリダイレクト');
      router.push('/login');
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  // チャンネル参加時の即座のUI更新
  const handleChannelJoined = useCallback((channel: { id: string; name: string; description?: string; memberCount: number }) => {
    console.log('🔄 チャンネルをUIに即座に追加:', channel.name);
    setChannels((prev) => [...prev, channel]);
  }, []);

  // チャンネル退出時の即座のUI更新
  const handleChannelLeft = useCallback((channelId: string) => {
    console.log('🔄 チャンネルをUIから即座に削除（退出）:', channelId);
    setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
  }, []);

  // チャンネル削除時の即座のUI更新
  const handleChannelDeleted = useCallback((channelId: string) => {
    console.log('🔄 チャンネルをUIから即座に削除（削除）:', channelId);
    setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
  }, []);

  // DM退出時の即座のUI更新
  const handleDmLeft = useCallback((dmId: string) => {
    console.log('🔄 DMをUIから即座に削除:', dmId);
    setDirectMessages((prev) => prev.filter((dm) => dm.id !== dmId));
  }, []);

  // サイドバーデータ更新関数
  const updateSidebarData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔄 サイドバーデータ更新開始...');
      setIsLoading(true);

      // チャンネル・DM一覧取得（認証トークンから自動的にユーザーを判定）
      const channelsResponse = await fetch('/api/channels');  // userIdパラメータ削除
      const channelsData = await channelsResponse.json();

      if (!channelsResponse.ok) {
        throw new Error(channelsData.error || 'チャンネル取得に失敗しました');
      }

      if (channelsData.success) {
        console.log(`✅ サイドバーデータ更新成功:`, channelsData.counts);
        setChannels(channelsData.channels);
        setDirectMessages(channelsData.directMessages);

        // 現在のユーザー情報も同時に取得（avatarUrlを含む）
        if (channelsData.currentUser) {
          setCurrentUser({
            id: channelsData.currentUser.id,
            name: channelsData.currentUser.name,
            email: channelsData.currentUser.email,
            avatarUrl: channelsData.currentUser.avatarUrl
          });
        }
      } else {
        throw new Error(channelsData.error);
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

  // 注: DM退出とチャンネル削除は楽観的更新を使用しているため、イベントリスナーは不要

  return (
    <div className="flex min-h-screen flex-col">
      {/* モバイルナビゲーション */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-gray-900 text-white px-4 lg:hidden shadow-sm">
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
              <ChannelList channels={channels} pathname={pathname} currentUserId={currentUser?.id} onChannelCreated={updateSidebarData} onChannelJoined={handleChannelJoined} onChannelLeft={handleChannelLeft} onChannelDeleted={handleChannelDeleted} />
              <Separator className="my-2" />
              <DirectMessageList directMessages={directMessages} pathname={pathname} onDmCreated={updateSidebarData} onDmLeft={handleDmLeft} />
              <Separator className="my-2" />
              {/* AIチャットリンク */}
              <div className="px-3 py-2">
                <Link
                  href="/workspace/ai-chat"
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    pathname === '/workspace/ai-chat'
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Bot className="h-5 w-5" />
                  AIチャット
                </Link>
              </div>
            </div>
            <Separator />
            {/* 設定メニュー */}
            <SettingsMenu onAvatarSettingsClick={() => setIsAvatarSettingsOpen(true)} onSignOut={signOut} />
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
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                読み込み中...
              </div>
            ) : (
              <>
                <ChannelList channels={channels} pathname={pathname} currentUserId={currentUser?.id} onChannelCreated={updateSidebarData} onChannelJoined={handleChannelJoined} onChannelLeft={handleChannelLeft} onChannelDeleted={handleChannelDeleted} />
                <Separator className="my-2" />
                <DirectMessageList directMessages={directMessages} pathname={pathname} onDmCreated={updateSidebarData} onDmLeft={handleDmLeft} />
                <Separator className="my-2" />
                {/* AIチャットリンク */}
                <div className="px-3 py-2">
                  <Link
                    href="/workspace/ai-chat"
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      pathname === '/workspace/ai-chat'
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Bot className="h-5 w-5" />
                    AIチャット
                  </Link>
                </div>
              </>
            )}
          </div>
          {/* 設定メニュー */}
          <SettingsMenu onAvatarSettingsClick={() => setIsAvatarSettingsOpen(true)} onSignOut={signOut} />
          <div className="sticky bottom-0 border-t bg-background p-4">
            <UserProfileBar user={currentUser} />
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex flex-col h-screen">{children}</main>
      </div>

      {/* アバター設定ダイアログ */}
      <AvatarSettingsDialog
        open={isAvatarSettingsOpen}
        onOpenChange={setIsAvatarSettingsOpen}
        currentAvatarUrl={currentUser?.avatarUrl}
        currentUserName={currentUser?.name || ''}
        onAvatarUpdated={(newUrl) => {
          // アバターURLを更新
          setCurrentUser(prev => prev ? { ...prev, avatarUrl: newUrl } : null);
        }}
      />
    </div>
  );
}