-- Messageテーブルがrealtime publicationに含まれているかを確認
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'Message';