/**
 * ワークスペースダッシュボード
 * 
 * チャットアプリのメイン画面
 * 統計情報、チャンネル一覧、最近のアクティビティを表示
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Hash, MessageSquare, Users, Plus, Search, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreateChannelDialog from '@/components/workspace/createChannelDialog';
import StartDmDialog from '@/components/dm/startDmDialog';
import JoinChannelDialog from '@/components/channel/joinChannelDialog';
import { UserAvatar } from '@/components/userAvatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// リアルタイム機能のカスタムフック
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { usePresenceContext } from '@/contexts/PresenceContext';
// 認証フック
import { useAuth } from '@/hooks/useAuth';

// 型定義
interface Channel {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

interface DirectMessage {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
}

interface DmStat {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerAvatarUrl?: string | null;
  sentCount: number;
  receivedCount: number;
  totalCount: number;
}

interface DashboardStats {
  channelCount: number;
  dmPartnerCount: number;
  totalUserCount: number;
}

export default function WorkspacePage() {
  // 認証状態
  const { user } = useAuth();

  // 状態管理
  const [isLoading, setIsLoading] = useState(true);
  const [initialStats, setInitialStats] = useState<DashboardStats | null>(null);
  const [initialChannels, setInitialChannels] = useState<Channel[]>([]);
  const [allChannels, setAllChannels] = useState<Channel[]>([]); // 全チャンネル（参加・未参加問わず）
  const [initialDirectMessages, setInitialDirectMessages] = useState<DirectMessage[]>([]);
  const [dmStats, setDmStats] = useState<DmStat[]>([]); // DM統計情報
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isStartDmOpen, setIsStartDmOpen] = useState(false);
  const [isJoinChannelOpen, setIsJoinChannelOpen] = useState(false);

  // 「さらに表示」機能用の状態
  const [showAllChannels, setShowAllChannels] = useState(false);
  const [showAllDmStats, setShowAllDmStats] = useState(false);
  
  // リアルタイムダッシュボードフック：自動的に統計情報がリアルタイム更新される
  const { stats } = useRealtimeDashboard({
    initialStats: initialStats || {
      channelCount: 0,
      dmPartnerCount: 0,
      totalUserCount: 0
    },
    initialChannels,
    initialDirectMessages,
    currentUserId: user?.id || ''
  });

  // PresenceContextからオンライン状態取得
  const { isUserOnline } = usePresenceContext();

  // データ取得
  useEffect(() => {
    // 認証が完了していない場合は実行しない
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        console.log('📊 ダッシュボードデータ取得開始...', user.email);
        
        const response = await fetch(`/api/dashboard?userId=${user.id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'ダッシュボードデータの取得に失敗しました');
        }
        
        if (data.success) {
          console.log('✅ ダッシュボードデータ取得成功:', data.stats);
          setInitialStats(data.stats);
          setInitialChannels(data.myChannels || []); // 参加チャンネル（統計用）
          setAllChannels(data.allChannels || []); // 全チャンネル（表示用）
          setInitialDirectMessages(data.directMessages);
          setDmStats(data.dmStats || []); // DM統計情報
        } else {
          throw new Error(data.error);
        }
        
      } catch (error) {
        console.error('❌ ダッシュボードデータ取得エラー:', error);
        // エラー時は空のデータを設定
        setInitialStats({
          channelCount: 0,
          dmPartnerCount: 0,
          totalUserCount: 0
        });
        setInitialChannels([]);
        setAllChannels([]);
        setInitialDirectMessages([]);
        setDmStats([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // ロード中の表示
  if (isLoading || !initialStats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size={60} />
      </div>
    );
  }

  // DM統計にオンライン状態を追加
  const dmStatsWithOnlineStatus = dmStats.map(stat => ({
    ...stat,
    isOnline: isUserOnline(stat.partnerId)
  }));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 pb-[50vh]">
      {/* ヘッダー */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="border-2 cursor-pointer" onClick={() => setIsJoinChannelOpen(true)}>
            <Search className="mr-2 h-4 w-4" />
            チャンネルを探す
          </Button>
          <Button variant="outline" size="sm" className="border-2 cursor-pointer" onClick={() => setIsCreateChannelOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規チャンネル
          </Button>
          <Button variant="outline" size="sm" className="border-2 cursor-pointer" onClick={() => setIsStartDmOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            ダイレクトメッセージ
          </Button>
          <Link href="/workspace/ai-chat">
            <Button variant="outline" size="sm" className="border-2 cursor-pointer">
              <Bot className="mr-2 h-4 w-4" />
              AIチャット
            </Button>
          </Link>
        </div>
      </div>

      {/* チャンネル作成モーダル */}
      <CreateChannelDialog
        open={isCreateChannelOpen}
        onOpenChange={setIsCreateChannelOpen}
      />

      {/* チャンネル参加モーダル */}
      <JoinChannelDialog
        open={isJoinChannelOpen}
        onOpenChange={setIsJoinChannelOpen}
      />

      {/* DM開始モーダル */}
      <StartDmDialog
        open={isStartDmOpen}
        onOpenChange={setIsStartDmOpen}
      />

      {/* 統計情報カード */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => {
            const element = document.getElementById('channel-list');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">参加チャンネル</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.channelCount}</div>
            <p className="text-xs text-muted-foreground">参加しているチャンネル数（クリックで一覧へ）</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setIsStartDmOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">全メンバー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUserCount}</div>
            <p className="text-xs text-muted-foreground">ワークスペース全体のメンバー数（クリックで一覧へ）</p>
          </CardContent>
        </Card>
      </div>

      {/* チャンネル・DM一覧 */}
      <div className="space-y-4 md:grid md:gap-4 md:grid-cols-2 md:space-y-0">
        {/* チャンネル一覧 */}
        <Card id="channel-list">
          <CardHeader>
            <CardTitle>チャンネル一覧</CardTitle>
            <CardDescription>全てのチャンネル</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={`space-y-4 ${showAllChannels ? 'max-h-[500px]' : 'max-h-[400px]'} overflow-y-auto transition-all duration-300`}>
              {allChannels.slice(0, showAllChannels ? undefined : 5).map((channel) => (
                <div key={channel.id} className="flex items-center">
                  <div className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Hash className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Link
                      href={`/workspace/channel/${channel.id}`}
                      className="font-medium hover:underline block"
                    >
                      {channel.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {channel.description} ({channel.memberCount} 人のメンバー)
                    </p>
                  </div>
                </div>
              ))}
              {allChannels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  チャンネルがありません
                </p>
              )}
            </div>
            {allChannels.length > 5 && (
              <Button
                variant="outline"
                className="w-[280px] mx-auto block border-2"
                onClick={() => setShowAllChannels(!showAllChannels)}
              >
                {showAllChannels ? '表示を減らす' : `さらに表示 (${allChannels.length - 5}件)`}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* DMメッセージ統計 */}
        <Card id="dm-stats">
          <CardHeader>
            <CardTitle>DMメッセージ統計</CardTitle>
            <CardDescription>各ユーザーとのメッセージ数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={`space-y-4 ${showAllDmStats ? 'max-h-[500px]' : 'max-h-[400px]'} overflow-y-auto transition-all duration-300`}>
              {dmStatsWithOnlineStatus.slice(0, showAllDmStats ? undefined : 5).map((stat) => (
                <div key={stat.partnerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={stat.partnerName}
                      avatarUrl={stat.partnerAvatarUrl}
                      size="sm"
                      showOnlineStatus={true}
                      isOnline={stat.isOnline}
                    />
                    <div className="space-y-1">
                      <Link
                        href={`/workspace/dm/${stat.partnerId}`}
                        className="font-medium hover:underline block"
                      >
                        {stat.partnerName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        送信: {stat.sentCount} / 受信: {stat.receivedCount}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stat.totalCount}</p>
                    <p className="text-xs text-muted-foreground">合計</p>
                  </div>
                </div>
              ))}
              {dmStats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  まだDMがありません
                </p>
              )}
            </div>
            {dmStats.length > 5 && (
              <Button
                variant="outline"
                className="w-[280px] mx-auto block border-2"
                onClick={() => setShowAllDmStats(!showAllDmStats)}
              >
                {showAllDmStats ? '表示を減らす' : `さらに表示 (${dmStats.length - 5}件)`}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}