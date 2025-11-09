'use client';

// React Hooks: コンポーネントの状態管理とライフサイクル管理
import { useState, useEffect, useRef } from 'react';
// Next.js: URLパラメータ取得とページが見つからない場合の処理
import { useParams, notFound } from 'next/navigation';

// 作成したコンポーネント
import ChannelHeader from '@/components/channel/channelHeader';
import MessageView from '@/components/channel/messageView';
import MessageForm from '@/components/channel/messageForm';
import ThreadPanel from '@/components/channel/threadPanel';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// リアルタイム機能のカスタムフック
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useRealtimeThreadReplies } from '@/hooks/useRealtimeThreadReplies';
import { usePresenceContext } from '@/contexts/PresenceContext';
// 認証フック
import { useAuth } from '@/hooks/useAuth';

// 型定義
interface User {
  id: string;
  name: string;
  email?: string;
  authId?: string;
  avatarUrl?: string | null;  // アバター画像のURL
}

interface Message {
  id: string;
  sender: User | null; // アカウント削除済みの場合はnull
  content: string;
  createdAt: Date | string;
  replies?: Message[];
  parentMessageId?: string | null;
  // ファイル添付情報（オプショナル）
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: string;
  memberCount: number;
  members: User[];
}

export default function ChannelPage() {
  // URLからチャンネルIDを取得
  // 例: /workspace/channel/123 → channelId = "123"
  const { channelId } = useParams<{ channelId: string }>();
  
  // 認証状態管理
  const { user, loading: authLoading } = useAuth();
  
  // 初期化状態を管理（データ読み込み完了を示す）
  const [isInitialized, setIsInitialized] = useState(false);

  // エラー状態を管理
  const [error, setError] = useState<string | null>(null);

  // チャンネル情報の状態管理
  const [channel, setChannel] = useState<Channel | null>(null);

  // 初期メッセージの状態管理（リアルタイムフックの初期値用）
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);

  // Realtimeサブスクリプション用のチャンネルID状態管理
  // データ取得完了後に設定することで、Realtimeサブスクリプションを適切にセットアップ
  const [realtimeChannelId, setRealtimeChannelId] = useState<string>('');

  // リアルタイムメッセージフック：自動的にメッセージがリアルタイム更新される
  const { messages, addMessage } = useRealtimeMessages({
    channelId: realtimeChannelId,
    initialMessages
  });

  // PresenceContextからオンライン状態取得
  const { isUserOnline } = usePresenceContext();

  // メッセージにオンライン状態を追加
  const messagesWithOnlineStatus = messages.map(msg => ({
    ...msg,
    sender: msg.sender ? {
      ...msg.sender,
      isOnline: msg.sender.authId ? isUserOnline(msg.sender.authId) : false
    } : null
  }));

  // 現在のユーザーID（認証されたユーザー）
  const myUserId = user?.id;

  // スレッドパネルの状態管理
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [currentThreadParent, setCurrentThreadParent] = useState<Message | null>(null);
  const [initialThreadReplies, setInitialThreadReplies] = useState<Message[]>([]); // 初期スレッド返信
  const [isThreadLoading, setIsThreadLoading] = useState(false); // スレッド読み込み状態

  // スレッド返信のリアルタイム更新フック
  const { replies: threadReplies, addReply: addThreadReply } = useRealtimeThreadReplies({
    parentMessageId: currentThreadParent?.id || null,
    initialReplies: initialThreadReplies
  });

  // 最新メッセージへの自動スクロール用ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 認証が完了してからデータ取得を開始するuseEffect
  useEffect(() => {
    // 認証が完了していない場合は何もしない
    if (authLoading || !user) {
      console.log('⏳ 認証完了待ち...', { authLoading, hasUser: !!user });
      return;
    }

    const initData = async () => {
      try {
        console.log('📊 チャンネルデータ取得開始 - チャンネルID:', channelId, 'ユーザー:', user.email);
        
        // チャンネル情報とメッセージを並列で取得
        const [channelResponse, messagesResponse] = await Promise.all([
          fetch(`/api/channel/${channelId}`),
          fetch(`/api/messages/${channelId}`)
        ]);
        
        // チャンネル情報の処理
        const channelData = await channelResponse.json();
        if (channelResponse.ok && channelData.success) {
          console.log(`✅ チャンネル情報取得成功: ${channelData.channel.name}`);
          setChannel(channelData.channel);
        } else {
          throw new Error(channelData.error || 'チャンネル情報の取得に失敗しました');
        }

        // メッセージの処理
        const messagesData = await messagesResponse.json();
        if (messagesResponse.ok && messagesData.success) {
          console.log(`✅ メッセージ取得成功: ${messagesData.count}件`);
          setInitialMessages(messagesData.messages);
        } else {
          console.log('📭 メッセージなし、空のチャットを開始');
          setInitialMessages([]);
        }

        // データ取得完了後にRealtimeチャンネルIDを設定
        // これによりRealtimeサブスクリプションが適切にセットアップされる
        console.log('🔄 Realtimeサブスクリプション開始: channelId =', channelId);
        setRealtimeChannelId(channelId);

      } catch (error) {
        console.error('❌ データ取得エラー:', error);
        setError(error instanceof Error ? error.message : 'チャンネル情報の取得に失敗しました');
        setInitialMessages([]);
        setChannel(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initData();
  }, [channelId, authLoading, user]); // 認証状態とchannelIdが変更された時に再実行

  // メッセージが変更されたら最新メッセージまで瞬時にジャンプ（内部リンクのように）
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages]);

  /**
   * メッセージ送信処理
   * テキストメッセージとファイル情報をAPIに送信する
   *
   * @param content - メッセージ内容
   * @param fileInfo - ファイル情報（オプショナル）
   */
  const handleSendMessage = async (
    content: string,
    fileInfo?: { url: string; name: string; type: string; size: number }
  ) => {
    // 認証チェック
    if (!myUserId) {
      console.error('❌ ユーザーが認証されていません');
      alert('メッセージを送信するにはログインが必要です。');
      return;
    }

    try {
      console.log('メッセージ送信:', content, 'by user:', myUserId);
      if (fileInfo) {
        console.log('📎 ファイル添付:', fileInfo.name);
      }

      // 実際のAPIにメッセージを送信
      const response = await fetch(`/api/messages/${channelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          senderId: myUserId,  // 認証されたユーザーのID
          // ファイル情報（存在する場合のみ）
          fileUrl: fileInfo?.url,
          fileName: fileInfo?.name,
          fileType: fileInfo?.type,
          fileSize: fileInfo?.size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'メッセージの送信に失敗しました');
      }

      if (data.success) {
        console.log('✅ メッセージ送信成功:', data.message);

        // 楽観的更新：送信成功時、メッセージリストに新しいメッセージを即座に追加
        // リアルタイム機能により、他のユーザーの画面にも自動的に表示される
        addMessage(data.message);
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('❌ メッセージの送信に失敗しました:', error);
      alert('メッセージの送信に失敗しました。もう一度お試しください。');
    }
  };

  // スレッドパネルを開く処理
  const handleThreadOpen = async (messageId: string) => {
    try {
      console.log('🔄 スレッド取得開始 - メッセージID:', messageId);

      // ローディング状態を開始
      setIsThreadLoading(true);
      setIsThreadOpen(true); // パネルを開く（ローディング表示用）

      // スレッド情報を取得
      const response = await fetch(`/api/threads/${messageId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'スレッドの取得に失敗しました');
      }

      console.log('✅ スレッド取得成功:', data.replies.length, '件の返信');

      setCurrentThreadParent(data.parentMessage);
      setInitialThreadReplies(data.replies); // リアルタイムフックの初期値を設定

    } catch (error) {
      console.error('❌ スレッドの取得に失敗しました:', error);
      alert('スレッドの取得に失敗しました。もう一度お試しください。');
      setIsThreadOpen(false); // エラー時はパネルを閉じる
    } finally {
      setIsThreadLoading(false); // ローディング終了
    }
  };

  // スレッドパネルを閉じる処理
  const handleThreadClose = () => {
    setIsThreadOpen(false);
    setCurrentThreadParent(null);
    setInitialThreadReplies([]); // 初期スレッド返信をクリア
  };

  // スレッド返信送信処理
  const handleSendReply = async (content: string) => {
    if (!myUserId || !currentThreadParent) {
      console.error('❌ ユーザーまたは親メッセージが存在しません');
      return;
    }

    try {
      console.log('🔄 スレッド返信送信:', content);

      const response = await fetch(`/api/threads/${currentThreadParent.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          senderAuthId: myUserId
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'スレッド返信の送信に失敗しました');
      }

      console.log('✅ スレッド返信送信成功:', data.message);

      // 楽観的更新：リアルタイムフックを使って即座に画面更新
      addThreadReply(data.message);

    } catch (error) {
      console.error('❌ スレッド返信の送信に失敗しました:', error);
      throw error; // ThreadPanelでエラーハンドリング
    }
  };

  // データ読み込み中・認証チェック
  if (authLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={60} />
      </div>
    );
  }

  // エラーが発生した場合の表示
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-red-600 text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground">アクセスエラー</h2>
          <p className="text-muted-foreground">{error}</p>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              このチャンネルにアクセスする権限がない可能性があります。
            </p>
            <p className="text-sm text-muted-foreground">
              チャンネルに参加するには、ダッシュボードから「チャンネルを探す」をご利用ください。
            </p>
          </div>
          <div className="pt-4">
            <a
              href="/workspace"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ダッシュボードに戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  // チャンネル情報がない場合
  if (!channel || !user || !myUserId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={60} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* チャンネルヘッダー */}
      <ChannelHeader
        channelName={channel.name}
        channelDescription={channel.description}
        memberCount={channel.memberCount}
      />

      {/* メッセージ表示エリア - 入力フォーム分の下部余白を確保 */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 md:px-6 pt-4">
        <MessageView
          messages={messagesWithOnlineStatus}
          myUserId={myUserId}
          onThreadOpen={handleThreadOpen}
        />
        {/* 最新メッセージへの自動スクロール用の要素 */}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力フォーム - 画面下部に固定（PC時はサイドバーを避ける） */}
      {myUserId && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[280px] bg-background border-t px-4 md:px-6 py-4 z-10" style={{ backgroundColor: 'hsl(var(--background))' }}>
          <MessageForm
            channelDisplayName={`# ${channel.name}`}
            handleSendMessage={handleSendMessage}
          />
        </div>
      )}

      {/* スレッドパネル */}
      <ThreadPanel
        isOpen={isThreadOpen}
        onClose={handleThreadClose}
        parentMessage={currentThreadParent}
        replies={threadReplies}
        myUserId={myUserId || ''}
        onSendReply={handleSendReply}
        isLoading={isThreadLoading}
      />
    </div>
  );
}