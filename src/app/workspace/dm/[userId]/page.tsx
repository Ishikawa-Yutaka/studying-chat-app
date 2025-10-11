'use client';

// React Hooks
import { useState, useEffect } from 'react';
// Next.js
import { useParams, notFound } from 'next/navigation';

// 既存のコンポーネントを再利用
import MessageView from '@/components/channel/messageView';
import MessageForm from '@/components/channel/messageForm';

// DM専用ヘッダー
import DmHeader from '@/components/dm/dmHeader';

// 型定義
interface User {
  id: string;
  name: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface Message {
  id: string;
  sender: User;
  content: string;
  createdAt: Date | string;
}

export default function DirectMessagePage() {
  // URLからユーザーIDを取得
  // 例: /workspace/dm/user123 → userId = "user123"
  const { userId } = useParams<{ userId: string }>();
  
  // 初期化状態とメッセージ管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dmPartner, setDmPartner] = useState<User | null>(null);
  
  // 現在のユーザーID（仮の値、後で認証機能と連携）
  const myUserId = "user1";
  const myUser: User = {
    id: myUserId,
    name: "私",
    isOnline: true
  };

  // コンポーネントがマウントされた時とuserIdが変更された時に実行
  useEffect(() => {
    const initData = async () => {
      console.log('DM相手のユーザーID:', userId);
      
      // DM相手のユーザー情報を取得（仮データ）
      const partnerData: User = {
        id: userId,
        name: getUserNameById(userId),
        email: `${userId}@example.com`,
        isOnline: Math.random() > 0.5, // ランダムでオンライン状態を決定
        lastSeen: new Date(Date.now() - Math.random() * 3600000) // 1時間以内のランダムな時間
      };
      
      setDmPartner(partnerData);
      
      // DM履歴を取得（仮データ）
      const dummyDmMessages: Message[] = [
        {
          id: "dm1",
          sender: partnerData,
          content: "こんにちは！元気ですか？",
          createdAt: new Date('2024-01-01 14:00:00')
        },
        {
          id: "dm2",
          sender: myUser,
          content: "こんにちは！元気ですよ。お疲れ様です！",
          createdAt: new Date('2024-01-01 14:01:00')
        },
        {
          id: "dm3",
          sender: partnerData,
          content: "今日の会議の件、確認できましたか？",
          createdAt: new Date('2024-01-01 14:02:00')
        },
        {
          id: "dm4",
          sender: myUser,
          content: "はい、確認しました。問題ありません！",
          createdAt: new Date('2024-01-01 14:03:00')
        }
      ];
      
      setMessages(dummyDmMessages);
      setIsInitialized(true);
    };

    initData();
  }, [userId]);

  // ユーザーIDから名前を取得する関数（仮実装）
  function getUserNameById(id: string): string {
    const userNames: { [key: string]: string } = {
      'user2': '田中さん',
      'user3': '佐藤さん',
      'user4': '鈴木さん',
      'user5': '高橋さん',
    };
    return userNames[id] || `ユーザー${id}`;
  }

  // DMメッセージ送信処理
  const handleSendMessage = async (content: string) => {
    try {
      console.log('DMメッセージ送信:', content);
      
      // 新しいDMメッセージを作成
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: myUser,
        content,
        createdAt: new Date()
      };
      
      // メッセージを追加
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
    } catch (error) {
      console.error('DMメッセージの送信に失敗しました:', error);
    }
  };

  // データ読み込み中の表示
  if (!isInitialized || !dmPartner) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>読み込み中...</p>
      </div>
    );
  }

  // ユーザーが見つからない場合
  if (!dmPartner) {
    return notFound();
  }

  return (
    <div className="flex flex-col h-full">
      {/* DM専用ヘッダー */}
      <DmHeader dmPartner={dmPartner} />
      
      {/* メッセージ表示エリア（チャンネルと同じコンポーネントを再利用） */}
      <MessageView messages={messages} myUserId={myUserId} />
      
      {/* メッセージ入力フォーム（チャンネルと同じコンポーネントを再利用） */}
      <MessageForm 
        channelDisplayName={`${dmPartner.name}さん`}
        handleSendMessage={handleSendMessage}
      />
    </div>
  );
}