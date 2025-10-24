/**
 * DM設定ダイアログコンポーネント
 *
 * 用途: DMの設定・退出を行うモーダルダイアログ
 *
 * 機能:
 * - 相手のユーザー情報表示
 * - DM退出（確認ダイアログ付き）
 * - 退出後のリダイレクト
 *
 * 重要: DM退出は自分側だけから非表示にする（相手には影響なし）
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DmSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  partnerName: string;
  partnerEmail: string;
  onDmLeft?: (dmId: string) => void; // DM退出時のコールバック（楽観的更新）
}

export default function DmSettingsDialog({
  open,
  onOpenChange,
  channelId,
  partnerName,
  partnerEmail,
  onDmLeft
}: DmSettingsDialogProps) {
  const router = useRouter();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * DM退出処理
   *
   * 処理の流れ:
   * 1. API呼び出し（DELETE /api/dm/leave/[channelId]）
   * 2. 成功したらワークスペースのトップページに遷移
   * 3. 失敗したらエラーメッセージを表示
   *
   * 重要: 相手には影響しない（自分だけDM一覧から消える）
   */
  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);

    try {
      console.log('🔄 DM退出開始:', channelId);

      const response = await fetch(`/api/dm/leave/${channelId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'DMからの退出に失敗しました');
      }

      console.log('✅ DM退出成功:', data.partnerName);

      // 退出成功: モーダルを閉じる
      setShowLeaveConfirm(false);
      onOpenChange(false);

      // 楽観的更新: 即座にサイドバーからDMを削除
      if (onDmLeft) {
        onDmLeft(channelId);
      }

      // ワークスペースのトップページに遷移
      // （退出したDMページにはもういられないため）
      router.push('/workspace');

    } catch (err) {
      console.error('❌ DM退出エラー:', err);
      setError(err instanceof Error ? err.message : 'DMからの退出に失敗しました');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <>
      {/* メイン設定ダイアログ */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>DM設定</DialogTitle>
            <DialogDescription>
              {partnerName} とのDM
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 相手のユーザー情報表示 */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">相手のユーザー</p>
                <p className="text-sm text-muted-foreground">{partnerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium">メールアドレス</p>
                <p className="text-sm text-muted-foreground">{partnerEmail}</p>
              </div>
            </div>

            {/* エラーメッセージ表示 */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* 危険な操作セクション */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-destructive mb-2">DMから退出</h3>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowLeaveConfirm(true)}
                disabled={isLeaving}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                DMから退出する
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                ℹ️ このDMがあなたのDM一覧から削除されます。相手には影響しません。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 退出確認ダイアログ */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DMから退出しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {partnerName} とのDMから退出しようとしています。
              <br />
              <br />
              このDMがあなたのDM一覧から削除されます。相手のDM一覧には残ります。
              <br />
              <br />
              再度DMを開始すると、新しいDMチャンネルが作成されます（以前の履歴は見えなくなります）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={isLeaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeaving ? '退出中...' : '退出する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
