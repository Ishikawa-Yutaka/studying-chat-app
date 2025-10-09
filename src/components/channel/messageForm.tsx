'use client';

// React Hooks
import { useState } from 'react';
// アイコン（Lucide React）
import { Send } from 'lucide-react';
// shadcn/ui コンポーネント
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// MessageFormコンポーネントのprops型定義
interface MessageFormProps {
  channelDisplayName: string;                    // チャンネル表示名
  handleSendMessage: (content: string) => void;  // メッセージ送信関数
}

export default function MessageForm({
  channelDisplayName,
  handleSendMessage,
}: MessageFormProps) {
  // メッセージ入力内容の状態管理
  const [content, setContent] = useState<string>('');

  // フォーム送信処理
  const handleSubmit = (e: React.FormEvent) => {
    // ブラウザのデフォルトのフォーム送信を防ぐ
    e.preventDefault();
    
    // 空白のみのメッセージは送信しない
    if (!content.trim()) return;
    
    // 親コンポーネントから渡された送信関数を呼び出し
    handleSendMessage(content);
    
    // 入力フィールドをクリア
    setContent('');
  };

  return (
    <footer className="border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-4">
        {/* メッセージ入力フィールド */}
        <Input
          placeholder={`${channelDisplayName}にメッセージを送信`}
          className="flex-1"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
        {/* 送信ボタン */}
        <Button 
          type="submit" 
          size="icon" 
          disabled={!content.trim()}  // 内容が空の場合は無効化
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">送信</span>  {/* スクリーンリーダー用のテキスト */}
        </Button>
      </form>
    </footer>
  );
}