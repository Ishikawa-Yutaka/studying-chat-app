/**
 * AIチャットページ（セッション管理機能付き）
 *
 * ChatGPT/Claude風のUI:
 * - 左側: セッション一覧 + 新しい会話ボタン
 * - 右側: 選択されたセッションのメッセージ表示 + 入力フォーム
 *
 * 機能:
 * - 新しい会話の作成
 * - セッション一覧の表示（タイトル・メッセージ数）
 * - セッション切り替え
 * - メッセージ送信・受信
 * - タイトル自動生成（最初のメッセージから）
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Send, Bot, User, Plus, MessageSquare, Trash2, Menu, X, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * AIチャットセッションの型定義
 */
interface AiChatSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

/**
 * AIチャットメッセージの型定義
 */
interface AiChatMessage {
  id: string;
  sessionId: string;
  message: string;   // ユーザーのメッセージ
  response: string;  // AIの応答
  createdAt: string;
}

export default function AiChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // セッション管理の状態
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // メッセージ管理の状態
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // IME（日本語入力）変換中かどうかのフラグ
  const [isComposing, setIsComposing] = useState(false);

  // モバイル用サイドバー表示状態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 認証チェック
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  /**
   * 初回ロード: セッション一覧を取得
   */
  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      try {
        console.log('🔄 セッション一覧取得中...');
        const response = await fetch('/api/ai/sessions');
        const data = await response.json();

        if (data.success) {
          setSessions(data.sessions || []);
          console.log(`✅ セッション一覧取得成功: ${data.sessions.length}件`);

          // 最新のセッションを選択（あれば）
          if (data.sessions.length > 0) {
            setCurrentSessionId(data.sessions[0].id);
          }
        } else {
          console.error('❌ セッション一覧取得失敗:', data.error);
        }
      } catch (error) {
        console.error('❌ セッション一覧取得エラー:', error);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [user]);

  /**
   * セッション切り替え時: メッセージを取得
   */
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        console.log(`🔄 セッション ${currentSessionId} のメッセージ取得中...`);
        const response = await fetch(`/api/ai/sessions/${currentSessionId}`);
        const data = await response.json();

        if (data.success) {
          setMessages(data.session.messages || []);
          console.log(`✅ メッセージ取得成功: ${data.session.messages.length}件`);
        } else {
          console.error('❌ メッセージ取得失敗:', data.error);
        }
      } catch (error) {
        console.error('❌ メッセージ取得エラー:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [currentSessionId]);

  /**
   * メッセージ送信時に最下部へスクロール
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * テキストエリアの高さを自動調整
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputMessage]);

  /**
   * 新しい会話を開始
   */
  const handleNewSession = async () => {
    try {
      console.log('🔄 新しいセッション作成中...');
      const response = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        // 新しいセッションをリストに追加
        const newSession: AiChatSession = {
          ...data.session,
          messageCount: 0
        };
        setSessions([newSession, ...sessions]);

        // 新しいセッションに切り替え
        setCurrentSessionId(newSession.id);
        setMessages([]);
        console.log(`✅ 新しいセッション作成: ${newSession.id}`);
      } else {
        console.error('❌ セッション作成失敗:', data.error);
        alert('新しい会話の作成に失敗しました');
      }
    } catch (error) {
      console.error('❌ セッション作成エラー:', error);
      alert('新しい会話の作成中にエラーが発生しました');
    }
  };

  /**
   * セッション削除
   */
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // セッション選択イベントを防ぐ

    if (!confirm('この会話を削除しますか？')) return;

    try {
      console.log(`🔄 セッション ${sessionId} 削除中...`);
      const response = await fetch(`/api/ai/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // リストから削除
        const newSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(newSessions);

        // 削除したセッションが選択中だった場合
        if (currentSessionId === sessionId) {
          if (newSessions.length > 0) {
            setCurrentSessionId(newSessions[0].id);
          } else {
            setCurrentSessionId(null);
            setMessages([]);
          }
        }

        console.log(`✅ セッション削除成功: ${sessionId}`);
      } else {
        console.error('❌ セッション削除失敗:', data.error);
        alert('会話の削除に失敗しました');
      }
    } catch (error) {
      console.error('❌ セッション削除エラー:', error);
      alert('会話の削除中にエラーが発生しました');
    }
  };

  /**
   * メッセージ送信処理
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || isSending || !currentSessionId) return;

    const userMessage = inputMessage.trim();
    setInputMessage(''); // 即座に入力欄をクリア
    setIsSending(true);

    // 楽観的更新: ユーザーメッセージを即座に表示 + AIが考え中のプレースホルダー
    const tempId = `temp-${Date.now()}`;
    const tempMessage: AiChatMessage = {
      id: tempId,
      sessionId: currentSessionId,
      message: userMessage,
      response: '...', // AI応答待ちのプレースホルダー
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      console.log('🔄 AI会話リクエスト送信中...');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSessionId, // セッションIDを含める
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 仮メッセージを実際のメッセージに置き換え
        setMessages((prev) => prev.map(msg =>
          msg.id === tempId
            ? {
                id: data.chatId,
                sessionId: currentSessionId,
                message: userMessage,
                response: data.response,
                createdAt: new Date().toISOString(),
              }
            : msg
        ));
        console.log('✅ AI応答受信成功');

        // セッション一覧を更新（タイトルが変わった可能性があるため）
        const updatedResponse = await fetch('/api/ai/sessions');
        const updatedData = await updatedResponse.json();
        if (updatedData.success) {
          setSessions(updatedData.sessions || []);
        }
      } else {
        // エラー時は仮メッセージを削除
        setMessages((prev) => prev.filter(msg => msg.id !== tempId));
        console.error('❌ AI応答取得失敗:', data.error);
        alert(`${data.error}`);
      }
    } catch (error) {
      // エラー時は仮メッセージを削除
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
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

  /**
   * 短い日時フォーマット（例: 01/15 14:30）
   */
  const formatShortDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || isLoadingSessions) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={60} />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      {/* オーバーレイ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* サイドバー: セッション一覧（オーバーレイ表示） */}
      <div
        className={`
          w-80 border-r flex flex-col
          fixed inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: 'hsl(var(--background))' }}
      >
        {/* ヘッダー: 新しい会話ボタン + 閉じるボタン */}
        <div className="p-4 border-b" style={{ backgroundColor: 'hsl(var(--background))' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">会話履歴</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleNewSession}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            新しい会話
          </button>
        </div>

        {/* セッション一覧 */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4">
              <MessageSquare className="h-12 w-12 mb-2" />
              <p className="text-sm text-center">
                まだ会話がありません<br />
                新しい会話を始めましょう
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    setIsSidebarOpen(false); // セッション選択時にサイドバーを閉じる
                  }}
                  className={`group relative px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                    currentSessionId === session.id
                      ? 'bg-secondary border border-blue-200 shadow-sm'
                      : 'hover:bg-secondary/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.title || '新しい会話'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.messageCount}件 · {formatShortDateTime(session.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* チャットエリア（フル幅） */}
      <div className="flex flex-col h-full w-full" style={{ backgroundColor: 'hsl(var(--background))' }}>
        {/* ヘッダー（スマホ: sticky、PC: 通常） */}
        <div className="lg:relative sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3" style={{ backgroundColor: 'hsl(var(--background))' }}>
          {/* 戻るボタン（ワークスペースに戻る） */}
          <Link
            href="/workspace"
            className="p-2 hover:bg-accent rounded-lg transition-colors -ml-2 flex-shrink-0"
            aria-label="ワークスペースに戻る"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>

          {/* メニューボタン（会話履歴） */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
            title="会話履歴を開く"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* タイトル */}
          <div className="flex items-center gap-2 flex-1">
            <Bot className="h-5 w-5" />
            <span className="font-medium">AIアシスタント</span>
          </div>

          {/* 新しい会話ボタン（アイコンのみ） */}
          <button
            type="button"
            onClick={handleNewSession}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
            title="新しい会話を開始"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {!currentSessionId ? (
          // セッションが選択されていない場合
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Bot className="h-16 w-16 mb-4" />
            <p className="text-lg">AIアシスタント</p>
            <p className="text-sm mt-2">新しい会話を始めるか、既存の会話を選択してください</p>
            <button
              onClick={handleNewSession}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              新しい会話を始める
            </button>
          </div>
        ) : (
          <>
            {/* メッセージ表示エリア - 入力フォーム分の下部余白を確保 */}
            <div className="flex-1 overflow-y-auto pb-24 px-4 md:px-6 pt-4 space-y-6">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size={60} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Bot className="h-16 w-16 mb-4" />
                  <p className="text-lg">AIアシスタントに質問してみましょう</p>
                  <p className="text-sm mt-2">何でもお気軽にどうぞ</p>
                </div>
              ) : (
                <>
                  {/* メッセージ（古い順に表示） */}
                  {messages.map((chat) => (
                    <div key={chat.id} className="space-y-4">
                      {/* ユーザーのメッセージ（右寄せ） */}
                      <div className="flex justify-end">
                        <div className="flex items-start gap-2 max-w-[85%] md:max-w-[70%]">
                          <div className="bg-blue-500 text-white rounded-lg px-4 py-2">
                            <p className="text-sm whitespace-pre-wrap">{chat.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDateTime(chat.createdAt)}
                            </p>
                          </div>
                          <User className="h-6 w-6 flex-shrink-0 mt-1" />
                        </div>
                      </div>

                      {/* AIの応答（左寄せ） */}
                      <div className="flex justify-start">
                        <div className="flex items-start gap-2 max-w-[85%] md:max-w-[70%]">
                          <Bot className="h-6 w-6 flex-shrink-0 mt-1" />
                          <div className="bg-gray-200 text-gray-900 rounded-lg px-4 py-2">
                            {chat.response === '...' ? (
                              /* AI応答待ちのアニメーション */
                              <div className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="inline-block w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="inline-block w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">
                                {chat.response}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* メッセージ入力フォーム - 画面下部に固定（PC時はサイドバーを避ける） */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-[280px] bg-background border-t px-4 md:px-6 py-4 z-10">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    // IME変換中はEnterキーを無視（日本語入力の変換確定用）
                    // Shift+Enterは改行、通常のEnterは送信
                    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="メッセージを入力..."
                  disabled={isSending}
                  rows={1}
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden md:inline">
                    {isSending ? '送信中...' : '送信'}
                  </span>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
