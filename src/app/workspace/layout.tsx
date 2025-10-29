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
import MobileSidebar from '@/components/workspace/mobileSidebar';
import { Separator } from '@/components/ui/separator';
import AppLogo from '@/components/workspace/appLogo';
import ChannelList from '@/components/workspace/channelList';
import DirectMessageList from '@/components/workspace/directMessageList';
import UserProfileBar from '@/components/workspace/userProfileBar';
import SettingsMenu from '@/components/workspace/settingsMenu';
import AvatarSettingsDialog from '@/components/workspace/avatarSettingsDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useOnlineStatusSync } from '@/hooks/useOnlineStatusSync';
import { createClient } from '@/lib/supabase/client';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [isAvatarSettingsOpen, setIsAvatarSettingsOpen] = useState<boolean>(false);

  // 認証状態管理
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();

  // Presenceでリアルタイムオンライン状態を追跡
  // ユーザーがワークスペースにいる間、自動的にオンラインとして登録
  // タブを閉じると自動的にオフラインに
  const { isUserOnline } = usePresence({
    userId: user?.id || null,
    enabled: isAuthenticated,
  });

  // オンライン状態をデータベースに同期
  // タブを閉じる、別のタブに移動する、ページを離れる時に自動的にオフライン状態に更新
  // 認証されている時のみ有効化
  useOnlineStatusSync({ enabled: isAuthenticated });

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

  // 注:
  // - オンライン状態はPresenceで管理（データベースのisOnlineは削除済み）
  // - Userテーブルのリアルタイム監視は不要（DirectMessageListが個別にPresenceイベントを監視）
  // - DM退出とチャンネル削除は楽観的更新を使用

  return (
    <div className="flex min-h-screen flex-col">
      {/* モバイルナビゲーション */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b px-4 lg:hidden shadow-sm" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">ナビゲーションメニューを開く</span>
        </Button>
        <AppLogo />
      </header>

      {/* モバイルサイドバー */}
      <MobileSidebar open={open} onOpenChange={setOpen}>
        <div className="flex flex-col h-full">
          <div className="px-6 py-4 flex-shrink-0">
            <AppLogo />
          </div>
          <Separator className="flex-shrink-0" />
          <div className="flex-1 overflow-y-auto min-h-0">
            <ChannelList channels={channels} pathname={pathname} currentUserId={currentUser?.id} onChannelCreated={updateSidebarData} onChannelJoined={handleChannelJoined} onChannelLeft={handleChannelLeft} onChannelDeleted={handleChannelDeleted} onLinkClick={() => setOpen(false)} />
            <Separator className="my-2" />
            <DirectMessageList directMessages={directMessages} pathname={pathname} onDmCreated={updateSidebarData} onDmLeft={handleDmLeft} onLinkClick={() => setOpen(false)} isUserOnline={isUserOnline} />
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
                onClick={() => setOpen(false)}
              >
                <Bot className="h-5 w-5" />
                AIチャット
              </Link>
            </div>
          </div>
          <Separator className="flex-shrink-0" />
          {/* 設定メニュー */}
          <div className="flex-shrink-0">
            <SettingsMenu onAvatarSettingsClick={() => setIsAvatarSettingsOpen(true)} onSignOut={signOut} />
          </div>
          <div className="p-4 flex-shrink-0">
            <UserProfileBar user={currentUser} />
          </div>
        </div>
      </MobileSidebar>

      {/* デスクトップレイアウト */}
      <div className="flex-1 items-start lg:grid lg:grid-cols-[280px_1fr]">
        {/* サイドバー (デスクトップのみ表示) */}
        <aside className="hidden border-r lg:flex lg:flex-col lg:h-screen overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }}>
          <div className="flex h-14 items-center border-b px-6 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--background))' }}>
            <AppLogo />
          </div>
          <div className="flex-1 py-2 overflow-y-auto">
            {isLoading ? (
              <LoadingSpinner size={40} />
            ) : (
              <>
                <ChannelList channels={channels} pathname={pathname} currentUserId={currentUser?.id} onChannelCreated={updateSidebarData} onChannelJoined={handleChannelJoined} onChannelLeft={handleChannelLeft} onChannelDeleted={handleChannelDeleted} />
                <Separator className="my-2" />
                <DirectMessageList directMessages={directMessages} pathname={pathname} onDmCreated={updateSidebarData} onDmLeft={handleDmLeft} isUserOnline={isUserOnline} />
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
          <div className="flex-shrink-0">
            <SettingsMenu onAvatarSettingsClick={() => setIsAvatarSettingsOpen(true)} onSignOut={signOut} />
          </div>
          <div className="flex-shrink-0 p-4" style={{ backgroundColor: 'hsl(var(--background))' }}>
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