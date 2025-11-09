# 楽観的更新（Optimistic Update）実装ガイド

## 概要

このドキュメントでは、チャンネル参加・退出時に即座にUIを更新する「楽観的更新」の実装方法を初心者向けに解説します。

## 実装した機能

### 1. チャンネル退出機能
サイドバーの各チャンネルから即座に退出できる機能を実装しました。

### 2. チャンネル参加時の即座のUI更新
チャンネル検索モーダルから参加した際、サイドバーに即座にチャンネルが表示されるようにしました。

### 3. チャンネル退出時の即座のUI更新
チャンネルから退出した際、サイドバーから即座にチャンネルが削除されるようにしました。

---

## なぜ楽観的更新が必要なのか？

### 従来の方法（同期的更新）

```
1. ユーザーが「参加」ボタンをクリック
2. サーバーにリクエスト送信
3. サーバーからレスポンス受信（1〜2秒かかる）
4. APIで全チャンネルリストを再取得（さらに1〜2秒）
5. やっとサイドバーに表示される
→ 合計2〜4秒待つ必要がある
```

### 楽観的更新（Optimistic Update）

```
1. ユーザーが「参加」ボタンをクリック
2. 即座にサイドバーに表示（0.1秒以内）
3. バックグラウンドでサーバーにリクエスト送信
→ ユーザーは待たずに次の操作ができる
```

**メリット**:
- ユーザー体験が劇的に向上
- アプリが「サクサク」動くように感じる
- ネットワークの遅延を感じさせない

---

## 実装の全体像

### データの流れ

```
[ユーザー操作]
    ↓
[子コンポーネント] (JoinChannelDialog / ChannelList)
    ↓ コールバック関数を呼び出し
[親コンポーネント] (Layout)
    ↓ useState で状態を更新
[サイドバー] 即座に再レンダリング
```

### 使用している技術

1. **React の useState**: データを管理
2. **useCallback**: 関数をメモ化（再生成を防ぐ）
3. **コールバック関数**: 子から親にデータを渡す

---

## 実装方法の詳細解説

### ステップ1: 親コンポーネントで状態管理

**ファイル**: `src/app/workspace/layout.tsx`

```typescript
// チャンネルリストを状態として管理
const [channels, setChannels] = useState<Array<{
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}>>([]);
```

**説明**:
- `useState` で channels というチャンネルリストを管理
- `setChannels` でこのリストを更新できる
- 配列の型定義で TypeScript の型安全性を確保

---

### ステップ2: 即座に更新する関数を作成

**チャンネル参加時の関数**:

```typescript
const handleChannelJoined = useCallback((channel: {
  id: string;
  name: string;
  description?: string;
  memberCount: number
}) => {
  console.log('🔄 チャンネルをUIに即座に追加:', channel.name);
  setChannels((prev) => [...prev, channel]);
}, []);
```

**コードの解説**:

1. `useCallback` を使用
   - 関数を「メモ化」して、不要な再生成を防ぐ
   - 依存配列 `[]` が空なので、コンポーネントのライフサイクル全体で1回だけ生成

2. `setChannels((prev) => [...prev, channel])`
   - `prev`: 現在のチャンネルリスト
   - `[...prev, channel]`: 既存のリストに新しいチャンネルを追加
   - スプレッド構文 `...` で配列をコピーして immutable に更新

**チャンネル退出時の関数**:

```typescript
const handleChannelLeft = useCallback((channelId: string) => {
  console.log('🔄 チャンネルをUIから即座に削除:', channelId);
  setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
}, []);
```

**コードの解説**:

1. `filter` メソッドを使用
   - 指定された ID 以外のチャンネルだけを残す
   - 結果として、該当チャンネルが削除される

2. 例:
   ```typescript
   // 削除前
   channels = [
     { id: '1', name: 'チャンネル1' },
     { id: '2', name: 'チャンネル2' },
     { id: '3', name: 'チャンネル3' }
   ]

   // handleChannelLeft('2') を実行

   // 削除後
   channels = [
     { id: '1', name: 'チャンネル1' },
     { id: '3', name: 'チャンネル3' }
   ]
   ```

---

### ステップ3: 子コンポーネントにコールバックを渡す

**親コンポーネント** (`layout.tsx`):

```typescript
<ChannelList
  channels={channels}
  pathname={pathname}
  onChannelCreated={updateSidebarData}
  onChannelJoined={handleChannelJoined}  // 参加時のコールバック
  onChannelLeft={handleChannelLeft}      // 退出時のコールバック
/>
```

**説明**:
- `onChannelJoined` と `onChannelLeft` という props で関数を渡す
- 子コンポーネントから呼び出されると、親の状態が更新される

---

### ステップ4: 子コンポーネントで受け取る

**ChannelList コンポーネント** (`channelList.tsx`):

```typescript
interface ChannelListProps {
  channels: Channel[];
  pathname: string;
  onChannelCreated?: () => void;
  onChannelJoined?: (channel: {
    id: string;
    name: string;
    description?: string;
    memberCount: number
  }) => void;  // オプショナル（? マーク）
  onChannelLeft?: (channelId: string) => void;
}

export default function ChannelList({
  channels,
  pathname,
  onChannelCreated,
  onChannelJoined,  // 受け取る
  onChannelLeft     // 受け取る
}: ChannelListProps) {
  // ...
}
```

**説明**:
- `?` マークでオプショナルにしている
  - 渡されなくてもエラーにならない
  - 後方互換性を保つため

---

### ステップ5: 適切なタイミングでコールバックを呼び出す

**チャンネル参加時** (`joinChannelDialog.tsx`):

```typescript
const handleJoinChannel = async (channel: Channel) => {
  try {
    // APIリクエスト送信
    const response = await fetch('/api/channels/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: channel.id,
        userId: currentUser.id
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ チャンネル参加成功:', data.channelName);

      // モーダルを閉じる
      onOpenChange(false);

      // ★ ここで即座にUIを更新（楽観的更新）★
      if (onChannelJoined) {
        onChannelJoined({
          id: channel.id,
          name: channel.name,
          description: channel.description || undefined,
          memberCount: channel.memberCount + 1
        });
      }

      // チャンネルページに遷移
      router.push(`/workspace/channel/${channel.id}`);
    }
  } catch (err) {
    console.error('❌ チャンネル参加エラー:', err);
  }
};
```

**コードの流れ**:

1. `fetch` でAPIリクエスト送信
2. 成功したら `if (data.success)` の中に入る
3. `onChannelJoined` が渡されているかチェック（`if (onChannelJoined)`）
4. コールバック関数を呼び出す
   - 親コンポーネントの `handleChannelJoined` が実行される
   - `setChannels` で状態が更新される
   - サイドバーが即座に再レンダリングされる

**チャンネル退出時** (`channelList.tsx`):

```typescript
const handleLeaveChannel = async () => {
  if (!leaveChannel) return;

  setIsLeaving(true);

  try {
    // APIリクエスト送信
    const response = await fetch(`/api/channels/leave/${leaveChannel.id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ チャンネル退出成功:', data.channelName);

      // 退出成功: モーダルを閉じる
      setLeaveChannel(null);

      // ★ ここで即座にUIを更新（楽観的更新）★
      if (onChannelLeft) {
        onChannelLeft(leaveChannel.id);
      }

      // 現在そのチャンネルページにいる場合はワークスペースに遷移
      if (pathname === `/workspace/channel/${leaveChannel.id}`) {
        router.push('/workspace');
      }
    }
  } catch (err) {
    console.error('❌ チャンネル退出エラー:', err);
    alert(err instanceof Error ? err.message : 'チャンネルからの退出に失敗しました');
  } finally {
    setIsLeaving(false);
  }
};
```

---

## エラーハンドリング

### もしAPIリクエストが失敗したら？

現在の実装では、成功時のみ UI を更新しています。

```typescript
if (data.success) {
  // ✅ 成功した場合のみUIを更新
  if (onChannelJoined) {
    onChannelJoined(channel);
  }
} else {
  // ❌ 失敗した場合はUIを更新しない
  throw new Error(data.error);
}
```

**より高度な実装（オプション）**:

真の楽観的更新では、APIリクエストを送る**前**にUIを更新し、失敗したら元に戻します。

```typescript
// 1. 先にUIを更新（楽観的）
if (onChannelJoined) {
  onChannelJoined(channel);
}

try {
  // 2. APIリクエスト送信
  const response = await fetch(...);

  if (!response.ok) {
    // 3. 失敗したら元に戻す
    if (onChannelLeft) {
      onChannelLeft(channel.id);
    }
    throw new Error('失敗');
  }
} catch (err) {
  // エラー処理
}
```

現在の実装では、成功確認後に更新しているため、より安全ですが少し遅くなります。

---

## 実装ファイル一覧

### 修正したファイル

1. **`src/app/workspace/layout.tsx`**
   - チャンネルリストの状態管理
   - `handleChannelJoined` 関数の実装
   - `handleChannelLeft` 関数の実装

2. **`src/components/workspace/channelList.tsx`**
   - 退出ボタンの追加
   - コールバック関数の受け取りと呼び出し
   - `handleLeaveChannel` 関数の実装

3. **`src/components/channel/joinChannelDialog.tsx`**
   - チャンネル参加時のコールバック呼び出し
   - 全チャンネル表示機能の実装

### 新規作成したファイル

1. **`src/app/api/channels/leave/[channelId]/route.ts`**
   - チャンネル退出APIエンドポイント

2. **`src/app/api/channels/all/route.ts`**
   - 全チャンネル取得APIエンドポイント

---

## React の重要な概念

### useState の使い方

```typescript
const [state, setState] = useState(initialValue);
```

- `state`: 現在の値
- `setState`: 値を更新する関数
- `initialValue`: 初期値

**例**:

```typescript
const [count, setCount] = useState(0);

// 値を直接設定
setCount(5);  // count = 5

// 前の値を使って更新
setCount((prev) => prev + 1);  // count = 6
```

### useCallback の使い方

```typescript
const memoizedFunction = useCallback(() => {
  // 処理
}, [dependencies]);
```

- 関数をメモ化（キャッシュ）して、不要な再生成を防ぐ
- `dependencies` 配列に指定した値が変わった時だけ再生成

**なぜ必要？**
- React コンポーネントは再レンダリングのたびに関数が再生成される
- 子コンポーネントに props として渡すと、不要な再レンダリングが発生
- `useCallback` で関数を固定することで、パフォーマンスが向上

### コールバック関数とは？

関数を引数として渡し、後で呼び出してもらう仕組み。

```typescript
// 親コンポーネント
const handleData = (data) => {
  console.log('受け取ったデータ:', data);
};

<ChildComponent onData={handleData} />

// 子コンポーネント
const ChildComponent = ({ onData }) => {
  const handleClick = () => {
    onData('こんにちは');  // 親の関数を呼び出す
  };

  return <button onClick={handleClick}>送信</button>;
};
```

---

## まとめ

### 楽観的更新の実装パターン

```
1. 親コンポーネントで状態を管理（useState）
2. 更新関数を作成（useCallback）
3. 子コンポーネントに関数を渡す（props）
4. 子コンポーネントで適切なタイミングで呼び出す
5. 親の状態が更新され、UIが即座に再レンダリングされる
```

### この実装で学べること

- React の状態管理（useState）
- 関数のメモ化（useCallback）
- 親子コンポーネント間の通信（props とコールバック）
- TypeScript の型定義
- 非同期処理（async/await）
- ユーザー体験の向上（UX）

### 次のステップ

1. DM作成時にも同じパターンを適用してみる
2. エラー時にロールバック（元に戻す）機能を追加
3. ローディング状態を表示して、バックグラウンド処理を可視化
4. React Query や SWR などのライブラリを使ってさらに改善

---

## 参考リンク

- [React 公式ドキュメント - useState](https://ja.react.dev/reference/react/useState)
- [React 公式ドキュメント - useCallback](https://ja.react.dev/reference/react/useCallback)
- [Optimistic Updates の概念](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
