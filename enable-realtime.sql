-- Supabase RealtimeでMessageテーブルの変更を監視するためのSQL設定
-- Supabase管理画面 > SQL Editor で実行する

-- Messageテーブルでrealtime機能を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";

-- 確認: 現在のpublicationの状態をチェック
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';