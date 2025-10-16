'use client';

// React Hooks: コンポーネントの状態管理とライフサイクル管理
import { useState, useEffect } from 'react';
// Next.js: URLパラメータ取得とページが見つからない場合の処理
import { useParams, notFound } from 'next/navigation';

// 作成したコンポーネント
import ChannelHeader from '@/components/channel/channelHeader';
import MessageView from '@/components/channel/messageView';
import MessageForm from '@/components/channel/messageForm';

// リアルタイム機能のカスタムフック
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
// 認証フック
import { useAuth } from '@/hooks/useAuth';

// 型定義
interface User {
  id: string;
  name: string;
  email?: string;
}

interface Message {
  id: string;
  sender: User;
  content: string;
  createdAt: Date | string;
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
  
  // チャンネル情報の状態管理
  const [channel, setChannel] = useState<Channel | null>(null);
  
  // 初期メッセージの状態管理（リアルタイムフックの初期値用）
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  
  // リアルタイムメッセージフック：自動的にメッセージがリアルタイム更新される
  const { messages, addMessage } = useRealtimeMessages({
    channelId,
    initialMessages
  });
  
  // 現在のユーザーID（認証されたユーザー）
  const myUserId = user?.id;

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
        
      } catch (error) {
        console.error('❌ データ取得エラー:', error);
        setInitialMessages([]);
        setChannel(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initData();
  }, [channelId, authLoading, user]); // 認証状態とchannelIdが変更された時に再実行

  // メッセージ送信処理
  const handleSendMessage = async (content: string) => {
    // 認証チェック
    if (!myUserId) {
      console.error('❌ ユーザーが認証されていません');
      alert('メッセージを送信するにはログインが必要です。');
      return;
    }

    try {
      console.log('メッセージ送信:', content, 'by user:', myUserId);
      
      // 実際のAPIにメッセージを送信
      const response = await fetch(`/api/messages/${channelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          senderId: myUserId  // 認証されたユーザーのID
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

  // データ読み込み中・認証チェック
  if (authLoading || !isInitialized || !channel || !user || !myUserId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* チャンネルヘッダー */}
      <ChannelHeader
        channelId={channelId}
        channelName={channel.name}
        channelDescription={channel.description}
        memberCount={channel.memberCount}
      />
      
      {/* メッセージ表示エリア */}
      <MessageView messages={messages} myUserId={myUserId} />
      
      {/* メッセージ入力フォーム */}
      {myUserId && (
        <MessageForm 
          channelDisplayName={`# ${channel.name}`}
          handleSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}