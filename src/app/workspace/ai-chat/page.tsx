/**
 * AIチャットページ
 *
 * このページでは、ユーザーがAIアシスタントと会話できます。
 *
 * 機能:
 * - メッセージ送信・受信
 * - 会話履歴の表示
 * - リアルタイム応答
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Send, Bot, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * AIチャットメッセージの型定義
 */
interface AiChatMessage {
  id: string;
  message: string;   // ユーザーのメッセージ
  response: string;  // AIの応答
  createdAt: string;
}

export default function AiChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 認証チェック
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  /**
   * 会話履歴を取得する
   */
  useEffect(() => {
    if (!user) return;

    const fetchChatHistory = async () => {
      try {
        console.log('🔄 AI会話履歴を取得中...');
        const response = await fetch('/api/ai/chat');
        const data = await response.json();

        if (data.success) {
          setMessages(data.chatHistory || []);
          console.log(`✅ 会話履歴取得成功: ${data.count}件`);
        } else {
          console.error('❌ 会話履歴取得失敗:', data.error);
        }
      } catch (error) {
        console.error('❌ 会話履歴取得エラー:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchChatHistory();
  }, [user]);

  /**
   * メッセージ送信時に最下部へスクロール
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * メッセージ送信処理
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage(''); // 即座に入力欄をクリア
    setIsSending(true);

    try {
      console.log('🔄 AI会話リクエスト送信中...');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      console.log('📡 レスポンスステータス:', response.status);
      const data = await response.json();
      console.log('📦 レスポンスデータ:', data);

      if (data.success) {
        // 新しい会話を履歴に追加
        const newChat: AiChatMessage = {
          id: data.chatId,
          message: userMessage,
          response: data.response,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [newChat, ...prev]); // 新しいメッセージを先頭に追加（新しい順）
        console.log('✅ AI応答受信成功');
      } else {
        console.error('❌ AI応答取得失敗:', data.error);
        console.error('詳細:', data.details);
        alert(`${data.error}\n詳細: ${data.details || '不明'}`);
      }
    } catch (error) {
      console.error('❌ AI会話エラー:', error);
      alert('AIとの会話中にエラーが発生しました');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * 日時フォーマット（例: 2025/01/15 14:30）
   */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white">
        <Bot className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">AIアシスタント</h1>
          <p className="text-sm text-gray-500">
            質問や相談に答えます
          </p>
        </div>
      </div>

      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bot className="h-16 w-16 mb-4" />
            <p className="text-lg">AIアシスタントに質問してみましょう</p>
            <p className="text-sm mt-2">何でもお気軽にどうぞ</p>
          </div>
        ) : (
          <>
            {/* 新しいメッセージが上に来る（descの順番で取得しているため） */}
            {messages.map((chat) => (
              <div key={chat.id} className="space-y-4">
                {/* ユーザーのメッセージ（右寄せ） */}
                <div className="flex justify-end">
                  <div className="flex items-start gap-2 max-w-[70%]">
                    <div className="bg-blue-600 text-white rounded-lg px-4 py-2 shadow">
                      <p className="text-sm whitespace-pre-wrap">{chat.message}</p>
                      <p className="text-xs text-blue-100 mt-1">
                        {formatDateTime(chat.createdAt)}
                      </p>
                    </div>
                    <User className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                  </div>
                </div>

                {/* AIの応答（左寄せ） */}
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[70%]">
                    <Bot className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {chat.response}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力フォーム */}
      <div className="border-t bg-white px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="メッセージを入力..."
            disabled={isSending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? '送信中...' : '送信'}
          </button>
        </form>
      </div>
    </div>
  );
}
