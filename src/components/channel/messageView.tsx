// 基本的なスタイリングのみで実装（shadcn/ui依存を削除）

import { useLayoutEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

// 型定義（仮の型定義）
interface User {
  id: string;
  name: string;
  authId?: string; // SupabaseのAuthIDも含める
}

interface Message {
  id: string;
  sender: User;
  content: string;
  createdAt: Date | string;
  replies?: Message[]; // スレッド返信一覧（オプション）
  parentMessageId?: string | null; // 親メッセージID（nullの場合は通常のメッセージ）
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

  return (
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
                className={`flex items-start gap-4 ${
                  isMyMessage(message) ? "justify-end" : ""
                }`}
              >
                {/* 相手のメッセージの場合のみアバターを左に表示 */}
                {!isMyMessage(message) && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold">
                    {message.sender.name.charAt(0)}
                  </div>
                )}

                {/* メッセージ本体 */}
                <div
                  className={`flex flex-col gap-1 ${
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
                    className={`px-4 py-2 rounded-lg max-w-xs ${
                      isMyMessage(message)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
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
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-semibold text-white">
                    自
                  </div>
                )}
              </div>
            );
          })}
        {/* 最下部の目印 */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
