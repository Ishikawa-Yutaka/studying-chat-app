# React useEffect 無限ループ トラブルシューティング

このドキュメントは、React useEffectで発生した無限ループエラーとその解決方法をまとめたものです。

## 目次

1. [エラーの概要](#エラーの概要)
2. [根本原因](#根本原因)
3. [問題のあるコード例](#問題のあるコード例)
4. [解決方法](#解決方法)
5. [技術的詳細](#技術的詳細)
6. [ベストプラクティス](#ベストプラクティス)

## エラーの概要

### エラーメッセージ

```
Error: Maximum update depth exceeded. 
This can happen when a component repeatedly calls setState inside componentDidUpdate or useEffect, 
but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

### 症状

- ブラウザがフリーズまたは極端に重くなる
- React Developer Toolsで無限レンダリングが確認される
- メモリ使用量が急激に増加
- リアルタイム機能が正常に動作しない

## 根本原因

### オブジェクト参照による依存関係の問題

Reactの`useEffect`依存配列にオブジェクトを渡すと、毎回新しい参照が作成されるため無限ループが発生します。

```javascript
// 問題の原理
const obj1 = { count: 1 };
const obj2 = { count: 1 };
console.log(obj1 === obj2); // false (異なる参照)

// Reactの比較は浅い比較（参照比較）
```

## 問題のあるコード例

### 1. useRealtimeMessages.ts（オリジナル版）

```typescript
// ❌ 問題のあるコード
export function useRealtimeMessages({ channelId, initialMessages }: UseRealtimeMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  
  // 問題：initialMessagesオブジェクトが毎回新しい参照
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]); // ←ここで無限ループ発生
  
  // 問題：addMessage関数も依存関係で無限ループ
  useEffect(() => {
    // Realtime設定
  }, [channelId, supabase, addMessage]); // ←addMessageが毎回新しい参照
}
```

### 2. useRealtimeDashboard.ts（オリジナル版）

```typescript
// ❌ 問題のあるコード
export function useRealtimeDashboard({ 
  initialStats, 
  initialChannels, 
  initialDirectMessages 
}: UseRealtimeDashboardProps) {
  const [stats, setStats] = useState(initialStats);
  const [channels, setChannels] = useState(initialChannels);
  const [directMessages, setDirectMessages] = useState(initialDirectMessages);

  // 問題：オブジェクト全体を依存関係に指定
  useEffect(() => {
    setStats(initialStats);
    setChannels(initialChannels);
    setDirectMessages(initialDirectMessages);
  }, [initialStats, initialChannels, initialDirectMessages]); // ←無限ループ
}
```

## 解決方法

### 1. プリミティブ値のみを依存関係に使用

```typescript
// ✅ 修正版：useRealtimeMessages-fixed.ts
export function useRealtimeMessages({ channelId, initialMessages }: UseRealtimeMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // 解決：プリミティブ値（length）のみを監視
  useEffect(() => {
    if (initialMessages.length > 0) {
      console.log('🔄 初期メッセージを設定:', initialMessages.length, '件');
      setMessages(initialMessages);
    }
  }, [initialMessages.length]); // プリミティブ値のみ

  // useCallbackで関数を安定化
  const addMessage = useCallback((newMessage: Message) => {
    setMessages(prevMessages => {
      const exists = prevMessages.some(msg => msg.id === newMessage.id);
      if (exists) {
        console.log('🔄 重複メッセージをスキップ:', newMessage.id);
        return prevMessages;
      }
      console.log('✅ 新しいメッセージを追加:', newMessage.id);
      return [...prevMessages, newMessage];
    });
  }, []); // 空の依存配列で安定化
}
```

### 2. useMemoを使用した安全な比較

```typescript
// ✅ 修正版：useRealtimeDashboard-fixed.ts
export function useRealtimeDashboard({ 
  initialStats, 
  initialChannels, 
  initialDirectMessages,
  currentUserId 
}: UseRealtimeDashboardProps) {
  const [stats, setStats] = useState(initialStats);
  const [channels, setChannels] = useState(initialChannels);
  const [directMessages, setDirectMessages] = useState(initialDirectMessages);

  // useMemoで安全な変更検知
  const hasInitialDataChanged = useMemo(() => {
    return (
      initialStats.totalRoomsCount !== stats.totalRoomsCount ||
      initialChannels.length !== channels.length ||
      initialDirectMessages.length !== directMessages.length
    );
  }, [
    initialStats.totalRoomsCount,
    initialChannels.length,
    initialDirectMessages.length,
    stats.totalRoomsCount,
    channels.length,
    directMessages.length
  ]);

  // プリミティブ値の比較結果のみを依存関係に使用
  useEffect(() => {
    if (hasInitialDataChanged) {
      console.log('📊 ダッシュボード初期データを更新');
      setStats(initialStats);
      setChannels(initialChannels);
      setDirectMessages(initialDirectMessages);
    }
  }, [hasInitialDataChanged, initialStats, initialChannels, initialDirectMessages]);
}
```

## 技術的詳細

### React依存関係の比較方法

```javascript
// Reactの内部比較（Object.is使用）
Object.is(obj1, obj2); // 参照比較
Object.is(1, 1); // true（プリミティブ値）
Object.is({a: 1}, {a: 1}); // false（異なる参照）
```

### なぜ無限ループが発生するか

```
1. コンポーネントレンダリング
2. useEffect実行（依存関係変更検知）
3. setState実行
4. 再レンダリング発生
5. 新しいオブジェクト参照作成
6. useEffect再実行（無限ループ）
```

### プリミティブ値 vs オブジェクト参照

```typescript
// プリミティブ値（安全）
const count = 5;
const name = "hello";
const isValid = true;

// オブジェクト参照（危険）
const user = { id: 1, name: "太郎" }; // 毎回新しい参照
const messages = [{ id: 1, content: "hello" }]; // 毎回新しい参照
```

## ベストプラクティス

### 1. 依存関係の選択

```typescript
// ✅ 良い例：プリミティブ値
useEffect(() => {
  // 処理
}, [user.id, messages.length, isLoading]);

// ❌ 悪い例：オブジェクト全体
useEffect(() => {
  // 処理
}, [user, messages, config]);
```

### 2. useCallbackの活用

```typescript
// ✅ 関数を安定化
const handleClick = useCallback((id: string) => {
  // 処理
}, []); // 依存関係を最小化

// ❌ 毎回新しい関数
const handleClick = (id: string) => {
  // 処理
}; // useEffectの依存関係に入れると無限ループ
```

### 3. useMemoでの計算結果キャッシュ

```typescript
// ✅ 計算結果をキャッシュ
const hasChanged = useMemo(() => {
  return data.length !== prevData.length;
}, [data.length, prevData.length]);

// ❌ 毎回計算
const hasChanged = data.length !== prevData.length;
```

### 4. 初期化パターン

```typescript
// ✅ 初期化フラグを使用
const [isInitialized, setIsInitialized] = useState(false);

useEffect(() => {
  if (!isInitialized && initialData.length > 0) {
    setData(initialData);
    setIsInitialized(true);
  }
}, [isInitialized, initialData.length]);

// ✅ useRefで初期化管理
const initRef = useRef(false);

useEffect(() => {
  if (!initRef.current && initialData.length > 0) {
    setData(initialData);
    initRef.current = true;
  }
}, [initialData.length]);
```

## デバッグ方法

### 1. React Developer Toolsの活用

```
1. React Developer Tools > Profiler
2. レンダリング回数の確認
3. 無限レンダリングの検出
```

### 2. console.logでの依存関係追跡

```typescript
useEffect(() => {
  console.log('useEffect実行:', { 
    userId: user.id, 
    messageCount: messages.length 
  });
  // 処理
}, [user.id, messages.length]);
```

### 3. eslint-plugin-react-hooksの活用

```json
// .eslintrc.json
{
  "extends": ["plugin:react-hooks/recommended"],
  "rules": {
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## 修正前後の比較

### 修正前（無限ループ発生）

```typescript
// ❌ 危険なパターン
useEffect(() => {
  setMessages(initialMessages);
}, [initialMessages]); // オブジェクト参照
```

### 修正後（安定動作）

```typescript
// ✅ 安全なパターン
useEffect(() => {
  if (initialMessages.length > 0) {
    setMessages(initialMessages);
  }
}, [initialMessages.length]); // プリミティブ値
```

## まとめ

React useEffectの無限ループを防ぐためには：

1. **依存関係にはプリミティブ値のみ使用**
2. **useCallback/useMemoで参照を安定化**
3. **オブジェクト全体ではなく必要な値のみを監視**
4. **初期化フラグやuseRefを適切に活用**

これらの原則を守ることで、安定したReactアプリケーションを構築できます。