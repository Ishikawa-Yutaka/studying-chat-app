'use client';

// React Hooks: コンポーネントの状態管理とライフサイクル管理
import { useState, useEffect } from 'react';
// Next.js: URLパラメータ取得とページが見つからない場合の処理
import { useParams, notFound } from 'next/navigation';

// 作成したコンポーネント
import ChannelHeader from '@/components/channel/channelHeader';
import MessageView from '@/components/channel/messageView';
import MessageForm from '@/components/channel/messageForm';

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
  
  // 初期化状態を管理（データ読み込み完了を示す）
  const [isInitialized, setIsInitialized] = useState(false);
  
  // メッセージとチャンネル情報の状態管理
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  
  // 現在のユーザーID（テストデータの田中太郎のID、後で認証機能と連携）
  const myUserId = "cmglkz5uq0000j0x2kxp1oy71";

  // コンポーネントがマウントされた時とchannelIdが変更された時に実行
  useEffect(() => {
    const initData = async () => {
      try {
        console.log('チャンネルID:', channelId, 'の情報を取得中...');
        
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
          setMessages(messagesData.messages);
        } else {
          console.log('📭 メッセージなし、空のチャットを開始');
          setMessages([]);
        }
        
      } catch (error) {
        console.error('❌ データ取得エラー:', error);
        setMessages([]);
        setChannel(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initData();
  }, [channelId]); // channelIdが変更された時に再実行

  // メッセージ送信処理
  const handleSendMessage = async (content: string) => {
    try {
      console.log('メッセージ送信:', content);
      
      // 実際のAPIにメッセージを送信
      const response = await fetch(`/api/messages/${channelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          senderId: myUserId  // 現在は仮のユーザーID、後で実際の認証と連携
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'メッセージの送信に失敗しました');
      }
      
      if (data.success) {
        console.log('✅ メッセージ送信成功:', data.message);
        
        // 送信成功時、メッセージリストに新しいメッセージを追加
        setMessages(prevMessages => [...prevMessages, data.message]);
      } else {
        throw new Error(data.error);
      }
      
    } catch (error) {
      console.error('❌ メッセージの送信に失敗しました:', error);
      alert('メッセージの送信に失敗しました。もう一度お試しください。');
    }
  };

  // データ読み込み中の表示
  if (!isInitialized || !channel) {
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
        channelName={channel.name}
        channelDescription={channel.description}
        memberCount={channel.memberCount}
      />
      
      {/* メッセージ表示エリア */}
      <MessageView messages={messages} myUserId={myUserId} />
      
      {/* メッセージ入力フォーム */}
      <MessageForm 
        channelDisplayName={`# ${channel.name}`}
        handleSendMessage={handleSendMessage}
      />
    </div>
  );
}