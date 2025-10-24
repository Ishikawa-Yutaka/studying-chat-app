/**
 * チャンネル設定ダイアログコンポーネント
 *
 * 用途: チャンネルの設定・削除を行うモーダルダイアログ
 *
 * 機能:
 * - チャンネル情報の表示
 * - チャンネル削除（確認ダイアログ付き）
 * - 削除後のリダイレクト
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
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

interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
  channelDescription?: string;
  onChannelDeleted?: (channelId: string) => void; // チャンネル削除時のコールバック（楽観的更新）
}

export default function ChannelSettingsDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
  channelDescription,
  onChannelDeleted
}: ChannelSettingsDialogProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * チャンネル削除処理
   *
   * 処理の流れ:
   * 1. API呼び出し（DELETE /api/channels/[channelId]）
   * 2. 成功したらワークスペースのトップページに遷移
   * 3. 失敗したらエラーメッセージを表示
   */
  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      console.log('🔄 チャンネル削除開始:', channelId);

      const response = await fetch(`/api/channels/${channelId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'チャンネルの削除に失敗しました');
      }

      console.log('✅ チャンネル削除成功:', data.channelName);

      // 削除成功: モーダルを閉じる
      setShowDeleteConfirm(false);
      onOpenChange(false);

      // 楽観的更新: 即座にサイドバーからチャンネルを削除
      if (onChannelDeleted) {
        onChannelDeleted(channelId);
      }

      // ワークスペースのトップページに遷移
      // （削除したチャンネルページにはもういられないため）
      router.push('/workspace');

    } catch (err) {
      console.error('❌ チャンネル削除エラー:', err);
      setError(err instanceof Error ? err.message : 'チャンネルの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* メイン設定ダイアログ */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>チャンネル設定</DialogTitle>
            <DialogDescription>
              {channelName} の設定
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* チャンネル情報表示 */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">チャンネル名</p>
                <p className="text-sm text-muted-foreground">{channelName}</p>
              </div>
              {channelDescription && (
                <div>
                  <p className="text-sm font-medium">説明</p>
                  <p className="text-sm text-muted-foreground">{channelDescription}</p>
                </div>
              )}
            </div>

            {/* エラーメッセージ表示 */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* 危険な操作セクション */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-destructive mb-2">危険な操作</h3>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                チャンネルを削除
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ この操作は取り消せません。チャンネル内のすべてのメッセージが削除されます。
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

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              チャンネル「{channelName}」を削除しようとしています。
              <br />
              <br />
              この操作は取り消せません。チャンネル内のすべてのメッセージとメンバー情報が完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
