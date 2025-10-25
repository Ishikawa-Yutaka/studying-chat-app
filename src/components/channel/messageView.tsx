// 基本的なスタイリングのみで実装（shadcn/ui依存を削除）

import { useLayoutEffect, useRef, useState } from "react";
import { MessageSquare, FileText, Download } from "lucide-react";
import FilePreviewModal from "./filePreviewModal";
import { UserAvatar } from "@/components/userAvatar";

// 型定義（仮の型定義）
interface User {
  id: string;
  name: string;
  authId?: string; // SupabaseのAuthIDも含める
  avatarUrl?: string | null; // プロフィール画像のURL
}

interface Message {
  id: string;
  sender: User;
  content: string;
  createdAt: Date | string;
  replies?: Message[]; // スレッド返信一覧（オプション）
  parentMessageId?: string | null; // 親メッセージID（nullの場合は通常のメッセージ）
  // ファイル添付情報（オプション）
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
}

// MessageViewコンポーネントのprops型定義
interface MessageViewProps {
  messages: Message[]; // 表示するメッセージの配列
  myUserId: string; // 現在のユーザーID（自分のメッセージを判定するため）
  onThreadOpen?: (messageId: string) => void; // スレッドパネルを開く関数
}

export default function MessageView({ messages, myUserId, onThreadOpen }: MessageViewProps) {
  // 最下部の目印用ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ファイルプレビューモーダルの状態管理
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  // ✅ ページ表示時・メッセージ更新時に最下部を初期表示（LINE風）
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  // 自分のメッセージかどうかを判定する関数（SupabaseのAuthIDで比較）
  const isMyMessage = (message: Message) => {
    if (!myUserId || !message.sender.authId) {
      return false;
    }
    return message.sender.authId === myUserId;
  };

  // スレッド返信数を取得
  const getReplyCount = (message: Message) => {
    return message.replies?.length || 0;
  };

  /**
   * ファイルタイプが画像かどうかを判定
   */
  const isImage = (fileType: string | null | undefined) => {
    return fileType?.startsWith('image/') || false;
  };

  /**
   * ファイルタイプが動画かどうかを判定
   */
  const isVideo = (fileType: string | null | undefined) => {
    return fileType?.startsWith('video/') || false;
  };

  /**
   * ファイルサイズを人間が読みやすい形式に変換
   */
  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  /**
   * ファイルを強制的にダウンロードする処理
   * Supabase Storageなど外部URLからのダウンロードに対応
   */
  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      console.log('📥 ファイルダウンロード開始:', fileName);

      // ファイルをfetchで取得
      const response = await fetch(fileUrl);
      const blob = await response.blob();

      // Blobから一時的なURLを作成
      const url = window.URL.createObjectURL(blob);

      // 一時的な<a>要素を作成してクリック
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // クリーンアップ
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ ファイルダウンロード成功:', fileName);
    } catch (error) {
      console.error('❌ ファイルダウンロードエラー:', error);
      alert('ファイルのダウンロードに失敗しました。');
    }
  };

  /**
   * ファイル添付を表示するコンポーネント
   */
  const renderFileAttachment = (message: Message, isOwn: boolean) => {
    if (!message.fileUrl) return null;

    // 画像ファイルの場合
    if (isImage(message.fileType)) {
      return (
        <div className="mt-2">
          <div
            onClick={() =>
              setPreviewFile({
                url: message.fileUrl!,
                name: message.fileName || 'image',
                type: message.fileType || '',
              })
            }
            className="cursor-pointer"
          >
            <img
              src={message.fileUrl}
              alt={message.fileName || 'image'}
              className="max-w-full max-h-64 rounded-lg object-cover hover:opacity-90 transition-opacity"
            />
          </div>
          <p className="text-xs mt-1 opacity-70">
            {message.fileName} ({formatFileSize(message.fileSize)})
          </p>
        </div>
      );
    }

    // 動画ファイルの場合
    if (isVideo(message.fileType)) {
      return (
        <div className="mt-2">
          <video
            controls
            className="max-w-full max-h-64 rounded-lg"
            src={message.fileUrl}
          >
            お使いのブラウザは動画タグをサポートしていません。
          </video>
          <p className="text-xs mt-1 opacity-70">
            {message.fileName} ({formatFileSize(message.fileSize)})
          </p>
        </div>
      );
    }

    // その他のファイル（PDF、Officeドキュメントなど）
    return (
      <div className="mt-2">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            isOwn
              ? 'bg-blue-600 border-blue-400 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <FileText className="h-5 w-5 flex-shrink-0" />
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() =>
              setPreviewFile({
                url: message.fileUrl!,
                name: message.fileName || 'file',
                type: message.fileType || '',
              })
            }
          >
            <p className="text-sm font-medium truncate">{message.fileName}</p>
            <p className="text-xs opacity-70">{formatFileSize(message.fileSize)}</p>
          </div>
          {/* ダウンロードボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(message.fileUrl!, message.fileName || 'file');
            }}
            className={`p-2 rounded hover:bg-opacity-20 hover:bg-gray-500 transition-colors flex-shrink-0`}
            title="ダウンロード"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ファイルプレビューモーダル */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        fileUrl={previewFile?.url || ''}
        fileName={previewFile?.name || ''}
        fileType={previewFile?.type || ''}
      />

      <div ref={containerRef} className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4 py-4">
        {/* メッセージ配列をループして表示（通常のメッセージのみ） */}
        {messages
          .filter((message) => !message.parentMessageId) // スレッド返信は表示しない
          .map((message) => {
            const replyCount = getReplyCount(message);

            return (
              <div
                key={message.id}
                className={`flex items-start gap-2 md:gap-4 ${
                  isMyMessage(message) ? "justify-end" : ""
                }`}
              >
                {/* 相手のメッセージの場合のみアバターを左に表示 */}
                {!isMyMessage(message) && (
                  <UserAvatar
                    name={message.sender.name}
                    avatarUrl={message.sender.avatarUrl}
                    size="sm"
                    className="flex-shrink-0"
                  />
                )}

                {/* メッセージ本体 */}
                <div
                  className={`flex flex-col gap-1 max-w-[75%] md:max-w-md ${
                    isMyMessage(message) ? "items-end" : "items-start"
                  }`}
                >
                  {/* ヘッダー部分（名前と時刻） */}
                  <div className="flex items-center gap-2">
                    {!isMyMessage(message) && (
                      <span className="font-semibold text-foreground">
                        {message.sender.name}
                      </span>
                    )}
                    {isMyMessage(message) && (
                      <span className="font-semibold text-foreground">自分</span>
                    )}

                    <span className="text-xs text-gray-500">
                      {typeof message.createdAt === "string"
                        ? new Date(message.createdAt).toLocaleString("ja-JP")
                        : message.createdAt instanceof Date
                        ? message.createdAt.toLocaleString("ja-JP")
                        : ""}
                    </span>
                  </div>

                  {/* メッセージ内容 */}
                  <div
                    className={`px-4 py-2 rounded-lg w-fit max-w-full ${
                      isMyMessage(message)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>

                    {/* ファイル添付表示 */}
                    {renderFileAttachment(message, isMyMessage(message))}
                  </div>

                  {/* スレッド返信ボタン（常に表示） */}
                  {onThreadOpen && (
                    <button
                      onClick={() => onThreadOpen(message.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        replyCount > 0
                          ? "text-blue-600 hover:underline font-medium"
                          : "text-gray-400 hover:text-blue-600"
                      }`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>
                        {replyCount > 0 ? `${replyCount}件の返信` : "スレッドで返信"}
                      </span>
                    </button>
                  )}
                </div>

                {/* 自分のメッセージの場合のみアバターを右に表示 */}
                {isMyMessage(message) && (
                  <UserAvatar
                    name={message.sender.name}
                    avatarUrl={message.sender.avatarUrl}
                    size="sm"
                    className="flex-shrink-0"
                  />
                )}
              </div>
            );
          })}
        {/* 最下部の目印 */}
        <div ref={messagesEndRef} />
        </div>
      </div>
    </>
  );
}