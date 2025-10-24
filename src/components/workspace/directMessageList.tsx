/**
 * ダイレクトメッセージ一覧コンポーネント
 *
 * サイドバーに表示されるDM（1対1チャット）の一覧
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StartDmDialog from '@/components/dm/startDmDialog';
import DmSettingsDialog from '@/components/dm/dmSettingsDialog';
import { UserAvatar } from '@/components/userAvatar';

// DM型（APIレスポンスと一致）
interface DirectMessage {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerAvatarUrl?: string | null;  // プロフィール画像のURL
}

interface DirectMessageListProps {
  directMessages: DirectMessage[];
  pathname: string;
  onDmCreated?: () => void; // サイドバー更新用コールバック
  onDmLeft?: (dmId: string) => void; // DM退出時に即座にUIを更新するコールバック
}

export default function DirectMessageList({ directMessages, pathname, onDmCreated, onDmLeft }: DirectMessageListProps) {
  // モーダル開閉状態
  const [isStartDmOpen, setIsStartDmOpen] = useState(false);
  // DM設定ダイアログの状態管理
  const [settingsDm, setSettingsDm] = useState<DirectMessage | null>(null);
  // 「さらに表示」機能用の状態
  const [showAllDms, setShowAllDms] = useState(false);
  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">ダイレクトメッセージ</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-accent hover:text-accent-foreground text-foreground"
          onClick={() => setIsStartDmOpen(true)}
          title="ユーザーを検索してDMを開始"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <div className="max-h-[200px] overflow-y-auto">
          {directMessages.slice(0, showAllDms ? undefined : 5).map((dm) => {
            const isActive = pathname === `/workspace/dm/${dm.partnerId}`;
            return (
              <div
                key={dm.id}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground mb-1 ${
                  isActive ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <Link
                  href={`/workspace/dm/${dm.partnerId}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <UserAvatar
                    name={dm.partnerName}
                    avatarUrl={dm.partnerAvatarUrl}
                    size="sm"
                    className="h-6 w-6 flex-shrink-0"
                  />
                  <span className="truncate">{dm.partnerName}</span>
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
                      setSettingsDm(dm);
                    }}
                    title="DM設定"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-gray-400 group-hover/delete:text-red-500 transition-colors" />
                  </Button>
                </div>
              </div>
            );
          })}
          {directMessages.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">
              DMがありません
            </p>
          )}
        </div>
        {directMessages.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowAllDms(!showAllDms)}
          >
            {showAllDms ? '表示を減らす' : `さらに表示 (${directMessages.length - 5}件)`}
          </Button>
        )}
      </div>

      {/* DM開始モーダル */}
      <StartDmDialog
        open={isStartDmOpen}
        onOpenChange={setIsStartDmOpen}
        onDmCreated={onDmCreated}
      />

      {/* DM設定ダイアログ */}
      {settingsDm && (
        <DmSettingsDialog
          open={settingsDm !== null}
          onOpenChange={(open) => {
            if (!open) setSettingsDm(null);
          }}
          channelId={settingsDm.id}
          partnerName={settingsDm.partnerName}
          partnerEmail={settingsDm.partnerEmail}
          onDmLeft={onDmLeft}
        />
      )}
    </div>
  );
}