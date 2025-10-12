# Supabase Realtime トラブルシューティング

このドキュメントは、Supabase Realtimeの実装で発生した問題とその解決方法をまとめたものです。

## 目次

1. [問題の概要](#問題の概要)
2. [主な原因](#主な原因)
3. [解決手順](#解決手順)
4. [技術的詳細](#技術的詳細)
5. [予防策](#予防策)

## 問題の概要

### 症状

- **送信側**: メッセージが一瞬表示されて消える
- **受信側**: リアルタイムでメッセージが表示されない（手動更新すると表示される）
- **エラー**: 無限ループエラー（Maximum update depth exceeded）

### 期待する動作

- **送信側**: メッセージが即座に表示されて消えない
- **受信側**: 別タブで新しいメッセージがリアルタイム表示される

## 主な原因

### 1. Supabase Realtimeのテーブル設定不備

**根本原因**: MessageテーブルがSupabase Realtimeの監視対象に含まれていなかった

```sql
-- 確認方法
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'Message';

-- 結果が空 = 監視対象外
```

### 2. React useEffectの無限ループ

**原因**: オブジェクト参照の依存関係による無限ループ

```typescript
// 問題のあるコード
useEffect(() => {
  setMessages(initialMessages);
}, [initialMessages]); // オブジェクト参照が毎回変わる
```

## 解決手順

### Step 1: Supabase Realtimeの有効化

**Supabase SQL Editorで実行:**

```sql
-- Messageテーブルをrealtime publicationに追加
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";

-- 確認
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**期待する結果:**
```json
[
  {
    "schemaname": "public",
    "tablename": "Message"
  }
]
```

### Step 2: React無限ループの修正

**修正前:**
```typescript
// 問題: オブジェクト参照による無限ループ
const hasInitialMessagesChanged = useMemo(() => {
  return initialMessages.length !== messages.length;
}, [initialMessages.length, messages.length]);

useEffect(() => {
  if (hasInitialMessagesChanged && initialMessages.length > 0) {
    setMessages(initialMessages);
  }
}, [hasInitialMessagesChanged, initialMessages]);
```

**修正後:**
```typescript
// 解決: プリミティブ値のみ監視
useEffect(() => {
  if (initialMessages.length > 0) {
    console.log('🔄 初期メッセージを設定:', initialMessages.length, '件');
    setMessages(initialMessages);
  }
}, [initialMessages.length]); // プリミティブ値のみ
```

### Step 3: Supabaseクライアント設定の強化

```typescript
// utils/supabase/client.ts
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}
```

### Step 4: デバッグログの追加

```typescript
// hooks/useRealtimeMessages-fixed.ts
.subscribe((status, err) => {
  console.log(`📡 Realtime接続状況: ${status}`);
  if (err) {
    console.error('❌ Realtime接続エラー:', err);
  }
  if (status === 'SUBSCRIBED') {
    console.log('✅ Realtimeサブスクリプション成功');
  }
});
```

## 技術的詳細

### PostgreSQL Publicationとは

**Publication**は、PostgreSQLの論理レプリケーション機能で、「どのテーブルの変更を外部に配信するか」を定義するオブジェクトです。

```sql
-- PostgreSQLのシステムカタログ（デフォルトで存在）
pg_publication          -- Publication自体の情報
pg_publication_tables   -- Publicationに含まれるテーブル一覧
pg_publication_rel      -- Publication-テーブル関係
```

### Supabase Realtimeの仕組み

```
1. アプリ → PostgreSQLにINSERT
2. PostgreSQL → Publicationで変更を検知
3. Publication → WebSocketで変更を配信  
4. Supabase → フロントエンドに通知
5. フロントエンド → UIを更新
```

### React依存関係の原理

```typescript
// 問題: 毎回新しいオブジェクト参照
const obj = { count: 1 }; // 毎レンダリングで新しい参照
useEffect(() => {}, [obj]); // 毎回実行される

// 解決: プリミティブ値を監視
const count = 1; // プリミティブ値
useEffect(() => {}, [count]); // 値が変わった時のみ実行
```

## 予防策

### 1. 新しいテーブル作成時

```sql
-- 新しいテーブルを作成後、必ずRealtime有効化
CREATE TABLE new_table (...);
ALTER PUBLICATION supabase_realtime ADD TABLE "new_table";
```

### 2. React依存関係のベストプラクティス

```typescript
// ✅ 良い例: プリミティブ値を監視
useEffect(() => {
  // 処理
}, [data.length, data.id]);

// ❌ 悪い例: オブジェクト全体を監視
useEffect(() => {
  // 処理  
}, [data]);
```

### 3. デバッグの準備

```typescript
// 常にログを出力して接続状況を確認
console.log('🔄 Realtime監視開始:', channelId);
console.log('📡 接続状況:', status);
```

### 4. 設定確認のSQL

```sql
-- 定期的にPublication設定を確認
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

## 最終的な成功ログ

テスト時にコンソールで以下のログが確認できれば成功です：

```
🔄 チャンネル xxxxx のリアルタイム監視を開始
📡 Realtime接続状況: SUBSCRIBED
✅ Realtimeサブスクリプション成功
📨 Realtimeで新しいメッセージを受信: {...}
✅ 新しいメッセージを追加: xxxxx
```

## まとめ

Supabase Realtimeの実装では、以下の2点が重要です：

1. **データベース設定**: `ALTER PUBLICATION supabase_realtime ADD TABLE "TableName";`
2. **React実装**: オブジェクト参照ではなくプリミティブ値を依存関係に使用

これらを正しく設定することで、LINE/Slackのようなリアルタイムチャット体験を実現できます。