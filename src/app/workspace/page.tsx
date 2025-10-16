/**
 * ワークスペースダッシュボード
 * 
 * チャットアプリのメイン画面
 * 統計情報、チャンネル一覧、最近のアクティビティを表示
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Hash, MessageSquare, Users, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreateChannelDialog from '@/components/workspace/createChannelDialog';
import StartDmDialog from '@/components/dm/startDmDialog';
import JoinChannelDialog from '@/components/channel/joinChannelDialog';

// リアルタイム機能のカスタムフック
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
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

interface DashboardStats {
  channelCount: number;
  dmCount: number;
  totalRoomsCount: number;
  userMessageCount: number;
  totalUserCount: number;
}

export default function WorkspacePage() {
  // 認証状態
  const { user } = useAuth();

  // 状態管理
  const [isLoading, setIsLoading] = useState(true);
  const [initialStats, setInitialStats] = useState<DashboardStats | null>(null);
  const [initialChannels, setInitialChannels] = useState<Channel[]>([]);
  const [initialDirectMessages, setInitialDirectMessages] = useState<DirectMessage[]>([]);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isStartDmOpen, setIsStartDmOpen] = useState(false);
  const [isJoinChannelOpen, setIsJoinChannelOpen] = useState(false);
  
  // リアルタイムダッシュボードフック：自動的に統計情報がリアルタイム更新される
  const { stats, channels, directMessages } = useRealtimeDashboard({
    initialStats: initialStats || {
      channelCount: 0,
      dmCount: 0,
      totalRoomsCount: 0,
      userMessageCount: 0,
      totalUserCount: 0
    },
    initialChannels,
    initialDirectMessages,
    currentUserId: user?.id || ''
  });

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
          setInitialChannels(data.channels);
          setInitialDirectMessages(data.directMessages);
        } else {
          throw new Error(data.error);
        }
        
      } catch (error) {
        console.error('❌ ダッシュボードデータ取得エラー:', error);
        // エラー時は空のデータを設定
        setInitialStats({
          channelCount: 0,
          dmCount: 0,
          totalRoomsCount: 0,
          userMessageCount: 0,
          totalUserCount: 0
        });
        setInitialChannels([]);
        setInitialDirectMessages([]);
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
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsJoinChannelOpen(true)}>
            <Search className="mr-2 h-4 w-4" />
            チャンネルを探す
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsStartDmOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            新規 DM
          </Button>
          <Button size="sm" onClick={() => setIsCreateChannelOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規チャンネル
          </Button>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">チャンネル・DM</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoomsCount}</div>
            <p className="text-xs text-muted-foreground">参加しているチャンネル・DM 数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">メッセージ</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userMessageCount}</div>
            <p className="text-xs text-muted-foreground">自分が投稿したメッセージ数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">メンバー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUserCount}</div>
            <p className="text-xs text-muted-foreground">ワークスペース全体のメンバー数</p>
          </CardContent>
        </Card>
      </div>

      {/* チャンネル・DM一覧 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* チャンネル一覧 */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>チャンネル一覧</CardTitle>
            <CardDescription>参加しているチャンネル一覧</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channels.map((channel) => (
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
              {channels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  まだチャンネルに参加していません
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* DM一覧 */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>DM 一覧</CardTitle>
            <CardDescription>ダイレクトメッセージ一覧</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {directMessages.map((dm) => (
                <div key={dm.id} className="flex items-center">
                  <div className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <span className="font-medium text-primary">
                      {dm.partnerName.charAt(0)}
                    </span>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Link 
                      href={`/workspace/dm/${dm.partnerId}`} 
                      className="font-medium hover:underline block"
                    >
                      {dm.partnerName}
                    </Link>
                    <p className="text-sm text-muted-foreground">ダイレクトメッセージ</p>
                  </div>
                </div>
              ))}
              {directMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  まだDMがありません
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}