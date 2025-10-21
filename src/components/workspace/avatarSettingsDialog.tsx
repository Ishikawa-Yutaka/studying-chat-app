/**
 * アバター設定ダイアログ
 *
 * アバター画像をアップロードするためのモーダルダイアログ
 * - ファイル選択
 * - 画像プレビュー
 * - アップロード処理
 * - エラーハンドリング
 */

'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/userAvatar';

interface AvatarSettingsDialogProps {
  /**
   * ダイアログの開閉状態
   */
  open: boolean;

  /**
   * ダイアログの開閉状態を変更する関数
   */
  onOpenChange: (open: boolean) => void;

  /**
   * 現在のアバターURL
   */
  currentAvatarUrl?: string | null;

  /**
   * 現在のユーザー名（プレビュー用）
   */
  currentUserName: string;

  /**
   * アバター更新時のコールバック
   * @param newUrl 新しいアバターURL
   */
  onAvatarUpdated: (newUrl: string) => void;
}

export default function AvatarSettingsDialog({
  open,
  onOpenChange,
  currentAvatarUrl,
  currentUserName,
  onAvatarUpdated,
}: AvatarSettingsDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * ファイル選択時の処理
   * - ファイルバリデーション
   * - プレビューURL生成
   */
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイル検証
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setError('ファイルサイズは2MB以下にしてください');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('画像ファイル（JPEG、PNG、WebP、GIF）のみアップロード可能です');
      return;
    }

    // プレビューURL生成
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setError(null);
  };

  /**
   * ファイル選択をクリア
   */
  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * アバター画像をアップロード
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // FormDataを作成
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      // APIリクエスト
      const response = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      console.log('✅ アバターアップロード成功:', data.avatarUrl);

      // 親コンポーネントに新しいURLを通知
      onAvatarUpdated(data.avatarUrl);

      // ダイアログを閉じる
      onOpenChange(false);

      // 状態をリセット
      handleClearSelection();
    } catch (err) {
      console.error('❌ アバターアップロードエラー:', err);
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * ダイアログを閉じる時のクリーンアップ
   */
  const handleClose = () => {
    handleClearSelection();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>アバター設定</DialogTitle>
          <DialogDescription>
            プロフィール画像をアップロードしてください（最大2MB）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 現在のアバター表示 */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm font-medium">現在のアバター</div>
            <UserAvatar
              name={currentUserName}
              avatarUrl={currentAvatarUrl}
              size="lg"
            />
          </div>

          {/* ファイル選択ボタン */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              画像を選択
            </Button>
          </div>

          {/* プレビュー */}
          {previewUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">プレビュー</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="プレビュー"
                  className="h-32 w-32 rounded-full object-cover border-4 border-gray-200"
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {selectedFile?.name} ({(selectedFile!.size / 1024).toFixed(1)} KB)
              </div>
            </div>
          )}

          {/* エラーメッセージ */}
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
            onClick={handleClose}
            disabled={isUploading}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                アップロード
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
