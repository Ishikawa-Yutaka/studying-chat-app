'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ファイルプレビューモーダルのProps型定義
 */
interface FilePreviewModalProps {
  isOpen: boolean;              // モーダルが開いているか
  onClose: () => void;          // モーダルを閉じる関数
  fileUrl: string;              // ファイルのURL
  fileName: string;             // ファイル名
  fileType: string;             // ファイルのMIMEタイプ
}

/**
 * ファイルプレビューモーダルコンポーネント
 *
 * 機能:
 * - PDF: iframeで直接表示
 * - Word/Excel/PowerPoint: Microsoft Office Online Viewerで表示
 * - 画像: 拡大表示
 */
export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: FilePreviewModalProps) {
  if (!isOpen) return null;

  /**
   * ファイルタイプに応じたプレビューURLを生成
   */
  const getPreviewUrl = () => {
    // PDFファイル
    if (fileType === 'application/pdf') {
      return fileUrl;
    }

    // Microsoft Office文書（Word、Excel、PowerPoint）
    // Microsoft Office Online Viewerを使用
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // .docx
      fileType === 'application/msword' || // .doc
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
      fileType === 'application/vnd.ms-excel' || // .xls
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || // .pptx
      fileType === 'application/vnd.ms-powerpoint' // .ppt
    ) {
      // Microsoft Office Online Viewerを使用
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    }

    // 画像ファイル
    if (fileType.startsWith('image/')) {
      return fileUrl;
    }

    // その他のファイル（プレビュー不可）
    return null;
  };

  const previewUrl = getPreviewUrl();
  const isImage = fileType.startsWith('image/');

  /**
   * 背景クリックでモーダルを閉じる
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-lg shadow-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold truncate flex-1 mr-4">
            {fileName}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* プレビュー本体 */}
        <div className="w-full h-[calc(100%-4rem)] overflow-auto">
          {previewUrl ? (
            isImage ? (
              // 画像の場合
              <div className="flex items-center justify-center h-full p-4">
                <img
                  src={previewUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              // PDF・Office文書の場合
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={fileName}
              />
            )
          ) : (
            // プレビュー不可の場合
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>このファイル形式はプレビューできません。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
