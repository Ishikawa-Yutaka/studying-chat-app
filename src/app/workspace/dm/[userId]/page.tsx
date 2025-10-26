'use client';

// React Hooks
import { useState, useEffect } from 'react';
// Next.js
import { useParams, notFound } from 'next/navigation';

// 既存のコンポーネントを再利用
import MessageView from '@/components/channel/messageView';
import MessageForm from '@/components/channel/messageForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// DM専用ヘッダー
import DmHeader from '@/components/dm/dmHeader';

// リアルタイム機能のカスタムフック
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { usePresence } from '@/hooks/usePresence';
// 認証フック
import { useAuth } from '@/hooks/useAuth';

// 型定義
interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface Message {
  id: string;
  sender: User;
  content: string;
  createdAt: Date | string;
  // ファイル添付情報（オプショナル）
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
}

export default function DirectMessagePage() {
  // URLからユーザーIDを取得
  // 例: /workspace/dm/user123 → userId = "user123"
  const { userId } = useParams<{ userId: string }>();
  
  // 認証状態管理
  const { user } = useAuth();

  // 初期化状態とメッセージ管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [dmPartner, setDmPartner] = useState<User | null>(null);
  const [dmChannelId, setDmChannelId] = useState<string>('');

  // Presenceでリアルタイムオンライン状態を追跡
  const { isUserOnline } = usePresence({
    userId: user?.id || null,
    enabled: !!user,
  });
  
  // リアルタイムメッセージフック：自動的にメッセージがリアルタイム更新される
  const { messages, addMessage } = useRealtimeMessages({
    channelId: dmChannelId,
    initialMessages
  });
  
  // 現在のユーザーID（認証されたユーザー）
  const myUserId = user?.id;

  // コンポーネントがマウントされた時とuserIdが変更された時に実行
  useEffect(() => {
    // 認証が完了していない場合は実行しない
    if (!myUserId) return;

    const initData = async () => {
      try {
        console.log('DM相手のユーザーID:', userId, 'by user:', myUserId);
        
        // DMチャンネルを取得または作成
        const dmResponse = await fetch(`/api/dm/${userId}?myUserId=${myUserId}`);
        const dmData = await dmResponse.json();
        
        if (!dmResponse.ok) {
          throw new Error(dmData.error || 'DMチャンネルの取得に失敗しました');
        }
        
        if (dmData.success) {
          console.log(`✅ DMチャンネル取得成功:`, dmData.dmChannel);

          // DM相手の情報を設定（APIから取得した実データを使用）
          setDmPartner({
            ...dmData.dmChannel.partner,
            isOnline: dmData.dmChannel.partner.isOnline ?? false,
            lastSeen: dmData.dmChannel.partner.lastSeen ? new Date(dmData.dmChannel.partner.lastSeen) : undefined
          });
          
          // DMチャンネルIDを設定
          setDmChannelId(dmData.dmChannel.id);
          
          // DMメッセージを取得
          const messagesResponse = await fetch(`/api/messages/${dmData.dmChannel.id}`);
          const messagesData = await messagesResponse.json();
          
          if (messagesResponse.ok && messagesData.success) {
            console.log(`✅ DMメッセージ取得成功: ${messagesData.count}件`);
            setInitialMessages(messagesData.messages);
          } else {
            console.log('📭 DMメッセージなし、空のチャットを開始');
            setInitialMessages([]);
          }
        } else {
          throw new Error(dmData.error);
        }
        
      } catch (error) {
        console.error('❌ DM初期化エラー:', error);
        setError(error instanceof Error ? error.message : 'DMの初期化に失敗しました');
      } finally {
        setIsInitialized(true);
      }
    };

    initData();
  }, [userId, myUserId]);

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

  /**
   * DMメッセージ送信処理
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
      console.log('DMメッセージ送信:', content, 'by user:', myUserId);
      if (fileInfo) {
        console.log('📎 ファイル添付:', fileInfo.name);
      }

      if (!dmChannelId) {
        alert('DMチャンネルが初期化されていません。ページをリロードしてください。');
        return;
      }

      // 実際のAPIにDMメッセージを送信
      const response = await fetch(`/api/messages/${dmChannelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          senderId: myUserId,
          // ファイル情報（存在する場合のみ）
          fileUrl: fileInfo?.url,
          fileName: fileInfo?.name,
          fileType: fileInfo?.type,
          fileSize: fileInfo?.size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'DMメッセージの送信に失敗しました');
      }

      if (data.success) {
        console.log('✅ DMメッセージ送信成功:', data.message);

        // 楽観的更新：送信成功時、メッセージリストに新しいメッセージを即座に追加
        // リアルタイム機能により、他のユーザーの画面にも自動的に表示される
        addMessage(data.message);
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('❌ DMメッセージの送信に失敗しました:', error);
      alert('メッセージの送信に失敗しました。もう一度お試しください。');
    }
  };

  // データ読み込み中・認証チェック
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
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
          <h2 className="text-2xl font-bold text-foreground">エラー</h2>
          <p className="text-muted-foreground">{error}</p>
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

  // ユーザーが見つからない場合
  if (!dmPartner || !user || !myUserId) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size={60} />
      </div>
    );
  }

  // Presenceからリアルタイムオンライン状態を取得
  // DM相手のauthIdを使ってオンライン状態を確認
  const isPartnerOnlineNow = userId ? isUserOnline(userId) : false;

  // dmPartnerにリアルタイムオンライン状態を反映
  const dmPartnerWithPresence = {
    ...dmPartner,
    isOnline: isPartnerOnlineNow,
  };

  return (
    <div className="flex flex-col h-full">
      {/* DM専用ヘッダー（リアルタイムオンライン状態を反映） */}
      <DmHeader dmPartner={dmPartnerWithPresence} />
      
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