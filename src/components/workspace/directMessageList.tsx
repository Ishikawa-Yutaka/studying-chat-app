/**
 * ダイレクトメッセージ一覧コンポーネント
 *
 * サイドバーに表示されるDM（1対1チャット）の一覧
 *
 * オンライン状態の管理:
 * - Presence: リアルタイムオンライン状態追跡（usePresenceで取得）
 * - lastSeen: 最終オンライン時刻（データベース + Presenceイベントでローカル更新）
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StartDmDialog from "@/components/dm/startDmDialog";
import { UserAvatar } from "@/components/userAvatar";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// DM型（APIレスポンスと一致）
interface DirectMessage {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerAvatarUrl?: string | null; // プロフィール画像のURL
  lastSeen?: Date; // 最終オンライン時刻（データベースから取得 + Presenceで更新）
}

interface DirectMessageListProps {
  directMessages: DirectMessage[];
  pathname: string;
  onDmCreated?: () => void; // サイドバー更新用コールバック
  onDmLeft?: (dmId: string) => void; // DM退出時に即座にUIを更新するコールバック
  onLinkClick?: () => void; // リンククリック時にサイドバーを閉じるコールバック（モバイル用）
  isUserOnline: (userId: string) => boolean; // Presenceでユーザーのオンライン状態を確認する関数（layout.tsxから渡される）
}

export default function DirectMessageList({
  directMessages,
  pathname,
  onDmCreated,
  onDmLeft,
  onLinkClick,
  isUserOnline,
}: DirectMessageListProps) {
  const router = useRouter();
  // モーダル開閉状態
  const [isStartDmOpen, setIsStartDmOpen] = useState(false);
  // DM削除確認ダイアログの状態管理
  const [leaveDm, setLeaveDm] = useState<DirectMessage | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  // 「さらに表示」機能用の状態
  const [showAllDms, setShowAllDms] = useState(false);

  // ローカル状態でDM一覧を保持（PresenceイベントでlastSeenを更新するため）
  const [localDirectMessages, setLocalDirectMessages] =
    useState<DirectMessage[]>(directMessages);

  // propsのdirectMessagesが変更されたらローカル状態を更新
  useEffect(() => {
    setLocalDirectMessages(directMessages);
  }, [directMessages]);

  /**
   * DM退出処理
   */
  const handleLeaveDm = async () => {
    if (!leaveDm) return;

    setIsLeaving(true);

    try {
      console.log('🔄 DM退出開始:', leaveDm.id);

      const response = await fetch(`/api/dm/leave/${leaveDm.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'DMからの退出に失敗しました');
      }

      console.log('✅ DM退出成功:', data.partnerName);

      // 退出成功: モーダルを閉じる
      setLeaveDm(null);

      // 即座にUIを更新（楽観的更新）
      if (onDmLeft) {
        onDmLeft(leaveDm.id);
      }

      // 現在そのDMページにいる場合はワークスペースに遷移
      if (pathname === `/workspace/dm/${leaveDm.partnerId}`) {
        router.push('/workspace');
      }

    } catch (err) {
      console.error('❌ DM退出エラー:', err);
      alert(err instanceof Error ? err.message : 'DMからの退出に失敗しました');
    } finally {
      setIsLeaving(false);
    }
  };

  // オンライン状態判定関数はpropsから受け取る（layout.tsxのusePresenceの結果）
  // ローカルでusePresenceを呼び出す必要はない

  // Presence leaveイベントをリッスンしてlastSeenを更新
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("dm-list-online-users");

    channel
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          const offlineUserId = presence.user_id;
          console.log(`👋 DM一覧: ユーザーがオフライン - ${offlineUserId}`);

          // ローカル状態のlastSeenを更新
          setLocalDirectMessages((prev) =>
            prev.map((dm) =>
              dm.partnerId === offlineUserId
                ? { ...dm, lastSeen: new Date() }
                : dm
            )
          );
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">
          ダイレクトメッセージ
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-accent hover:text-accent-foreground text-foreground"
          onClick={() => setIsStartDmOpen(true)}
          title="ユーザーを検索してDMを開始"
          data-testid="start-dm-button"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1" data-testid="dm-list">
        <div
          className={`${
            showAllDms ? "max-h-[400px]" : "max-h-[200px]"
          } overflow-y-auto transition-all duration-300`}
        >
          {localDirectMessages
            .slice(0, showAllDms ? undefined : 5)
            .map((dm) => {
              const isActive = pathname === `/workspace/dm/${dm.partnerId}`;
              // Presenceでリアルタイムオンライン状態を取得
              const isOnline = isUserOnline(dm.partnerId);

              return (
                <div
                  key={dm.id}
                  data-testid="dm-item"
                  className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground mb-1 ${
                    isActive ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <Link
                    href={`/workspace/dm/${dm.partnerId}`}
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={onLinkClick}
                  >
                    <UserAvatar
                      name={dm.partnerName}
                      avatarUrl={dm.partnerAvatarUrl}
                      size="sm"
                      className="h-6 w-6"
                      showOnlineStatus={true}
                      isOnline={isOnline}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate">{dm.partnerName}</span>
                      {/* オフライン時のみlastSeenを表示 */}
                      {!isOnline && dm.lastSeen && (
                        <span className="text-xs text-muted-foreground truncate">
                          {formatRelativeTime(dm.lastSeen)}にアクティブ
                        </span>
                      )}
                    </div>
                  </Link>
                  {/* アクションボタンエリア */}
                  <div className="flex items-center gap-0.5">
                    {/* 削除アイコン */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="group/delete h-5 w-5 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLeaveDm(dm);
                      }}
                      title="DMから退出"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400 group-hover/delete:text-red-500 transition-colors" />
                    </Button>
                  </div>
                </div>
              );
            })}
          {localDirectMessages.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">DMがありません</p>
          )}
        </div>
        {localDirectMessages.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-[80%] mx-auto block mt-2 border-2"
            onClick={() => setShowAllDms(!showAllDms)}
          >
            {showAllDms
              ? "表示を減らす"
              : `さらに表示 (${localDirectMessages.length - 5}件)`}
          </Button>
        )}
      </div>

      {/* DM開始モーダル */}
      <StartDmDialog
        open={isStartDmOpen}
        onOpenChange={setIsStartDmOpen}
        onDmCreated={onDmCreated}
      />

      {/* DM退出確認ダイアログ */}
      <AlertDialog open={leaveDm !== null} onOpenChange={(open) => !open && setLeaveDm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DMから退出しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveDm?.partnerName} とのDMから退出しようとしています。
              <br />
              <br />
              このDMがあなたのDM一覧から削除されます。相手のDM一覧には残ります。
              <br />
              <br />
              再度DMを開始すると、以前のメッセージも引き続き見られます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveDm}
              disabled={isLeaving}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isLeaving ? '退出中...' : '退出する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
