/**
 * スレッドパネルコンポーネント
 *
 * 機能:
 * - 親メッセージとスレッド返信一覧を表示
 * - スレッド内でメッセージを送信
 * - Slackのようなスレッド表示UI
 */

'use client';

import { useState, useLayoutEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';

// 型定義
interface User {
  id: string;
  name: string;
  authId?: string;
}

interface Message {
  id: string;
  sender: User;
  content: string;
  createdAt: Date | string;
  replies?: Message[];
  parentMessageId?: string | null;
}

interface ThreadPanelProps {
  isOpen: boolean;                    // パネルの表示状態
  onClose: () => void;                // パネルを閉じる関数
  parentMessage: Message | null;      // 親メッセージ
  replies: Message[];                 // スレッド返信一覧
  myUserId: string;                   // 現在のユーザーID
  onSendReply: (content: string) => Promise<void>; // スレッド返信送信関数
}

export default function ThreadPanel({
  isOpen,
  onClose,
  parentMessage,
  replies,
  myUserId,
  onSendReply
}: ThreadPanelProps) {
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // メッセージが追加されたら最下部にスクロール
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [replies.length]);

  // 自分のメッセージかどうかを判定
  const isMyMessage = (message: Message) => {
    if (!myUserId || !message.sender.authId) {
      return false;
    }
    return message.sender.authId === myUserId;
  };

  // スレッド返信を送信
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim() || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await onSendReply(replyContent);
      setReplyContent(''); // 送信成功したら入力欄をクリア
    } catch (error) {
      console.error('❌ スレッド返信送信エラー:', error);
    } finally {
      setIsSending(false);
    }
  };

  // パネルが閉じている場合は何も表示しない
  if (!isOpen || !parentMessage) {
    return null;
  }

  return (
    <>
      {/* 背景のオーバーレイ（モバイル時のみ表示） */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* スレッドパネル */}
      <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-white border-l shadow-lg z-50 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <h2 className="font-semibold text-gray-900">スレッド</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-900"
            aria-label="スレッドを閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* スレッド内容表示エリア */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 bg-white">
          <div className="space-y-4">
            {/* 親メッセージ */}
            <div className="pb-4 border-b">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold">
                  {parentMessage.sender.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {parentMessage.sender.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {typeof parentMessage.createdAt === "string"
                        ? new Date(parentMessage.createdAt).toLocaleString("ja-JP")
                        : parentMessage.createdAt instanceof Date
                        ? parentMessage.createdAt.toLocaleString("ja-JP")
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{parentMessage.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {replies.length}件の返信
                  </p>
                </div>
              </div>
            </div>

            {/* スレッド返信一覧 */}
            {replies.map((reply) => (
              <div key={reply.id} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold">
                  {reply.sender.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-900">
                      {isMyMessage(reply) ? '自分' : reply.sender.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {typeof reply.createdAt === "string"
                        ? new Date(reply.createdAt).toLocaleString("ja-JP")
                        : reply.createdAt instanceof Date
                        ? reply.createdAt.toLocaleString("ja-JP")
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{reply.content}</p>
                </div>
              </div>
            ))}

            {/* 最下部の目印 */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* メッセージ入力フォーム */}
        <div className="border-t p-4 bg-white">
          <form onSubmit={handleSendReply} className="flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="スレッドに返信..."
              disabled={isSending}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!replyContent.trim() || isSending}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSending ? '送信中...' : '送信'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
