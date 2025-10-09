// 基本的なスタイリングのみで実装（shadcn/ui依存を削除）

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

// MessageViewコンポーネントのprops型定義
interface MessageViewProps {
  messages: Message[];  // 表示するメッセージの配列
  myUserId: string;     // 現在のユーザーID（自分のメッセージを判定するため）
}

export default function MessageView({ messages, myUserId }: MessageViewProps) {
  // 自分のメッセージかどうかを判定する関数
  const isMyMessage = (message: Message) => message.sender.id === myUserId;

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-4 py-4">
        {/* メッセージ配列をループして表示 */}
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex items-start gap-4 ${
              isMyMessage(message) ? 'justify-end' : ''
            }`}
          >
            {/* 相手のメッセージの場合のみアバターを左に表示 */}
            {!isMyMessage(message) && (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold">
                {message.sender.name.charAt(0)}
              </div>
            )}

            {/* メッセージ本体 */}
            <div className="grid gap-1">
              {/* ヘッダー部分（名前と時刻） */}
              <div className={`flex items-center gap-2 ${
                isMyMessage(message) ? 'justify-end' : ''
              }`}>
                {/* 相手のメッセージの場合は名前を左に表示 */}
                {!isMyMessage(message) && (
                  <span className="font-semibold">{message.sender.name}</span>
                )}
                
                {/* 時刻表示 */}
                <span className="text-xs text-gray-500">
                  {typeof message.createdAt === 'string'
                    ? new Date(message.createdAt).toLocaleString('ja-JP')
                    : message.createdAt instanceof Date
                    ? message.createdAt.toLocaleString('ja-JP')
                    : ''}
                </span>
                
                {/* 自分のメッセージの場合は名前を右に表示 */}
                {isMyMessage(message) && (
                  <span className="font-semibold">自分</span>
                )}
              </div>
              
              {/* メッセージ内容 */}
              <div
                className={`px-4 py-2 rounded-lg max-w-xs ${
                  isMyMessage(message) 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : 'bg-gray-200'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>

            {/* 自分のメッセージの場合のみアバターを右に表示 */}
            {isMyMessage(message) && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-semibold text-white">
                自
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}