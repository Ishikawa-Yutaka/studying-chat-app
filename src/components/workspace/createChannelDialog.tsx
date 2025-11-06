/**
 * チャンネル作成ダイアログコンポーネント
 *
 * 用途: ユーザーが新しいチャンネルを作成するためのモーダルダイアログ
 *
 * 機能:
 * - チャンネル名の入力（必須）
 * - チャンネル説明の入力（任意）
 * - 入力バリデーション
 * - API経由でチャンネル作成
 * - 作成後のリダイレクト
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated?: () => void; // チャンネル作成後のコールバック（チャンネル一覧を再取得するため）
}

export default function CreateChannelDialog({
  open,
  onOpenChange,
  onChannelCreated
}: CreateChannelDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * フォームリセット
   * モーダルを閉じる時に入力内容をクリアする
   */
  const resetForm = () => {
    setName('');
    setDescription('');
    setError(null);
  };

  /**
   * チャンネル作成処理
   *
   * 処理の流れ:
   * 1. バリデーション（チャンネル名が空でないか）
   * 2. API呼び出し（POST /api/channels）
   * 3. 成功したら新しいチャンネルページに遷移
   * 4. 失敗したらエラーメッセージを表示
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // クライアント側バリデーション
    if (!name.trim()) {
      setError('チャンネル名を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 チャンネル作成開始:', { name, description });

      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // エラーレスポンス
        throw new Error(data.error || 'チャンネルの作成に失敗しました');
      }

      console.log('✅ チャンネル作成成功:', data.channel);

      // 成功: モーダルを閉じる
      onOpenChange(false);
      resetForm();

      // 親コンポーネントに通知（チャンネル一覧を再取得）
      if (onChannelCreated) {
        onChannelCreated();
      }

      // 作成したチャンネルページに遷移
      router.push(`/workspace/channel/${data.channel.id}`);

    } catch (err) {
      console.error('❌ チャンネル作成エラー:', err);
      setError(err instanceof Error ? err.message : 'チャンネルの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * モーダルを閉じる時の処理
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      // モーダルを閉じる時はフォームをリセット
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新しいチャンネルを作成</DialogTitle>
          <DialogDescription>
            チャンネル名と説明を入力してください。チャンネル作成後、自動的にメンバーに追加されます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* チャンネル名入力 */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                チャンネル名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="例: プロジェクト相談"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                maxLength={50}
                autoFocus
              />
            </div>

            {/* チャンネル説明入力 */}
            <div className="grid gap-2">
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="このチャンネルの目的を説明してください"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                maxLength={200}
                rows={3}
              />
            </div>

            {/* エラーメッセージ表示 */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '作成中...' : 'チャンネルを作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
