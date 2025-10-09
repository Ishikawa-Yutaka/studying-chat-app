'use client';

// React Hooks: コンポーネントの状態管理とライフサイクル管理
import { useState, useEffect } from 'react';
// Next.js: URLパラメータ取得とページが見つからない場合の処理
import { useParams, notFound } from 'next/navigation';

// 作成したコンポーネント
import ChannelHeader from '@/components/channel/channelHeader';
import MessageView from '@/components/channel/messageView';
import MessageForm from '@/components/channel/messageForm';

// 型定義（仮の型定義）
interface User {
  id: string;
  name: string;
}

interface Message {
  id: string;
  sender: User;
  content: string;
  createdAt: Date | string;
}

export default function ChannelPage() {
  // URLからチャンネルIDを取得
  // 例: /workspace/channel/123 → channelId = "123"
  const { channelId } = useParams<{ channelId: string }>();
  
  // 初期化状態を管理（データ読み込み完了を示す）
  const [isInitialized, setIsInitialized] = useState(false);
  
  // メッセージの状態管理（後でデータベースから取得する予定）
  const [messages, setMessages] = useState<Message[]>([]);
  
  // 現在のユーザーID（仮の値、後で認証機能と連携）
  const myUserId = "user1";

  // コンポーネントがマウントされた時とchannelIdが変更された時に実行
  useEffect(() => {
    const initData = async () => {
      // TODO: ここでメッセージデータを取得
      console.log('チャンネルID:', channelId);
      
      // 仮のメッセージデータ
      const dummyMessages: Message[] = [
        {
          id: "1",
          sender: { id: "user2", name: "田中さん" },
          content: "こんにちは！",
          createdAt: new Date('2024-01-01 10:00:00')
        },
        {
          id: "2",
          sender: { id: "user1", name: "私" },
          content: "おはようございます！",
          createdAt: new Date('2024-01-01 10:01:00')
        },
        {
          id: "3",
          sender: { id: "user2", name: "田中さん" },
          content: "今日はいい天気ですね",
          createdAt: new Date('2024-01-01 10:02:00')
        }
      ];
      
      setMessages(dummyMessages);
      setIsInitialized(true);
    };

    initData();
  }, [channelId]); // channelIdが変更された時に再実行

  // メッセージ送信処理
  const handleSendMessage = async (content: string) => {
    try {
      console.log('メッセージ送信:', content);
      
      // 新しいメッセージを作成（仮の実装）
      const newMessage: Message = {
        id: Date.now().toString(), // 仮のID
        sender: { id: myUserId, name: "私" },
        content,
        createdAt: new Date()
      };
      
      // メッセージを追加
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
    } catch (error) {
      console.error('メッセージの送信に失敗しました:', error);
    }
  };

  // データ読み込み中の表示
  if (!isInitialized) {
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
        channelName={`チャンネル-${channelId}`}
        channelDescription="サンプルチャンネルです"
        memberCount={5}
      />
      
      {/* メッセージ表示エリア */}
      <MessageView messages={messages} myUserId={myUserId} />
      
      {/* メッセージ入力フォーム */}
      <MessageForm 
        channelDisplayName={`# チャンネル-${channelId}`}
        handleSendMessage={handleSendMessage}
      />
    </div>
  );
}