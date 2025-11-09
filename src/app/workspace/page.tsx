/**
 * ワークスペースダッシュボード
 *
 * チャットアプリのメイン画面
 * 統計情報、チャンネル一覧、最近のアクティビティを表示
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Hash, Users, Plus, Search, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CreateChannelDialog from "@/components/workspace/createChannelDialog";
import StartDmDialog from "@/components/dm/startDmDialog";
import JoinChannelDialog from "@/components/channel/joinChannelDialog";
import { UserAvatar } from "@/components/userAvatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// リアルタイム機能のカスタムフック
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { usePresenceContext } from "@/contexts/PresenceContext";
// 認証フック
import { useAuth } from "@/hooks/useAuth";
// SWR（データキャッシュ・自動再検証）
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

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

interface AiSession {
  id: string;
  title: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  messageCount: number;
}

interface DashboardStats {
  channelCount: number;
  dmPartnerCount: number;
  totalUserCount: number;
}

export default function WorkspacePage() {
  // 認証状態
  const { user } = useAuth();

  // ダイアログ状態管理
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isStartDmOpen, setIsStartDmOpen] = useState(false);
  const [isJoinChannelOpen, setIsJoinChannelOpen] = useState(false);

  // 「さらに表示」機能用の状態
  const [showAllChannels, setShowAllChannels] = useState(false);
  const [showAllDmStats, setShowAllDmStats] = useState(false);
  const [showAllAiSessions, setShowAllAiSessions] = useState(false);

  /**
   * SWRでダッシュボードデータを取得（キャッシュ・自動再検証）
   *
   * メリット:
   * 1. 初回: サーバーからデータ取得
   * 2. 2回目以降: キャッシュから即座に表示 → バックグラウンドで最新データ取得
   * 3. ページ切り替え後に戻ってきた時も高速表示
   */
  const { data: dashboardData, error: dashboardError } = useSWR(
    user?.id ? `/api/dashboard?userId=${user.id}` : null,
    fetcher
  );

  /**
   * SWRでAIセッションを取得（キャッシュ・自動再検証）
   */
  const { data: aiSessionsData, error: aiSessionsError } = useSWR(
    user?.id ? "/api/ai/sessions" : null,
    fetcher
  );

  // データ取得状態の判定
  const isLoading = !dashboardData && !dashboardError;

  // データの抽出（SWRのレスポンスから必要な情報を取り出す）
  const initialStats = dashboardData?.success ? dashboardData.stats : {
    channelCount: 0,
    dmPartnerCount: 0,
    totalUserCount: 0,
  };
  const initialChannels = dashboardData?.success ? (dashboardData.myChannels || []) : [];
  const initialDirectMessages = dashboardData?.success ? (dashboardData.directMessages || []) : [];
  const dmStats = dashboardData?.success ? (dashboardData.dmStats || []) : [];
  const aiSessions = aiSessionsData?.success ? (aiSessionsData.sessions || []) : [];

  // リアルタイムダッシュボードフック：自動的に統計情報がリアルタイム更新される
  const { stats } = useRealtimeDashboard({
    initialStats,
    initialChannels,
    initialDirectMessages,
    currentUserId: user?.id || "",
  });

  // PresenceContextからオンライン状態取得
  const { isUserOnline } = usePresenceContext();

  /**
   * DM統計にオンライン状態を追加（パフォーマンス最適化）
   *
   * useMemoを使用して、dmStatsかisUserOnlineが変わった時だけ再計算
   * これにより、親コンポーネントの再レンダリングで不要な配列生成を防ぐ
   *
   * IMPORTANT: useMemoは早期リターンの前に配置する必要がある（Reactのルール）
   * ロード中でもhook順序を一定に保つため、内部でnullチェックを行う
   */
  const dmStatsWithOnlineStatus = useMemo(() => {
    // データがまだロードされていない場合は空配列を返す
    if (!dmStats || dmStats.length === 0) return [];

    return dmStats.map((stat) => ({
      ...stat,
      isOnline: isUserOnline(stat.partnerId),
    }));
  }, [dmStats, isUserOnline]);

  // ロード中の表示（SWRでデータ取得中）
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={60} />
      </div>
    );
  }

  // エラー時の表示
  if (dashboardError || aiSessionsError) {
    console.error("❌ データ取得エラー:", { dashboardError, aiSessionsError });
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">データの取得に失敗しました</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 pb-8 md:pb-16">
      {/* コンテンツ全体を中央寄せ・最大幅制限 */}
      <div className="max-w-7xl mx-auto space-y-4">
      {/* ヘッダー */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-2 cursor-pointer"
            onClick={() => setIsJoinChannelOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            チャンネルを探す
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-2 cursor-pointer"
            onClick={() => setIsCreateChannelOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            新規チャンネル
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-2 cursor-pointer"
            onClick={() => setIsStartDmOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            ダイレクトメッセージ
          </Button>
          <Link href="/workspace/ai-chat">
            <Button
              variant="outline"
              size="sm"
              className="border-2 cursor-pointer"
            >
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
      <StartDmDialog open={isStartDmOpen} onOpenChange={setIsStartDmOpen} />

      {/* コンテンツエリア全体（1つのグリッドに統一） */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 参加チャンネル一覧 */}
        <Card id="channel-list">
          <CardHeader>
            <CardTitle>参加チャンネル</CardTitle>
            <CardDescription>あなたが参加しているチャンネル</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div
              className={`space-y-4 ${
                showAllChannels ? "max-h-[500px]" : "max-h-[400px]"
              } overflow-y-auto transition-all duration-300`}
            >
              {initialChannels
                .slice(0, showAllChannels ? undefined : 5)
                .map((channel) => (
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
                        {channel.description} ({channel.memberCount}{" "}
                        人のメンバー)
                      </p>
                    </div>
                  </div>
                ))}
              {initialChannels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  参加しているチャンネルがありません
                </p>
              )}
            </div>
            {initialChannels.length > 5 && (
              <Button
                variant="outline"
                className="w-[280px] mx-auto block border-2"
                onClick={() => setShowAllChannels(!showAllChannels)}
              >
                {showAllChannels
                  ? "表示を減らす"
                  : `さらに表示 (${initialChannels.length - 5}件)`}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* DMメッセージ統計 */}
        <Card id="dm-stats">
          <CardHeader>
            <CardTitle>ダイレクトメッセージ</CardTitle>
            <CardDescription>各ユーザーとのメッセージ数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div
              className={`space-y-4 ${
                showAllDmStats ? "max-h-[500px]" : "max-h-[400px]"
              } overflow-y-auto transition-all duration-300`}
            >
              {dmStatsWithOnlineStatus
                .slice(0, showAllDmStats ? undefined : 5)
                .map((stat) => (
                  <div
                    key={stat.partnerId}
                    className="flex items-center justify-between"
                  >
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
                {showAllDmStats
                  ? "表示を減らす"
                  : `さらに表示 (${dmStats.length - 5}件)`}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* AIチャット一覧（左側1列のみ） */}
        <Card id="ai-chat-sessions">
        <CardHeader>
          <CardTitle>AIチャット一覧</CardTitle>
          <CardDescription>あなたのAIとの会話履歴</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div
            className={`space-y-4 ${
              showAllAiSessions ? "max-h-[500px]" : "max-h-[400px]"
            } overflow-y-auto transition-all duration-300`}
          >
            {aiSessions
              .slice(0, showAllAiSessions ? undefined : 5)
              .map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <Link
                        href={`/workspace/ai-chat?sessionId=${session.id}`}
                        className="font-medium hover:underline block truncate"
                      >
                        {session.title || "新しい会話"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {session.messageCount}件のメッセージ
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            {aiSessions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                まだAIとの会話がありません
              </p>
            )}
          </div>
          {aiSessions.length > 5 && (
            <Button
              variant="outline"
              className="w-[280px] mx-auto block border-2"
              onClick={() => setShowAllAiSessions(!showAllAiSessions)}
            >
              {showAllAiSessions
                ? "表示を減らす"
                : `さらに表示 (${aiSessions.length - 5}件)`}
            </Button>
          )}
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
