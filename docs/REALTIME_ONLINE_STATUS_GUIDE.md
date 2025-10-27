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
- ログイン時に自動的にオンライン状態に更新
- ログアウト時にオフライン状態に更新
- 最終ログイン時刻の記録と表示
- WebSocketによる即座の状態更新（1秒以内に反映）

### ユーザーから見た動作

```
1. ユーザーAがログイン
   → データベースに「オンライン」として記録
   → Supabase Presenceに参加

2. ユーザーBがDM画面を開く
   → ユーザーAのアイコンに緑色の点が表示される
   → 「オンライン」と表示される

3. ユーザーAがログアウト
   → 即座にユーザーBの画面で灰色の点に変わる
   → 「最終ログイン: ○分前」と表示される
```

---

## 使用技術

### 1. Supabase Presence（WebSocket）

**役割**: リアルタイムでユーザーの接続状態を追跡

**仕組み**:
```
ユーザーがログイン
  ↓
WebSocketでSupabase Presenceチャンネルに接続
  ↓
自分の存在（Presence）を他のユーザーに通知
  ↓
他のユーザーの画面に「オンライン」表示
  ↓
ログアウト or ブラウザを閉じる
  ↓
WebSocket切断 → 他のユーザーに「オフライン」通知
```

**なぜPresenceが必要？**
- データベースだけでは「今この瞬間にオンラインか」が分からない
- ユーザーがブラウザを閉じた時、データベースを更新できない
- Presenceは自動的に接続状態を検知してくれる

### 2. PostgreSQL（データベース）

**役割**: オンライン状態と最終ログイン時刻を永続的に保存

**Presenceとの使い分け**:
| 項目 | Presence | データベース |
|------|----------|--------------|
| 更新頻度 | リアルタイム（1秒以内） | ログイン/ログアウト時のみ |
| 保存期間 | 接続中のみ | 永続的 |
| 用途 | 「今オンラインか」の判定 | 「最終ログイン時刻」の記録 |

---

## 実装の全体像

### システムフロー図

```
[ログイン処理]
  ↓
1. Supabase Auth でログイン
  ↓
2. Prisma でデータベース更新
   - isOnline = true
   - lastSeen = 現在時刻
  ↓
3. ページ遷移（/workspace）
  ↓
4. usePresence フックが実行される
  ↓
5. Supabase Presence チャンネルに接続
  ↓
6. 自分のPresenceを送信
   { user_id: "xxx", online_at: "2025-10-26T..." }
  ↓
[他のユーザーが即座に「オンライン」を確認できる]


[ログアウト処理]
  ↓
1. API呼び出し（/api/user/update-online-status）
   - isOnline = false を送信
  ↓
2. Prisma でデータベース更新
   - isOnline = false
   - lastSeen = 現在時刻
  ↓
3. Supabase Auth でログアウト
  ↓
4. WebSocket接続が切断される
  ↓
5. Presenceから自動的に削除される
  ↓
[他のユーザーが即座に「オフライン」を確認できる]
```

---

## データベース設計

### Userテーブルに追加したフィールド

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  authId    String   @unique
  avatarUrl String?                       // プロフィール画像のURL

  // ↓↓↓ 新しく追加したフィールド ↓↓↓
  isOnline  Boolean  @default(false)      // オンライン状態
  lastSeen  DateTime @default(now())      // 最終ログイン時刻
  // ↑↑↑ 新しく追加したフィールド ↑↑↑

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
| `isOnline` | Boolean | false | ユーザーが現在オンラインかどうか |
| `lastSeen` | DateTime | 現在時刻 | 最後にログインした日時 |

### マイグレーション実行コマンド

```bash
npx prisma migrate dev --name add_online_status_fields
```

このコマンドを実行すると：
1. `prisma/migrations/` フォルダに新しいマイグレーションファイルが作成される
2. データベースに`isOnline`と`lastSeen`カラムが追加される
3. Prisma Clientが再生成され、TypeScript型定義が更新される

---

## 各ファイルの役割と実装

### 1. `src/hooks/usePresence.ts` - Presenceフック

**役割**: Supabase Presenceに接続し、オンラインユーザーを追跡するカスタムフック

**使い方**:
```typescript
// コンポーネント内で使用
const { isUserOnline } = usePresence({
  userId: user?.id || null,  // 現在ログインしているユーザーのID
  enabled: !!user,           // ログインしている場合のみ有効化
});

// 特定のユーザーがオンラインか確認
const isPartnerOnline = isUserOnline('相手のユーザーID');
```

**コード解説**:

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Presenceに保存するデータの型定義
interface PresenceState {
  user_id: string;      // ユーザーID
  online_at: string;    // オンラインになった日時
}

export function usePresence({
  userId,   // 自分のユーザーID
  enabled = true,  // フックを有効化するかどうか
}: {
  userId: string | null;
  enabled?: boolean;
}) {
  // オンラインユーザーのIDリスト
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  /**
   * 特定のユーザーがオンラインか判定する関数
   *
   * @param targetUserId - 確認したいユーザーのID
   * @returns true: オンライン, false: オフライン
   */
  const isUserOnline = useCallback(
    (targetUserId: string) => {
      return onlineUsers.includes(targetUserId);
    },
    [onlineUsers]  // onlineUsersが変更されたら関数を再生成
  );

  useEffect(() => {
    // ログインしていない場合は何もしない
    if (!enabled || !userId) return;

    // Supabaseクライアントを作成
    const supabase = createClient();

    /**
     * Presenceチャンネルの作成
     *
     * チャンネル名: 'online-users'（全ユーザー共通）
     * key: 自分のユーザーID（重複参加を防ぐ）
     */
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,  // このユーザーの一意なキー
        },
      },
    });

    presenceChannel
      /**
       * イベント: sync
       * タイミング: Presenceの状態が変化した時（誰かが参加/退出した時）
       *
       * 処理内容:
       * 1. 現在のPresence状態を取得
       * 2. 全ユーザーIDを抽出
       * 3. 重複を削除してonlineUsersに保存
       */
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceState>();

        // state の構造例:
        // {
        //   "user-123": [{ user_id: "user-123", online_at: "2025-10-26..." }],
        //   "user-456": [{ user_id: "user-456", online_at: "2025-10-26..." }]
        // }

        const users = Object.keys(state).flatMap((key) => {
          const presences = state[key];
          return presences.map((p) => p.user_id);
        });

        // 重複を削除
        const uniqueUsers = Array.from(new Set(users));
        setOnlineUsers(uniqueUsers);
      })

      /**
       * イベント: join
       * タイミング: 新しいユーザーがオンラインになった時
       */
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('✅ ユーザーがオンラインになりました:', newPresences);
      })

      /**
       * イベント: leave
       * タイミング: ユーザーがオフラインになった時
       */
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('👋 ユーザーがオフラインになりました:', leftPresences);
      })

      /**
       * チャンネルに接続してPresenceを送信
       */
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 自分のPresenceを送信
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    /**
     * クリーンアップ関数
     * コンポーネントがアンマウントされた時に実行
     */
    return () => {
      presenceChannel.unsubscribe();  // チャンネルから退出
      supabase.removeChannel(presenceChannel);  // チャンネルを削除
    };
  }, [userId, enabled]);

  return { onlineUsers, isUserOnline };
}
```

**重要なポイント**:

1. **useCallbackの使用**
   ```typescript
   const isUserOnline = useCallback((targetUserId: string) => {
     return onlineUsers.includes(targetUserId);
   }, [onlineUsers]);
   ```
   - `useCallback`を使わないと、毎回新しい関数が生成される
   - 依存配列に`onlineUsers`を指定することで、必要な時だけ再生成

2. **クリーンアップの重要性**
   ```typescript
   return () => {
     presenceChannel.unsubscribe();
     supabase.removeChannel(presenceChannel);
   };
   ```
   - これがないとメモリリークが発生する
   - ページ遷移時に古い接続が残り続ける

---

### 2. `src/app/login/actions.ts` - ログイン時の処理

**役割**: ログイン成功時にデータベースのオンライン状態を更新

**追加したコード**:

```typescript
import { prisma } from '@/lib/prisma';

export async function signIn(data: SignInFormData) {
  // ... Supabaseでログイン処理 ...

  // ログイン成功時: オンライン状態を更新
  if (authData.user) {
    try {
      await prisma.user.update({
        where: { authId: authData.user.id },  // Supabase AuthのIDで検索
        data: {
          isOnline: true,           // オンライン状態にする
          lastSeen: new Date(),     // 最終ログイン時刻を現在時刻に更新
        },
      });
      console.log('✅ ユーザーのオンライン状態を更新しました:', authData.user.email);
    } catch (dbError) {
      console.error('❌ オンライン状態の更新に失敗しました:', dbError);
      // エラーが出てもログイン自体は成功させる
    }
  }

  return { success: true };
}
```

**なぜここで更新するのか？**
- ログイン直後にデータベースに記録することで、Presence接続前でも状態が保存される
- ログイン履歴として`lastSeen`を残せる

---

### 3. `src/app/signup/actions.ts` - サインアップ時の処理

**役割**: 新規ユーザー登録時にオンライン状態を設定

**追加したコード**:

```typescript
export async function signUp(data: SignUpFormData) {
  // ... Supabase Authでユーザー作成 ...

  // Prismaデータベースにユーザー情報を保存
  const newUser = await prisma.user.create({
    data: {
      authId: authData.user.id,
      name: data.name,
      email: data.email,
      isOnline: true,        // 登録直後はオンライン
      lastSeen: new Date(),  // 登録日時を記録
    },
  });

  return { success: true };
}
```

---

### 4. `src/app/api/user/update-online-status/route.ts` - ログアウトAPI

**役割**: ログアウト時にオンライン状態をfalseに更新

**新規作成したファイル**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * オンライン状態更新API（POST）
 *
 * 用途: ログアウト時にオンライン状態をfalseに更新
 *
 * リクエストボディ:
 * {
 *   "isOnline": false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Supabaseで認証状態を確認
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディから isOnline を取得
    const { isOnline } = await request.json();

    // データベースを更新
    await prisma.user.update({
      where: { authId: user.id },
      data: {
        isOnline: isOnline,      // true または false
        lastSeen: new Date(),    // 更新日時を記録
      },
    });

    console.log(`✅ オンライン状態を更新しました: ${user.email} → ${isOnline ? 'オンライン' : 'オフライン'}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ オンライン状態の更新に失敗しました:', error);
    return NextResponse.json(
      { success: false, error: 'オンライン状態の更新に失敗しました' },
      { status: 500 }
    );
  }
}
```

**なぜAPIが必要？**
- ログアウト処理は`useAuth`フック（クライアント側）で実行される
- クライアント側からPrismaに直接アクセスできない
- APIを経由することでサーバー側でデータベースを更新できる

---

### 5. `src/hooks/useAuth.ts` - ログアウト処理の修正

**役割**: ログアウト時にAPIを呼び出してオンライン状態を更新

**修正した部分**:

```typescript
const signOut = async () => {
  try {
    setAuthState(prev => ({ ...prev, loading: true }));

    // ログアウト前にオンライン状態をfalseに更新
    try {
      await fetch('/api/user/update-online-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: false }),
      });
      console.log('✅ オフライン状態に更新しました');
    } catch (updateError) {
      console.error('⚠️ オンライン状態の更新に失敗しましたが、ログアウトは続行します');
      // エラーが出てもログアウトは続行
    }

    // Supabase Authからログアウト
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    console.log('✅ ログアウトしました');
    router.push('/login');
  } catch (error: any) {
    console.error('❌ ログアウトエラー:', error);
    setAuthState(prev => ({
      ...prev,
      error: error.message || 'ログアウトに失敗しました',
    }));
  } finally {
    setAuthState(prev => ({ ...prev, loading: false }));
  }
};
```

**処理の順序が重要**:
1. API呼び出し（データベース更新）
2. Supabase Auth ログアウト（セッション削除）
3. ページ遷移

この順序を守ることで、ログアウト後もデータベースに状態が残ります。

---

### 6. `src/app/workspace/dm/[userId]/page.tsx` - DM画面での表示

**役割**: DM相手のオンライン状態をリアルタイムで表示

**修正した部分**:

```typescript
export default function DirectMessagePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  const [dmPartner, setDmPartner] = useState<User | null>(null);

  /**
   * Presenceフックで全オンラインユーザーを追跡
   */
  const { isUserOnline } = usePresence({
    userId: user?.id || null,  // 自分のユーザーID
    enabled: !!user,           // ログイン中のみ有効
  });

  useEffect(() => {
    // DM相手の情報を取得
    const initData = async () => {
      const dmResponse = await fetch(`/api/dm/${userId}?myUserId=${myUserId}`);
      const dmData = await dmResponse.json();

      if (dmData.success) {
        // DM相手の情報を設定（APIから取得した実データを使用）
        setDmPartner({
          ...dmData.dmChannel.partner,
          isOnline: dmData.dmChannel.partner.isOnline ?? false,
          lastSeen: dmData.dmChannel.partner.lastSeen
            ? new Date(dmData.dmChannel.partner.lastSeen)
            : undefined
        });
      }
    };

    initData();
  }, [userId, myUserId]);

  /**
   * Presenceからリアルタイムオンライン状態を取得
   *
   * 重要: userIdは相手のauthId（SupabaseのユーザーID）
   */
  const isPartnerOnlineNow = userId ? isUserOnline(userId) : false;

  /**
   * dmPartnerにリアルタイムオンライン状態を反映
   *
   * データベースの状態ではなく、Presenceの状態を優先
   */
  const dmPartnerWithPresence = {
    ...dmPartner,
    isOnline: isPartnerOnlineNow,  // リアルタイム状態で上書き
  };

  return (
    <div className="flex flex-col h-full">
      {/* DM専用ヘッダー（リアルタイムオンライン状態を反映） */}
      <DmHeader dmPartner={dmPartnerWithPresence} />

      {/* メッセージ表示・入力フォーム */}
      <MessageView messages={messages} myUserId={myUserId} />
      <MessageForm handleSendMessage={handleSendMessage} />
    </div>
  );
}
```

**なぜPresenceで上書きするのか？**
- データベースは「最後にログインした時の状態」
- Presenceは「今この瞬間の状態」
- リアルタイム性を重視するため、Presenceの値を優先

---

### 7. `src/components/dm/dmHeader.tsx` - DMヘッダーの表示

**役割**: ユーザーアバターとオンライン状態を表示

**修正した部分**:

```typescript
export default function DmHeader({ dmPartner }: DmHeaderProps) {
  /**
   * 最終ログイン時間のフォーマット
   *
   * 例:
   * - 3分前 → "数分前"
   * - 30分前 → "30分前"
   * - 5時間前 → "5時間前"
   * - 3日前 → "3日前"
   * - 1週間以上前 → "10月15日"
   */
  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return '';

    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 5) return '数分前';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    return lastSeen.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="border-b bg-background">
      <div className="h-16 flex items-center px-4">
        <div className="flex items-center gap-3">
          {/* ユーザーアバター */}
          <div className="relative">
            {dmPartner.avatarUrl ? (
              // アバター画像がある場合
              <img
                src={dmPartner.avatarUrl}
                alt={dmPartner.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              // アバター画像がない場合はイニシャル表示
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                {dmPartner.name.charAt(0)}
              </div>
            )}

            {/* オンライン状態インジケーター（緑色の点） */}
            {dmPartner.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            )}
          </div>

          {/* ユーザー詳細情報 */}
          <div className="flex flex-col">
            <h1 className="font-semibold text-lg">{dmPartner.name}</h1>
            <div className="flex items-center gap-2 text-sm">
              {/* オンライン状態インジケーター（小さな点） */}
              <div className={`w-2 h-2 rounded-full ${
                dmPartner.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} />

              {/* オンライン状態テキスト */}
              <span className="text-gray-600">
                {dmPartner.isOnline
                  ? 'オンライン'
                  : `最終ログイン: ${formatLastSeen(dmPartner.lastSeen)}`
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

**表示の切り替えロジック**:
```
dmPartner.isOnline が true の場合:
  → 緑色の点 + "オンライン"

dmPartner.isOnline が false の場合:
  → 灰色の点 + "最終ログイン: ○分前"
```

---

### 8. `src/app/api/dm/[partnerId]/route.ts` - DM API の修正

**役割**: DM相手の情報を取得する際にオンライン状態も返す

**修正した部分**:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  // ... ユーザー情報取得 ...

  // 相手のユーザー情報取得（オンライン状態も含む）
  const partner = await prisma.user.findFirst({
    where: { authId: partnerId },
    select: {
      id: true,
      name: true,
      email: true,
      authId: true,
      avatarUrl: true,      // アバター画像URL
      isOnline: true,       // オンライン状態
      lastSeen: true        // 最終ログイン時刻
    }
  });

  // ... DMチャンネル取得・作成 ...

  return NextResponse.json({
    success: true,
    dmChannel: {
      id: existingDmChannel.id,
      type: existingDmChannel.type,
      partner: partner  // オンライン状態を含むユーザー情報
    }
  });
}
```

---

## 動作の仕組み

### シーケンス図: ログイン時

```
[ユーザーA]           [ログイン画面]         [Supabase Auth]    [Prisma DB]      [Supabase Presence]
    |                      |                       |                  |                    |
    |--1. メール/PW入力--->|                       |                  |                    |
    |                      |---2. signIn()-------->|                  |                    |
    |                      |<--3. authData---------|                  |                    |
    |                      |                       |                  |                    |
    |                      |---4. prisma.user.update()-------------->|                    |
    |                      |          (isOnline=true, lastSeen=now)  |                    |
    |                      |<--5. 更新完了--------------------------------|                    |
    |                      |                       |                  |                    |
    |<-6. /workspaceへ遷移-|                       |                  |                    |
    |                      |                       |                  |                    |
    |---7. usePresence起動------------------------------------------>|                    |
    |                      |                       |                  |                    |
    |---8. presenceChannel.track()----------------------------------------------->|
    |          { user_id: "A", online_at: "..." }                                |
    |                      |                       |                  |                    |
    |<--9. SUBSCRIBED確認----------------------------------------------------------|


[ユーザーB（別タブ）]
    |
    |<--10. 'sync'イベント受信--------------------------------------------------------|
    |          onlineUsers = ["A"]
    |
    |---11. 画面更新: ユーザーAに緑色の点が表示される
```

### シーケンス図: ログアウト時

```
[ユーザーA]           [useAuth]          [API]            [Prisma DB]      [Supabase Presence]
    |                      |                 |                  |                    |
    |--1. ログアウトボタン-->|                 |                  |                    |
    |                      |                 |                  |                    |
    |                      |---2. fetch('/api/user/update-online-status')--->|         |
    |                      |          { isOnline: false }        |                    |
    |                      |                 |---3. prisma.user.update()-->|          |
    |                      |                 |   (isOnline=false)         |          |
    |                      |<--4. 更新完了----|<--------------------|          |
    |                      |                 |                  |                    |
    |                      |---5. supabase.auth.signOut()------------------------------->|
    |                      |                 |                  |         (WebSocket切断)
    |<--6. /loginへ遷移----|                 |                  |                    |


[ユーザーB（別タブ）]
    |
    |<--7. 'leave'イベント受信--------------------------------------------------------|
    |          onlineUsers = []
    |
    |---8. 画面更新: ユーザーAの点が灰色に変わる
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
| 1 | ウィンドウAでログイン | データベースの`isOnline`が`true`になる |
| 2 | ウィンドウBでDM画面を開く（ユーザーAとのDM） | ユーザーAのアイコンに緑色の点が表示される |
| 3 | ウィンドウAでログアウト | 1秒以内にウィンドウBで灰色の点に変わる |
| 4 | ウィンドウBの「オンライン」表示を確認 | 「最終ログイン: 数分前」と表示される |

### 2. ブラウザコンソールでの確認

**Chromeデベロッパーツール** → **Console** タブで以下のログを確認：

```
✅ ユーザーのオンライン状態を更新しました: user@example.com
✅ ユーザーがオンラインになりました: [{ user_id: "xxx", ... }]
👋 ユーザーがオフラインになりました: [{ user_id: "xxx", ... }]
```

### 3. データベースでの確認

**Prisma Studio** を開いて直接確認：

```bash
npx prisma studio
```

1. `User` テーブルを開く
2. 対象ユーザーの行を確認
3. `isOnline` と `lastSeen` の値を確認

**ログイン中**:
- `isOnline`: `true`
- `lastSeen`: 最近の日時

**ログアウト後**:
- `isOnline`: `false`
- `lastSeen`: ログアウトした日時

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
    "online_at": "2025-10-26T..."
  }
}
```

**受信データ（sync）**:
```json
{
  "event": "sync",
  "payload": {
    "user-123": [{ "user_id": "user-123", ... }]
  }
}
```

---

## トラブルシューティング

### 問題1: オンライン状態が更新されない

**症状**: ログインしてもオンライン表示にならない

**原因と解決策**:

| 原因 | 確認方法 | 解決策 |
|------|---------|--------|
| マイグレーションが実行されていない | Prisma Studioで`isOnline`列が存在するか確認 | `npx prisma migrate dev` を実行 |
| Presence接続に失敗している | コンソールに`SUBSCRIBED`ログがあるか確認 | Supabase URLとAnon Keyを確認 |
| usePresenceが無効化されている | `enabled: !!user`が正しいか確認 | ログイン状態を確認 |

### 問題2: リアルタイム更新が遅い

**症状**: ログアウトから5秒以上経ってから反映される

**原因**: WebSocketの再接続遅延

**解決策**:
1. ブラウザのキャッシュをクリア
2. 開発サーバーを再起動
3. Supabaseダッシュボードで接続数を確認

### 問題3: 「メンバーでないユーザー」エラー

**症状**: DMで相手のメッセージが表示されない

**原因**: DM APIが正しいユーザーIDを返していない

**確認方法**:
```bash
node scripts/check-dm-data.mjs
```

**解決策**:
1. DM APIのレスポンスを確認
2. `partner.authId`が正しいか確認
3. 必要に応じてデータベースをクリーンアップ

### 問題4: ログアウト時にエラーが出る

**症状**: `Failed to fetch /api/user/update-online-status`

**原因**: API認証エラー

**解決策**:
```typescript
// useAuth.ts で try-catch を確認
try {
  await fetch('/api/user/update-online-status', { ... });
} catch (updateError) {
  console.error('⚠️ オンライン状態の更新に失敗');
  // エラーが出てもログアウトは続行
}
```

---

## まとめ

### 実装のポイント

1. **データベース（永続化）** と **Presence（リアルタイム）** の組み合わせ
   - データベース: 最終ログイン時刻の記録
   - Presence: 今この瞬間のオンライン状態

2. **クリーンアップの徹底**
   - `useEffect`の`return`で必ず`unsubscribe`
   - メモリリークを防ぐ

3. **エラーハンドリング**
   - APIエラーが出てもログイン/ログアウトは続行
   - ユーザー体験を損なわない

4. **型安全性**
   - TypeScriptの型定義を活用
   - Prismaが自動生成する型を使用

### 学んだこと

- Supabase Presenceの仕組み
- WebSocketのイベント処理
- React hooksの正しい使い方（useCallback, useEffect）
- データベースとリアルタイム機能の連携

### 次のステップ

さらに機能を拡張する場合：

1. **グループチャットでのオンライン表示**
   - チャンネルメンバー全員の状態を表示

2. **通知機能**
   - 相手がオンラインになったら通知

3. **オフライン時の未読表示**
   - 最終ログイン以降のメッセージ数を表示

---

## 参考資料

- [Supabase Presence 公式ドキュメント](https://supabase.com/docs/guides/realtime/presence)
- [Prisma Client API リファレンス](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [React Hooks ガイド](https://react.dev/reference/react)

---

**作成日**: 2025年10月26日
**バージョン**: 1.0
**対象プロジェクト**: リアルタイムチャットアプリ（卒業制作）
