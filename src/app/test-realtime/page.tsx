/**
 * Supabase Realtimeテストページ
 * リアルタイム機能の動作確認用
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function TestRealtimePage() {
  const [status, setStatus] = useState<string>('未接続');
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 Realtime接続テストを開始します...');
    setMessages(prev => [...prev, '🔄 Realtime接続テストを開始...']);

    const supabase = createClient();
    
    // 基本的な接続テスト
    const channel = supabase
      .channel('test_channel')
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('📨 ブロードキャストメッセージを受信:', payload);
        setMessages(prev => [...prev, `📨 ブロードキャスト受信: ${JSON.stringify(payload)}`]);
      })
      .subscribe((status, err) => {
        console.log(`📡 Realtime接続状況: ${status}`, err);
        setStatus(status);
        setMessages(prev => [...prev, `📡 接続状況: ${status}`]);
        
        if (err) {
          console.error('❌ Realtime接続エラー:', err);
          setError(err.message || 'Unknown error');
          setMessages(prev => [...prev, `❌ エラー: ${err.message}`]);
        }
      });

    // PostgreSQL変更の監視テスト
    const dbChannel = supabase
      .channel('db_test_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Message'
        },
        (payload) => {
          console.log('🗃️ データベース変更を検出:', payload);
          setMessages(prev => [...prev, `🗃️ DB変更: ${payload.eventType} - ${payload.table}`]);
        }
      )
      .subscribe((status, err) => {
        console.log(`🗃️ DB監視接続状況: ${status}`, err);
        setMessages(prev => [...prev, `🗃️ DB監視: ${status}`]);
        
        if (err) {
          console.error('❌ DB監視エラー:', err);
          setMessages(prev => [...prev, `❌ DB監視エラー: ${err.message}`]);
        }
      });

    return () => {
      console.log('🔌 Realtime接続を切断します');
      setMessages(prev => [...prev, '🔌 接続を切断しました']);
      supabase.removeChannel(channel);
      supabase.removeChannel(dbChannel);
    };
  }, []);

  const sendTestBroadcast = () => {
    const supabase = createClient();
    const channel = supabase.channel('test_channel');
    
    const testMessage = {
      message: 'Hello from test!',
      timestamp: new Date().toISOString()
    };
    
    channel.send({
      type: 'broadcast',
      event: 'test',
      payload: testMessage
    });
    
    setMessages(prev => [...prev, `📤 テストメッセージ送信: ${JSON.stringify(testMessage)}`]);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Supabase Realtimeテスト</h1>
      
      {/* 接続状況 */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">接続状況</h2>
        <p className={`font-mono text-sm ${
          status === 'SUBSCRIBED' ? 'text-green-600' : 
          status === 'CHANNEL_ERROR' ? 'text-red-600' : 
          'text-yellow-600'
        }`}>
          {status}
        </p>
        {error && (
          <p className="text-red-600 text-sm mt-2">エラー: {error}</p>
        )}
      </div>

      {/* テストボタン */}
      <div className="mb-6">
        <button
          onClick={sendTestBroadcast}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={status !== 'SUBSCRIBED'}
        >
          テストメッセージ送信
        </button>
      </div>

      {/* ログメッセージ */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">リアルタイムログ</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className="text-sm font-mono p-2 bg-gray-50 rounded">
              {message}
            </div>
          ))}
        </div>
      </div>

      {/* 診断情報 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">診断情報</h3>
        <ul className="text-sm space-y-1">
          <li>• Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</li>
          <li>• Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定'}</li>
          <li>• Realtime接続: {status === 'SUBSCRIBED' ? '✅ 正常' : '❌ 問題あり'}</li>
        </ul>
      </div>
    </div>
  );
}