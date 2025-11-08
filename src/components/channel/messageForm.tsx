'use client';

// React Hooks
import { useState, useRef, useEffect } from 'react';
// アイコン（Lucide React）
import { Send, Paperclip, X } from 'lucide-react';
// shadcn/ui コンポーネント
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// バリデーション
import { fileSchema, allowedFileTypes } from '@/lib/validations';

// ファイル情報の型定義
interface FileInfo {
  url: string;      // アップロードされたファイルのURL
  name: string;     // ファイル名
  type: string;     // MIMEタイプ
  size: number;     // ファイルサイズ（バイト）
}

// MessageFormコンポーネントのprops型定義
interface MessageFormProps {
  channelDisplayName: string;                                      // チャンネル表示名
  handleSendMessage: (content: string, fileInfo?: FileInfo) => void;  // メッセージ送信関数（ファイル情報オプショナル）
}

export default function MessageForm({
  channelDisplayName,
  handleSendMessage,
}: MessageFormProps) {
  // メッセージ入力内容の状態管理
  const [content, setContent] = useState<string>('');

  // 選択されたファイルの状態管理
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // アップロード中の状態管理
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // ファイル入力要素への参照
  const fileInputRef = useRef<HTMLInputElement>(null);

  // テキストエリアへの参照
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 最大文字数
  const MAX_MESSAGE_LENGTH = 5000;

  /**
   * テキストエリアの高さを自動調整
   * 入力内容に応じて高さを動的に変更
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 一旦高さをリセットして、scrollHeightを正確に取得
      textarea.style.height = 'auto';
      // scrollHeightに基づいて高さを設定（max-h-[120px]の範囲内）
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [content]);

  /**
   * ファイル選択時の処理
   * ユーザーがファイルを選択した時に呼ばれる
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Zodバリデーション
      const validation = fileSchema.safeParse({
        type: file.type,
        size: file.size,
        name: file.name,
      });

      if (!validation.success) {
        // バリデーションエラー時、最初のエラーメッセージを表示
        const errorMessage = validation.error.issues[0]?.message || 'ファイルが無効です';
        alert(errorMessage);
        return;
      }

      console.log('📎 ファイル選択:', file.name, `(${(file.size / 1024).toFixed(1)}KB)`);
      setSelectedFile(file);
    }
  };

  /**
   * ファイル選択をキャンセルする処理
   */
  const handleFileCancel = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // input要素をリセット
    }
  };

  /**
   * ファイル選択ボタンクリック時の処理
   */
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    // ブラウザのデフォルトのフォーム送信を防ぐ
    e.preventDefault();

    // テキストもファイルも空の場合は送信しない
    if (!content.trim() && !selectedFile) return;

    try {
      let fileInfo: FileInfo | undefined = undefined;

      // ファイルが選択されている場合、先にアップロード
      if (selectedFile) {
        setIsUploading(true);
        console.log('🔄 ファイルアップロード開始:', selectedFile.name);

        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'ファイルのアップロードに失敗しました');
        }

        console.log('✅ ファイルアップロード成功:', uploadData.file);
        fileInfo = uploadData.file;
      }

      // 文字化けを防ぐために文字列を正規化
      const normalizedContent = content.trim().normalize('NFC');

      // 親コンポーネントから渡された送信関数を呼び出し（ファイル情報も渡す）
      handleSendMessage(normalizedContent || '（ファイル送信）', fileInfo);

      // 入力フィールドとファイル選択をクリア
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('❌ ファイルアップロードエラー:', error);
      alert('ファイルのアップロードに失敗しました。もう一度お試しください。');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <footer className="bg-background" data-testid="message-form">
      {/* ファイルプレビュー表示 */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 bg-muted p-2 rounded-md">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <span className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(1)}KB
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleFileCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* 隠しファイル入力要素 */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
        />

        {/* ファイル選択ボタン */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleFileButtonClick}
          disabled={isUploading}
          title="ファイルを添付"
          className="hover:bg-accent"
        >
          <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" />
          <span className="sr-only">ファイルを添付</span>
        </Button>

        {/* メッセージ入力フィールド（複数行対応） */}
        <textarea
          ref={textareaRef}
          data-testid="message-input"
          placeholder={`${channelDisplayName}にメッセージを送信`}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            // Enterキーで送信（Shift+Enterで改行）
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          disabled={isUploading}
        />

        {/* 送信ボタン */}
        <Button
          data-testid="send-button"
          type="submit"
          size="icon"
          disabled={(!content.trim() && !selectedFile) || isUploading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isUploading ? (
            <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          <span className="sr-only">{isUploading ? 'アップロード中' : '送信'}</span>
        </Button>
      </form>
    </footer>
  );
}