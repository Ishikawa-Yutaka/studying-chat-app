'use client';

// アイコン
import { Phone, Video } from 'lucide-react';

// shadcn/ui
import { Button } from '@/components/ui/button';

// DM相手のユーザー情報型
interface User {
  id: string;
  name: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

// DmHeaderコンポーネントのprops型定義
interface DmHeaderProps {
  dmPartner: User;  // DM相手のユーザー情報
}

export default function DmHeader({ dmPartner }: DmHeaderProps) {
  // 最終ログイン時間の表示フォーマット
  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return '';
    
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 5) return '数分前';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return lastSeen.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 将来実装予定の機能（現在は仮実装）
  const handleVoiceCall = () => {
    alert('🎤 音声通話機能は今後実装予定です\n\nWebRTC APIを使用してリアルタイム音声通話を実現予定');
  };

  const handleVideoCall = () => {
    alert('📹 ビデオ通話機能は今後実装予定です\n\nWebRTC APIを使用してリアルタイムビデオ通話を実現予定');
  };

  return (
    <>
      <header className="border-b bg-background">
        <div className="h-16 flex items-center justify-between px-4">
          {/* 左側: ユーザー情報 */}
          <div className="flex items-center gap-3">
            {/* ユーザーアバター */}
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                {dmPartner.name.charAt(0)}
              </div>
              {/* オンライン状態インジケーター */}
              {dmPartner.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            {/* ユーザー詳細情報 */}
            <div className="flex flex-col">
              <h1 className="font-semibold text-lg">{dmPartner.name}</h1>
              <div className="flex items-center gap-2 text-sm">
                {/* オンライン状態 */}
                <div className={`w-2 h-2 rounded-full ${
                  dmPartner.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-gray-600">
                  {dmPartner.isOnline
                    ? 'オンライン'
                    : `最終ログイン: ${formatLastSeen(dmPartner.lastSeen)}`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* 右側: アクションボタン（将来機能） */}
          <div className="flex items-center gap-2">
            {/* 音声通話ボタン */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100"
              title="音声通話（今後実装予定）"
              onClick={handleVoiceCall}
            >
              <Phone className="h-5 w-5" />
            </Button>

            {/* ビデオ通話ボタン */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100"
              title="ビデオ通話（今後実装予定）"
              onClick={handleVideoCall}
            >
              <Video className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}