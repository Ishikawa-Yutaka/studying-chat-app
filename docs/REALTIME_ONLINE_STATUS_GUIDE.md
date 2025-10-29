# リアルタイムオンライン状態表示機能 - 実装ガイド

このドキュメントは、Supabase Presenceを使ったリアルタイムオンライン状態表示機能の実装について、初心者向けに解説します。

## 目次

1. [機能の概要](#機能の概要)
2. [使用技術](#使用技術)
3. [実装の全体像](#実装の全体像)
4. [データベース設計](#データベース設計)
5. [各ファイルの役割と実装](#各ファイルの役割と実装)
6. [動作の仕組み](#動作の仕組み)
7. [テスト方法](#テスト方法)
8. [トラブルシューティング](#トラブルシューティング)

---

## 機能の概要

### 実装した機能

- ユーザーのオンライン/オフライン状態をリアルタイムで表示
- タブを開いている間は自動的にオンライン状態
- タブを閉じると自動的にオフライン状態に
- 最終アクティブ時刻の表示（「5分前にアクティブ」）
- WebSocketによる即座の状態更新（1秒以内に反映）

### ユーザーから見た動作

```
1. ユーザーAがワークスペースを開く
   → Supabase Presenceに自動参加
   → 他のユーザーに「オンライン」として見える

2. ユーザーBがDM画面を開く
   → ユーザーAのアイコンに緑色の点が表示される
   → 「アクティブ」と表示される

3. ユーザーAがタブを閉じる or ログアウト
   → 即座にユーザーBの画面で灰色の点に変わる
   → 「5分前にアクティブ」と表示される
```

---

## 使用技術

### 1. Supabase Presence（WebSocket）

**役割**: リアルタイムでユーザーの接続状態を追跡

**仕組み**:
```
ユーザーがワークスペースを開く
  ↓
WebSocketでSupabase Presenceチャンネルに接続
  ↓
自分の存在（Presence）を他のユーザーに通知
  ↓
他のユーザーの画面に「アクティブ」表示
  ↓
タブを閉じる or ログアウト
  ↓
WebSocket切断 → 他のユーザーに「オフライン」通知
  ↓
lastSeenがローカルで更新される
```

**なぜPresenceが必要？**
- ユーザーがブラウザを閉じた時、データベースを更新できない
- Presenceは自動的に接続状態を検知してくれる
- データベースポーリングよりも低レイテンシ（1秒以内）

### 2. PostgreSQL（データベース）

**役割**: 最終アクティブ時刻を永続的に保存

**Presenceとの使い分け**:
| 項目 | Presence | データベース |
|------|----------|--------------|
| 更新頻度 | リアルタイム（1秒以内） | ログイン時のみ |
| 保存期間 | 接続中のみ | 永続的 |
| 用途 | 「今オンラインか」の判定 | 「最終アクティブ時刻」の記録 |

---

## 実装の全体像

### アーキテクチャの原則

**重要な設計判断**: データベースからオンライン状態（`isOnline`）フィールドを削除し、**Presenceのみ**でオンライン判定を行う。

**理由**:
1. データベースは「最後に更新された状態」しか保持できない
2. ユーザーがブラウザを閉じた時、データベース更新が間に合わない
3. Presenceは接続が切れた瞬間に自動で検知できる

### システムフロー図

```
[ワークスペース表示]
  ↓
1. useAuth でログイン状態確認
  ↓
2. layout.tsx で usePresence 実行
  ↓
3. Supabase Presence チャンネル 'online-users' に接続
  ↓
4. 自分のPresenceを送信
   { user_id: "authId", online_at: "2025-10-29T..." }
  ↓
5. 他のユーザーのPresence状態を受信
  ↓
6. isUserOnline 関数で任意のユーザーのオンライン状態を確認可能
  ↓
[DirectMessageList や DMページで表示]


[タブを閉じた時]
  ↓
1. WebSocket接続が切断される
  ↓
2. Presenceから自動的に削除される
  ↓
3. 'leave' イベントが発火
  ↓
4. DirectMessageList が leave イベントを検知
  ↓
5. ローカル状態の lastSeen を現在時刻に更新
  ↓
6. データベースには次回ログイン時に反映
  ↓
[他のユーザーが即座に「オフライン」を確認できる]
```

---

## データベース設計

### Userテーブルの構造

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  authId    String   @unique
  avatarUrl String?                       // プロフィール画像のURL

  // オンライン状態管理
  lastSeen  DateTime @default(now())      // 最終アクティブ時刻（Presenceのleaveイベントで更新）

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages        Message[]
  channels        ChannelMember[]
  createdChannels Channel[]
}
```

### フィールドの役割

| フィールド名 | 型 | デフォルト値 | 説明 |
|------------|----|-----------|----|
| `lastSeen` | DateTime | 現在時刻 | 最後にアクティブだった日時 |

**重要**: `isOnline` フィールドは**削除しました**。Presenceのみでオンライン判定を行います。

### マイグレーション履歴

```bash
# isOnlineフィールドを削除
npx prisma migrate dev --name remove_isOnline
```

実行内容:
1. `isOnline` カラムをデータベースから削除
2. Prisma Clientを再生成
3. TypeScript型定義を更新

---

## 各ファイルの役割と実装

### 1. `src/hooks/usePresence.ts` - Presenceフック

**役割**: Supabase Presenceに接続し、オンラインユーザーを追跡するカスタムフック

**使い方**:
```typescript
// layout.tsx（親コンポーネント）で使用
const { isUserOnline } = usePresence({
  userId: user?.id || null,  // 現在ログインしているユーザーのauthId
  enabled: isAuthenticated,  // ログインしている場合のみ有効化
});

// 子コンポーネントにisUserOnline関数を渡す
<DirectMessageList isUserOnline={isUserOnline} ... />
```

**重要なポイント**:

1. **グローバルチャンネル 'online-users'**
   ```typescript
   const presenceChannel = supabase.channel('online-users', {
     config: {
       presence: {
         key: userId,  // authId をキーとして使用
       },
     },
   });
   ```
   - すべてのユーザーが同じチャンネルに参加
   - `key`に`authId`を指定することで、同じユーザーの重複参加を防ぐ

2. **イベントハンドラー**
   ```typescript
   .on('presence', { event: 'sync' }, () => {
     const state = presenceChannel.presenceState<PresenceState>();
     const users = Object.keys(state).flatMap((key) => {
       const presences = state[key];
       return presences.map((p) => p.user_id);
     });
     const uniqueUsers = Array.from(new Set(users));
     setOnlineUsers(uniqueUsers);
   })
   ```
   - `sync`: Presence状態が変化した時（join/leave）
   - オンラインユーザーのIDリストを更新

3. **クリーンアップの重要性**
   ```typescript
   return () => {
     presenceChannel.unsubscribe();
     supabase.removeChannel(presenceChannel);
   };
   ```
   - ページ遷移時に必ず実行
   - メモリリークを防ぐ

---

### 2. `src/app/workspace/layout.tsx` - Presenceの一元管理

**役割**: ワークスペース全体でPresenceを管理し、子コンポーネントに状態を渡す

**実装の要点**:

```typescript
export default function WorkspaceLayout({ children }) {
  const { user, isAuthenticated } = useAuth();

  // Presenceでリアルタイムオンライン状態を追跡
  const { isUserOnline } = usePresence({
    userId: user?.id || null,
    enabled: isAuthenticated,
  });

  // オンライン状態をデータベースに同期
  useOnlineStatusSync({ enabled: isAuthenticated });

  return (
    <div>
      <aside>
        {/* DirectMessageListにisUserOnline関数を渡す */}
        <DirectMessageList
          directMessages={directMessages}
          isUserOnline={isUserOnline}  // ← ここで渡す
          ...
        />
      </aside>
      <main>{children}</main>
    </div>
  );
}
```

**なぜlayout.tsxで管理するのか？**
- 1つのPresenceチャンネルで全体を管理
- 複数のコンポーネントで同じPresence接続を共有
- パフォーマンスが向上（接続数を最小化）

---

### 3. `src/components/workspace/directMessageList.tsx` - DM一覧での表示

**役割**: サイドバーにDM一覧を表示し、リアルタイムでオンライン状態を反映

**実装の要点**:

```typescript
interface DirectMessageListProps {
  directMessages: DirectMessage[];
  isUserOnline: (userId: string) => boolean;  // layout.tsxから受け取る
  ...
}

export default function DirectMessageList({
  directMessages,
  isUserOnline,  // ← propsで受け取る
  ...
}: DirectMessageListProps) {
  // ローカル状態でDM一覧を保持（lastSeenをリアルタイム更新するため）
  const [localDirectMessages, setLocalDirectMessages] = useState(directMessages);

  // Presence leaveイベントをリッスンしてlastSeenを更新
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('dm-list-online-users');

    channel
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          const offlineUserId = presence.user_id;

          // ローカル状態のlastSeenを更新
          setLocalDirectMessages((prev) =>
            prev.map((dm) =>
              dm.partnerId === offlineUserId
                ? { ...dm, lastSeen: new Date() }
                : dm
            )
          );
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      {localDirectMessages.map((dm) => {
        // Presenceでリアルタイムオンライン状態を取得
        const isOnline = isUserOnline(dm.partnerId);

        return (
          <div key={dm.id}>
            <UserAvatar isOnline={isOnline} ... />
            <div>
              <span>{dm.partnerName}</span>
              {/* オフライン時のみlastSeenを表示 */}
              {!isOnline && dm.lastSeen && (
                <span>{formatRelativeTime(dm.lastSeen)}にアクティブ</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**重要なポイント**:

1. **ローカルステートが必要な理由**
   - PresenceのleaveイベントでlastSeenをリアルタイム更新するため
   - データベースに保存するのは次回ログイン時

2. **isUserOnlineをpropsで受け取る**
   - layout.tsxのusePresenceの結果を再利用
   - 重複したPresence接続を避ける

---

### 4. `src/hooks/useOnlineStatusSync.ts` - データベース同期

**役割**: タブを閉じた時、ページ遷移時にlastSeenをデータベースに保存

**実装**:

```typescript
export function useOnlineStatusSync({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    // beforeunload: タブを閉じる時
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/user/update-online-status',
        JSON.stringify({}));
    };

    // visibilitychange: 別のタブに移動した時
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        navigator.sendBeacon('/api/user/update-online-status',
          JSON.stringify({}));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);
}
```

**sendBeaconを使う理由**:
- 通常の`fetch`はページ遷移時にキャンセルされる
- `sendBeacon`は確実にリクエストを送信できる

---

### 5. `src/app/api/user/update-online-status/route.ts` - lastSeen更新API

**役割**: lastSeenを現在時刻に更新（isOnlineフィールドは削除済み）

**実装**:

```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // lastSeenのみ更新（isOnlineは削除済み）
    await prisma.user.update({
      where: { authId: user.id },
      data: {
        lastSeen: new Date(),
      },
    });

    console.log(`✅ 最終アクティブ時刻を更新しました: ${user.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ 最終アクティブ時刻の更新に失敗しました:', error);
    return NextResponse.json(
      { success: false, error: '更新に失敗しました' },
      { status: 500 }
    );
  }
}
```

**変更点**:
- `isOnline`フィールドの更新を削除
- `lastSeen`のみ更新

---

### 6. `src/app/workspace/dm/[userId]/page.tsx` - DMページでの表示

**役割**: DM相手のオンライン状態をリアルタイムで表示

**実装の要点**:

```typescript
export default function DirectMessagePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  const [dmPartner, setDmPartner] = useState<User | null>(null);

  // Presenceフックで全オンラインユーザーを追跡
  const { isUserOnline } = usePresence({
    userId: user?.id || null,
    enabled: !!user,
  });

  useEffect(() => {
    // DM相手の情報を取得
    const initData = async () => {
      const dmResponse = await fetch(`/api/dm/${userId}?myUserId=${myUserId}`);
      const dmData = await dmResponse.json();

      if (dmData.success) {
        setDmPartner({
          ...dmData.dmChannel.partner,
          lastSeen: dmData.dmChannel.partner.lastSeen
            ? new Date(dmData.dmChannel.partner.lastSeen)
            : undefined
        });
      }
    };

    initData();
  }, [userId, myUserId]);

  // Presenceからリアルタイムオンライン状態を取得
  const isPartnerOnline = userId ? isUserOnline(userId) : false;

  // dmPartnerにリアルタイムオンライン状態を反映
  const dmPartnerWithPresence = {
    ...dmPartner,
    isOnline: isPartnerOnline,
  };

  return (
    <div>
      <DmHeader dmPartner={dmPartnerWithPresence} />
      <MessageView messages={messages} />
      <MessageForm handleSendMessage={handleSendMessage} />
    </div>
  );
}
```

**なぜPresenceで上書きするのか？**
- データベースは「最後に記録された時刻」
- Presenceは「今この瞬間の状態」
- リアルタイム性を重視するため、Presenceの値を優先

---

### 7. `src/components/dm/dmHeader.tsx` - DMヘッダーの表示

**役割**: ユーザーアバターとオンライン状態を表示

**実装**:

```typescript
export default function DmHeader({ dmPartner }: DmHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="h-16 flex items-center px-4">
        <div className="flex items-center gap-3">
          {/* ユーザーアバター */}
          <UserAvatar
            name={dmPartner.name}
            avatarUrl={dmPartner.avatarUrl}
            size="md"
            showOnlineStatus={true}
            isOnline={dmPartner.isOnline}
          />

          {/* ユーザー詳細情報 */}
          <div className="flex flex-col">
            <h1 className="font-semibold text-lg">{dmPartner.name}</h1>
            <div className="flex items-center gap-2 text-sm">
              {/* オンライン状態インジケーター */}
              <div className={`w-2 h-2 rounded-full ${
                dmPartner.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} />

              {/* オンライン状態テキスト */}
              <span className="text-gray-600">
                {dmPartner.isOnline
                  ? 'アクティブ'
                  : `${formatRelativeTime(dmPartner.lastSeen)}にアクティブ`
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
```

**表示例**:
- オンライン時: 緑色の点 + "アクティブ"
- オフライン時: 灰色の点 + "5分前にアクティブ"

---

### 8. `src/lib/utils.ts` - 時間フォーマット関数

**役割**: 最終アクティブ時刻を人間が読みやすい形式に変換

**実装**:

```typescript
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return '';

  const diffMs = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}
```

**表示例**:
- `たった今` → 1分未満
- `5分前` → 5分前
- `3時間前` → 3時間前
- `2日前` → 2日前
- `2025/10/15` → 7日以上前

---

## 動作の仕組み

### シーケンス図: ワークスペース表示時

```
[ユーザーA]        [layout.tsx]      [usePresence]    [Supabase Presence]
    |                    |                  |                    |
    |--1. /workspaceへ-->|                  |                    |
    |                    |                  |                    |
    |                    |---2. usePresence起動-->|              |
    |                    |   (userId: A)    |                    |
    |                    |                  |                    |
    |                    |                  |---3. チャンネル接続->|
    |                    |                  |   'online-users'   |
    |                    |                  |                    |
    |                    |                  |---4. track()------->|
    |                    |                  |   { user_id: A }   |
    |                    |                  |                    |
    |                    |                  |<--5. SUBSCRIBED-----|
    |                    |                  |                    |
    |                    |<--6. onlineUsers = [A]----------------|


[ユーザーB（別タブ）]
    |
    |<--7. 'sync'イベント受信------------------------------------|
    |          onlineUsers = [A, B]
    |
    |---8. 画面更新: ユーザーAに緑色の点が表示される
```

### シーケンス図: タブを閉じた時

```
[ユーザーA]        [useOnlineStatusSync]    [API]         [Prisma DB]    [Presence]
    |                        |                 |                |              |
    |--1. タブを閉じる-------->|                 |                |              |
    |                        |                 |                |              |
    |                        |---2. sendBeacon('/api/user/update-online-status')->|
    |                        |                 |---3. update()-->|              |
    |                        |                 |   (lastSeen)   |              |
    |                        |                 |                |              |
    |                        |                 |                | (WebSocket切断)
    |                        |                 |                |              |


[DirectMessageList（ユーザーB）]
    |
    |<--4. 'leave'イベント受信------------------------------------------------|
    |          { user_id: A }
    |
    |---5. ローカル状態更新
    |      localDirectMessages[A].lastSeen = new Date()
    |
    |---6. 画面更新: ユーザーAの点が灰色に、「5分前にアクティブ」表示
```

---

## テスト方法

### 1. 基本動作テスト

**準備**:
1. 開発サーバーを起動
   ```bash
   npm run dev
   ```

2. ブラウザを2つのウィンドウで開く
   - ウィンドウA: ユーザーA（例: ishikawa yutaka）でログイン
   - ウィンドウB: ユーザーB（例: 佐藤花子）でログイン

**テスト手順**:

| 手順 | 操作 | 期待される結果 |
|-----|------|--------------|
| 1 | ウィンドウAでログイン | ユーザーBの画面でユーザーAに緑色の点が表示される |
| 2 | ウィンドウBでDM画面を開く（ユーザーAとのDM） | 「アクティブ」と表示される |
| 3 | ウィンドウAのタブを閉じる | 1秒以内にウィンドウBで灰色の点に変わる |
| 4 | オフライン表示を確認 | 「たった今にアクティブ」→「5分前にアクティブ」と変化する |

### 2. ブラウザコンソールでの確認

**Chromeデベロッパーツール** → **Console** タブで以下のログを確認：

```
✅ Presenceチャンネルに参加しました: 240ddd9e-...
📡 オンラインユーザー更新: ['240ddd9e-...', '5797a21b-...']
✅ ユーザーがオンラインになりました: [{ user_id: '...', ... }]
👋 ユーザーがオフラインになりました: [{ user_id: '...', ... }]
👋 DM一覧: ユーザーがオフライン - 5797a21b-...
```

### 3. データベースでの確認

**Prisma Studio** を開いて直接確認：

```bash
npx prisma studio
```

1. `User` テーブルを開く
2. 対象ユーザーの行を確認
3. `lastSeen` の値を確認（`isOnline`フィールドは削除済み）

**タブを閉じた後**:
- `lastSeen`: タブを閉じた日時に更新される

### 4. ネットワークタブでの確認

**Chromeデベロッパーツール** → **Network** タブ → **WS（WebSocket）**

1. `realtime` で検索
2. WebSocket接続を選択
3. **Messages** タブで送受信データを確認

**送信データ（track）**:
```json
{
  "event": "track",
  "payload": {
    "user_id": "5797a21b-...",
    "online_at": "2025-10-29T..."
  }
}
```

**受信データ（sync）**:
```json
{
  "event": "sync",
  "payload": {
    "240ddd9e-...": [{
      "user_id": "240ddd9e-...",
      "online_at": "2025-10-29T..."
    }]
  }
}
```

**受信データ（leave）**:
```json
{
  "event": "leave",
  "leftPresences": [{
    "user_id": "5797a21b-..."
  }]
}
```

---

## トラブルシューティング

### 問題1: オンライン状態が表示されない

**症状**: ログインしてもオンライン表示にならない

**原因と解決策**:

| 原因 | 確認方法 | 解決策 |
|------|---------|--------|
| Presenceチャンネルに接続していない | コンソールに`SUBSCRIBED`ログがあるか確認 | Supabase URLとAnon Keyを確認 |
| usePresenceが無効化されている | `enabled: isAuthenticated`が正しいか確認 | ログイン状態を確認 |
| authIdが一致していない | Presenceの`user_id`とDMの`partnerId`が一致するか確認 | APIレスポンスを確認 |

### 問題2: サイドバーとDMページでオンライン状態が異なる

**症状**: DMページではオンラインだがサイドバーではオフライン

**原因**: DirectMessageListがlayout.tsxの`isUserOnline`を受け取っていない

**解決策**:
```typescript
// layout.tsx
const { isUserOnline } = usePresence({ ... });

// DirectMessageListに渡す
<DirectMessageList isUserOnline={isUserOnline} ... />
```

### 問題3: リアルタイム更新が遅い

**症状**: タブを閉じてから5秒以上経ってから反映される

**原因**: WebSocketの再接続遅延

**解決策**:
1. ブラウザのキャッシュをクリア
2. 開発サーバーを再起動
3. Supabaseダッシュボードで接続数を確認

### 問題4: 「前前にアクティブ」と表示される

**症状**: 「5分前前にアクティブ」のように「前」が重複

**原因**: `formatRelativeTime`が既に「前」を含むのに、さらに追加している

**解決策**:
```typescript
// ❌ Bad
`${formatRelativeTime(dm.lastSeen)}前にアクティブ`

// ✅ Good
`${formatRelativeTime(dm.lastSeen)}にアクティブ`
```

---

## まとめ

### 実装のポイント

1. **Presenceのみでオンライン判定**
   - データベースの`isOnline`フィールドは削除
   - リアルタイム性と正確性を向上

2. **Presenceの一元管理**
   - layout.tsxで1つのusePresenceを実行
   - 子コンポーネントにisUserOnline関数を渡す

3. **ローカル状態でlastSeen更新**
   - Presenceのleaveイベントで即座に反映
   - データベースは次回ログイン時に同期

4. **sendBeaconで確実な送信**
   - タブを閉じた時も確実にAPIリクエスト
   - 通常のfetchよりも信頼性が高い

### 学んだこと

- Supabase Presenceの仕組みと使い方
- WebSocketのイベント処理（sync, join, leave）
- React hooksの正しい使い方（useCallback, useEffect）
- Presenceとデータベースの適切な使い分け

### 次のステップ

さらに機能を拡張する場合：

1. **グループチャットでのオンライン表示**
   - チャンネルメンバー全員の状態を表示

2. **通知機能**
   - 相手がオンラインになったら通知

3. **タイピングインジケーター**
   - 相手が入力中であることを表示

---

## 参考資料

- [Supabase Presence 公式ドキュメント](https://supabase.com/docs/guides/realtime/presence)
- [Prisma Client API リファレンス](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [React Hooks ガイド](https://react.dev/reference/react)
- [Navigator.sendBeacon() - MDN](https://developer.mozilla.org/ja/docs/Web/API/Navigator/sendBeacon)

---

**作成日**: 2025年10月29日
**バージョン**: 2.0（Presenceのみ版）
**対象プロジェクト**: リアルタイムチャットアプリ（卒業制作）
