# LINE級の高速化ガイド

このドキュメントでは、LINEのような超高速チャットアプリを実現するための施策をまとめています。

## 目次

1. [概要](#概要)
2. [LINEが速い理由](#lineが速い理由)
3. [実装施策一覧](#実装施策一覧)
4. [施策詳細](#施策詳細)
5. [実装優先順位](#実装優先順位)
6. [参考資料](#参考資料)

---

## 概要

### LINEの体感速度

LINEを使っていて感じる「速さ」：
- トーク画面の切り替えが**瞬時**
- メッセージ送信が**即座に反映**
- スクロールが**ヌルヌル滑らか**
- リロードしても**前回の状態を維持**

この「速さ」を実現するための技術を学びます。

---

## LINEが速い理由

### 5つの核心技術

```
┌──────────────────────────────────────────────────────┐
│  LINEの高速化技術                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. 積極的なキャッシュ戦略                           │
│     - 一度取得したデータをメモリに保存               │
│     - 2回目以降は即座に表示                          │
│                                                      │
│  2. 楽観的更新（Optimistic Update）                  │
│     - 送信ボタンを押した瞬間に画面更新               │
│     - サーバーの応答を待たない                       │
│                                                      │
│  3. 仮想スクロール（Virtual Scrolling）              │
│     - 画面に見えている部分だけを描画                 │
│     - 大量のメッセージでもサクサク                   │
│                                                      │
│  4. データの事前読み込み（Prefetching）              │
│     - 次に見るであろうデータを先に取得               │
│                                                      │
│  5. リアルタイムWebSocket                            │
│     - 常時接続で即座にメッセージ配信                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 実装施策一覧

### 効果と難易度の比較

| 施策 | 実装難易度 | 効果 | 優先度 | 実装期間 |
|------|----------|------|--------|---------|
| **SWR導入** | ★☆☆ 簡単 | ★★★ 大 | 1位 | 1日 |
| **仮想スクロール** | ★★☆ 中 | ★★★ 大 | 2位 | 2-3日 |
| **楽観的更新改善** | ★☆☆ 簡単 | ★★☆ 中 | 3位 | 1日 |
| **ローカルストレージ** | ★★☆ 中 | ★★☆ 中 | 4位 | 2日 |
| **事前読み込み** | ★☆☆ 簡単 | ★☆☆ 小 | 5位 | 半日 |

---

## 施策詳細

### 1. SWR導入（最優先）★★★

#### 概要
**SWR（stale-while-revalidate）** は、データをキャッシュしながら最新データも取得する戦略です。

#### 何が速くなる？

```
┌──────────────────────────────────────────────────────┐
│  通常のfetch vs SWR                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  【通常のfetch - 毎回APIを呼ぶ】                     │
│                                                      │
│  チャンネルA → チャンネルB → チャンネルA（戻る）    │
│      ↓            ↓              ↓                  │
│   API呼び出し  API呼び出し    API呼び出し           │
│   500ms待つ    500ms待つ      500ms待つ             │
│                                                      │
│  【SWR - キャッシュを活用】                          │
│                                                      │
│  チャンネルA → チャンネルB → チャンネルA（戻る）    │
│      ↓            ↓              ↓                  │
│   API呼び出し  API呼び出し    キャッシュ表示！      │
│   500ms待つ    500ms待つ      0ms（瞬時）           │
│                               ↓                      │
│                         バックグラウンドで更新       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 仕組み

```
1. 初回アクセス
   ユーザー → API → データ取得（500ms）
                  ↓
              キャッシュに保存

2. 2回目アクセス
   ユーザー → キャッシュから即座に表示（0ms）
           ↓
     バックグラウンドでAPI呼び出し
           ↓
     新しいデータがあれば更新
```

#### 実装方法

##### インストール
```bash
npm install swr
```

##### 現在のコード（遅い）
```typescript
// src/app/workspace/channel/[channelId]/page.tsx
const [messages, setMessages] = useState([]);

useEffect(() => {
  const fetchMessages = async () => {
    const response = await fetch(`/api/messages/${channelId}`);
    const data = await response.json();
    setMessages(data.messages);
  };
  fetchMessages();
}, [channelId]);

// チャンネルを切り替えるたびに500ms待つ
```

##### SWR導入後（速い）
```typescript
import useSWR from 'swr';

// データ取得関数
const fetcher = (url: string) => fetch(url).then(r => r.json());

// SWRフック
const { data, error, isLoading } = useSWR(
  `/api/messages/${channelId}`,
  fetcher,
  {
    revalidateOnFocus: false,    // フォーカス時に再検証しない
    revalidateOnReconnect: true, // 再接続時は再検証
    dedupingInterval: 2000,      // 2秒間は同じリクエストを重複排除
  }
);

const messages = data?.messages || [];

// チャンネルを切り替え → 0ms（瞬時！）
```

#### 期待される効果

**体感速度の改善**:
```
初回アクセス: 500ms（変化なし）
2回目以降:    0ms（瞬時！）← LINEと同じ体感

改善率: 無限大（待ち時間ゼロ）
```

#### メリット・デメリット

**メリット**:
- ページ遷移が超高速（LINEレベル）
- コード量が減る（useState不要）
- 自動的に最新データに更新
- エラーハンドリングが簡単
- ローディング状態を自動管理

**デメリット**:
- メモリを使う（でも影響は小さい）
- 学習コストがある（でもドキュメント充実）
- 古いデータが一瞬表示される可能性（でもすぐ更新）

---

### 2. 仮想スクロール（Virtual Scrolling）★★★

#### 概要
画面に**見えている部分だけ**をHTMLに変換して、大量のメッセージでもサクサク動作させる技術。

#### 問題点：通常の実装

```
┌──────────────────────────────────────────────────────┐
│  10,000件のメッセージを全部HTMLに変換                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  メッセージ1:  <div>...</div>                        │
│  メッセージ2:  <div>...</div>                        │
│  メッセージ3:  <div>...</div>                        │
│  ...                                                 │
│  メッセージ10,000: <div>...</div>                    │
│                                                      │
│  ブラウザ: 「10,000個のDOMを管理するの重い...」      │
│  結果: スクロールがカクカク、画面が重い              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 解決策：仮想スクロール

```
┌──────────────────────────────────────────────────────┐
│  画面に見えている20件だけHTMLに変換                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  メッセージ総数: 10,000件                            │
│                                                      │
│  ┌────────────┐                                     │
│  │ (非表示)   │ ← メッセージ1-100                    │
│  │ (非表示)   │    HTMLなし（空の<div>だけ）         │
│  ├────────────┤                                     │
│  │ 表示中     │ ← メッセージ101-120（画面内）        │
│  │ 表示中     │    ← ここだけHTMLを生成              │
│  │ 表示中     │                                      │
│  ├────────────┤                                     │
│  │ (非表示)   │ ← メッセージ121-10,000               │
│  │ (非表示)   │    HTMLなし（空の<div>だけ）         │
│  └────────────┘                                     │
│                                                      │
│  スクロールすると...                                 │
│  → 表示範囲が変わる（例: 111-130）                   │
│  → 111-130だけHTMLを生成                             │
│  → 101-110と131-140は破棄                            │
│                                                      │
│  ブラウザ: 「20個だけ管理すればいいから楽！」        │
│  結果: スクロールがヌルヌル、常に軽快                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### パフォーマンス比較

| メッセージ数 | 通常の実装 | 仮想スクロール | 改善率 |
|------------|----------|--------------|--------|
| 100件 | 速い（50ms） | 速い（30ms） | 1.6倍 |
| 1,000件 | 遅い（500ms） | 速い（30ms） | 16倍 |
| 10,000件 | 非常に遅い（5秒） | 速い（30ms） | 166倍 |
| 100,000件 | 動かない（50秒） | 速い（30ms） | 1666倍 |

#### 実装方法

##### インストール
```bash
npm install react-window
```

##### 現在のコード（遅い）
```typescript
// 全メッセージをマップで展開
<div className="messages">
  {messages.map((message) => (
    <MessageCard key={message.id} message={message} />
  ))}
</div>

// 10,000件のメッセージ → 10,000個のDOM → 重い
```

##### 仮想スクロール導入後（速い）
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}              // スクロールエリアの高さ
  itemCount={messages.length} // 総メッセージ数
  itemSize={80}             // 1メッセージの高さ（px）
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <MessageCard message={messages[index]} />
    </div>
  )}
</FixedSizeList>

// 10,000件のメッセージ → 20個のDOM → 軽い！
```

#### 可変高さメッセージの場合

メッセージの高さがバラバラの場合は`VariableSizeList`を使用：

```typescript
import { VariableSizeList } from 'react-window';

// 各メッセージの高さを計算する関数
const getItemSize = (index: number) => {
  const message = messages[index];
  const baseHeight = 60; // 基本の高さ
  const contentLines = Math.ceil(message.content.length / 50);
  return baseHeight + (contentLines * 20);
};

<VariableSizeList
  height={600}
  itemCount={messages.length}
  itemSize={getItemSize}  // 動的に高さを計算
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <MessageCard message={messages[index]} />
    </div>
  )}
</VariableSizeList>
```

#### 適用すべきページ

- ✅ チャンネルページ（メッセージ一覧）
- ✅ DMページ（メッセージ一覧）
- ✅ AIチャットページ（会話履歴）
- ⚠️ ダッシュボード（チャンネル一覧が100件以上なら適用）

---

### 3. 楽観的更新の改善 ★★☆

#### 現在の実装

すでに楽観的更新は実装済みですが、LINEと比べると粗削りです。

```typescript
// 現在の実装
const handleSendMessage = async (content: string) => {
  // 楽観的更新: 即座に画面に表示
  const tempMessage = {
    id: 'temp-' + Date.now(),
    content,
    sender: user,
    createdAt: new Date(),
  };
  addMessage(tempMessage);

  // API送信
  try {
    const response = await fetch('/api/messages', { /*...*/ });
    // 成功したらOK
  } catch (error) {
    // 失敗したらalert
    alert('送信に失敗しました');
  }
};
```

#### 問題点

1. **送信状態が不明**
   - 送信中なのか、送信済みなのか分からない

2. **失敗時の対応が不親切**
   - alertが出るだけ
   - 再送信できない

#### LINEの実装

```
送信ボタンを押す
  ↓
メッセージが画面に表示（グレーアウト）
  ↓
送信中...
  ↓
成功 → 通常の色に変わる
失敗 → 赤い「!」マークと「再送信」ボタン
```

#### 改善後の実装

##### メッセージの型に状態を追加

```typescript
interface Message {
  id: string;
  content: string;
  sender: User;
  createdAt: Date;
  // 送信状態を追加
  status: 'sending' | 'sent' | 'failed';
}
```

##### 送信処理を改善

```typescript
const handleSendMessage = async (content: string) => {
  // 一時ID生成
  const tempId = 'temp-' + Date.now();

  // 楽観的更新: 送信中状態で表示
  const tempMessage: Message = {
    id: tempId,
    content,
    sender: user,
    createdAt: new Date(),
    status: 'sending',  // 送信中
  };
  addMessage(tempMessage);

  try {
    // API送信
    const response = await fetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    const data = await response.json();

    if (data.success) {
      // 成功: 一時メッセージを本物のメッセージに置き換え
      updateMessage(tempId, {
        id: data.message.id,
        status: 'sent',  // 送信完了
      });
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    // 失敗: 失敗状態に変更
    updateMessage(tempId, {
      status: 'failed',  // 送信失敗
    });
  }
};
```

##### UIで状態を表示

```typescript
<MessageCard message={message}>
  {/* メッセージ内容 */}
  <p>{message.content}</p>

  {/* 送信状態の表示 */}
  {message.status === 'sending' && (
    <span className="text-gray-400">送信中...</span>
  )}
  {message.status === 'sent' && (
    <span className="text-blue-500">✓✓</span>  // LINEの既読マーク風
  )}
  {message.status === 'failed' && (
    <div className="flex items-center gap-2">
      <span className="text-red-500">! 送信失敗</span>
      <button onClick={() => retrySend(message)}>
        再送信
      </button>
    </div>
  )}
</MessageCard>
```

##### 再送信機能

```typescript
const retrySend = async (failedMessage: Message) => {
  // 送信中に戻す
  updateMessage(failedMessage.id, { status: 'sending' });

  // 再度送信
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ content: failedMessage.content }),
    });
    const data = await response.json();

    if (data.success) {
      updateMessage(failedMessage.id, {
        id: data.message.id,
        status: 'sent',
      });
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    updateMessage(failedMessage.id, { status: 'failed' });
  }
};
```

#### 期待される効果

**ユーザー体験の向上**:
- 送信状態が視覚的に分かる
- 失敗しても簡単に再送信できる
- LINEと同じ安心感

---

### 4. ローカルストレージでキャッシュ ★★☆

#### 概要
メッセージをブラウザの**localStorage**に保存して、ページをリロードしても瞬時に表示。

#### LINEアプリとの比較

```
【LINEアプリ】
アプリを閉じる → 再度開く
  → 前回のメッセージが即座に表示
  → その後、最新メッセージを取得

【ブラウザ版チャット（改善後）】
ページを閉じる → 再度開く
  → localStorageから前回のメッセージを即座に表示
  → その後、APIで最新メッセージを取得
```

#### 仕組み

```
┌──────────────────────────────────────────────────────┐
│  localStorageキャッシュの仕組み                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. メッセージ取得時                                 │
│     API → メッセージ受信                             │
│       ↓                                              │
│     useState に保存（画面表示）                      │
│       ↓                                              │
│     localStorage にも保存（永続化）                  │
│                                                      │
│  2. 次回ページアクセス時                             │
│     localStorage から読み込み（0ms）                 │
│       ↓                                              │
│     即座に画面表示（古いデータ）                     │
│       ↓                                              │
│     バックグラウンドでAPI呼び出し                    │
│       ↓                                              │
│     新しいデータがあれば更新                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 実装方法

##### カスタムフック作成

```typescript
// src/hooks/useLocalStorageCache.ts
import { useState, useEffect } from 'react';

export function useLocalStorageCache<T>(
  key: string,
  fetchData: () => Promise<T>,
  ttl: number = 5 * 60 * 1000  // 有効期限5分
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // 1. localStorageからキャッシュを読み込み
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          if (age < ttl) {
            // キャッシュが有効期限内なら即座に表示
            setData(cachedData);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('キャッシュ読み込みエラー:', error);
        }
      }

      // 2. APIから最新データを取得
      try {
        const freshData = await fetchData();
        setData(freshData);

        // localStorageに保存
        localStorage.setItem(key, JSON.stringify({
          data: freshData,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [key]);

  return { data, isLoading };
}
```

##### 使用例

```typescript
// src/app/workspace/channel/[channelId]/page.tsx
const { data: messages, isLoading } = useLocalStorageCache(
  `messages_${channelId}`,
  async () => {
    const response = await fetch(`/api/messages/${channelId}`);
    const data = await response.json();
    return data.messages;
  },
  5 * 60 * 1000  // 5分間キャッシュ
);
```

#### localStorageの制限

**容量制限**:
- 一般的に **5-10MB** まで
- メッセージを100件程度保存するなら十分

**保存できるデータ**:
- 文字列のみ（JSON.stringifyで変換）

**注意点**:
- プライベートブラウジングでは無効
- ユーザーがクリアすると消える

#### データサイズの管理

```typescript
// 古いキャッシュを削除する関数
function cleanupOldCache() {
  const keys = Object.keys(localStorage);
  const now = Date.now();

  keys.forEach(key => {
    if (key.startsWith('messages_')) {
      try {
        const cached = JSON.parse(localStorage.getItem(key)!);
        const age = now - cached.timestamp;

        // 1週間以上古いキャッシュは削除
        if (age > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        // 壊れたキャッシュは削除
        localStorage.removeItem(key);
      }
    }
  });
}

// アプリ起動時に実行
cleanupOldCache();
```

---

### 5. データの事前読み込み（Prefetching）★☆☆

#### 概要
ユーザーが次に見るであろうデータを**先に取得**しておく。

#### 例：マウスホバーで事前取得

```
ダッシュボードでチャンネル一覧を表示中:

ユーザーがチャンネルリンクにマウスを載せる
  ↓
バックグラウンドでメッセージを事前取得
  ↓
ユーザーがクリック
  ↓
すでに取得済み → 0ms（瞬時に表示）
```

#### 実装方法（Next.jsの場合）

##### 自動Prefetch（Next.js Link）

Next.jsの`<Link>`は自動的にprefetchします：

```typescript
import Link from 'next/link';

<Link href={`/workspace/channel/${channelId}`} prefetch={true}>
  {channelName}
</Link>

// 画面内に表示された時点でprefetchが始まる
```

##### 手動Prefetch（SWR使用）

```typescript
import { mutate } from 'swr';

// チャンネルリンクにマウスが載ったら事前取得
<Link
  href={`/workspace/channel/${channelId}`}
  onMouseEnter={() => {
    // SWRのキャッシュに事前に保存
    mutate(
      `/api/messages/${channelId}`,
      fetch(`/api/messages/${channelId}`).then(r => r.json())
    );
  }}
>
  {channelName}
</Link>
```

##### カスタムフック化

```typescript
// src/hooks/usePrefetch.ts
import { mutate } from 'swr';

export function usePrefetch() {
  const prefetch = (url: string) => {
    mutate(
      url,
      fetch(url).then(r => r.json()),
      { revalidate: false }  // 再検証しない
    );
  };

  return { prefetch };
}

// 使用例
const { prefetch } = usePrefetch();

<div onMouseEnter={() => prefetch(`/api/messages/${channelId}`)}>
  {channelName}
</div>
```

#### 期待される効果

**体感速度の改善**:
```
マウスホバーなし: クリック → 500ms待つ
マウスホバーあり: クリック → 0ms（瞬時）

改善率: 無限大（待ち時間ゼロ）
```

#### 注意点

**データ転送量が増える**:
- ユーザーがクリックしない場合も取得
- モバイル環境では慎重に使用

**適用すべき場所**:
- ✅ よく使われるリンク（チャンネル一覧など）
- ❌ あまり使われないリンク

---

## 実装優先順位

### フェーズ1: 即効性が高い（1-2日）

#### 1. SWR導入 ★★★
- **効果**: 2回目以降のページ遷移が瞬時
- **実装時間**: 1日
- **難易度**: 低

#### 2. 楽観的更新改善 ★★☆
- **効果**: 送信状態の可視化、UX向上
- **実装時間**: 1日
- **難易度**: 低

### フェーズ2: 長期的な改善（3-5日）

#### 3. 仮想スクロール ★★★
- **効果**: 大量メッセージでも快適
- **実装時間**: 2-3日
- **難易度**: 中

#### 4. ローカルストレージ ★★☆
- **効果**: リロードしても高速
- **実装時間**: 2日
- **難易度**: 中

### フェーズ3: 細かい改善（1日）

#### 5. 事前読み込み ★☆☆
- **効果**: クリック前に準備
- **実装時間**: 半日
- **難易度**: 低

---

## 総合的な効果予測

### 実装前後の比較

| 指標 | 現在 | SWR導入後 | 全施策実装後 | 改善率 |
|------|------|----------|-------------|--------|
| 初回ページロード | 1.8秒 | 1.8秒 | 1.5秒 | 16%短縮 |
| 2回目以降のページ遷移 | 1.8秒 | 0.1秒 | 0.05秒 | 97%短縮 |
| メッセージ送信の反映 | 即座 | 即座 | 即座（状態表示付き） | UX向上 |
| 10,000件のメッセージ表示 | 5秒 | 5秒 | 0.03秒 | 99%短縮 |
| リロード後の表示 | 1.8秒 | 1.8秒 | 0.1秒 | 94%短縮 |

### LINE級の体感速度を実現

```
┌──────────────────────────────────────────────────────┐
│  実装後の体感速度                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ✅ チャンネル切り替え: 瞬時（LINEと同じ）          │
│  ✅ メッセージ送信: 即座に反映（LINEと同じ）        │
│  ✅ スクロール: ヌルヌル滑らか（LINEと同じ）        │
│  ✅ リロード: 前回の状態を維持（LINEと同じ）        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 実装時の注意点

### 1. SWR導入時

**注意**:
- Realtimeとの併用に注意
- キャッシュの無効化タイミングを考慮

```typescript
// Realtimeで新しいメッセージを受信したらキャッシュを更新
useEffect(() => {
  const channel = supabase.channel('messages');

  channel.on('postgres_changes', { /*...*/ }, (payload) => {
    // SWRのキャッシュを更新
    mutate(`/api/messages/${channelId}`);
  });
}, []);
```

### 2. 仮想スクロール導入時

**注意**:
- メッセージの高さが一定でない場合は`VariableSizeList`を使用
- スクロール位置の維持が難しい

### 3. ローカルストレージ使用時

**注意**:
- 容量制限（5-10MB）
- 古いキャッシュの削除
- プライベートブラウジングでは無効

---

## 参考資料

### 公式ドキュメント

- [SWR](https://swr.vercel.app/)
- [React Window](https://github.com/bvaughn/react-window)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)

### 関連ドキュメント

- `PERFORMANCE_OPTIMIZATION.md` - 基本的なパフォーマンス最適化
- `REALTIME_TROUBLESHOOTING.md` - リアルタイム機能のトラブルシューティング

### 学習リソース

- [Web.dev - Fast load times](https://web.dev/fast/)
- [Vercel - SWR Examples](https://swr.vercel.app/examples)

---

## まとめ

### 実装の優先順位

```
1位: SWR導入
     - 最も効果的
     - 実装が簡単
     - すぐに体感できる

2位: 仮想スクロール
     - 大量データでの効果大
     - 実装は少し複雑

3位: 楽観的更新改善
     - UX向上
     - ユーザー満足度アップ

4位: ローカルストレージ
     - リロード後も高速
     - 実装は中程度

5位: 事前読み込み
     - 体感速度向上
     - 実装は簡単
```

### 最終目標

**LINE級の超高速チャットアプリを実現する！**

すべての施策を実装することで、LINEと同等の体感速度を実現できます。

---

最終更新日: 2025-11-09
