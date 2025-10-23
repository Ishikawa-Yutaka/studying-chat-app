# コンテキスト引き継ぎ: チャンネル作成者のみ削除可能機能の実装

**日付**: 2025-10-23
**セッション**: チャンネル削除権限の実装

---

## 実装した機能

### 概要
チャンネルを削除できる権限を「チャンネル作成者のみ」に制限しました。

### 主な変更点
1. データベーススキーマに`creatorId`フィールドを追加
2. チャンネル作成時に作成者IDを保存
3. サイドバーで作成者のみに削除ボタンを表示
4. API側で作成者のみが削除できるように権限チェックを追加

---

## 変更ファイル一覧

### 1. データベース関連

#### `prisma/schema.prisma`
**変更内容**:
- `Channel`モデルに`creatorId`フィールドを追加
- `User`モデルに`createdChannels`リレーションを追加

```prisma
model User {
  createdChannels Channel[] @relation("ChannelCreator")  // 追加
}

model Channel {
  creatorId String?  // 追加（nullを許可）
  creator   User?    @relation("ChannelCreator", fields: [creatorId], references: [id], onDelete: SetNull)  // 追加
}
```

**重要なポイント**:
- `creatorId`は`String?`（nullable）
  - 理由1: DMの場合は作成者が不要
  - 理由2: ユーザーが削除された時に`null`になる（`onDelete: SetNull`）
  - 理由3: マイグレーション前の既存チャンネルは`null`

**マイグレーション**:
```bash
npx prisma migrate dev --name add_channel_creator
```
- 実行日時: 2025-10-23
- マイグレーションファイル: `prisma/migrations/20251023005752_add_channel_creator/`

---

### 2. API修正

#### `src/app/api/channels/route.ts`

**POST（チャンネル作成）の変更**:
```typescript
// 作成時にcreatorIdを保存
const newChannel = await prisma.channel.create({
  data: {
    name: name.trim(),
    description: description?.trim() || null,
    type: 'channel',
    creatorId: user.id,  // ← 追加
    members: {
      create: { userId: user.id }
    }
  },
  // ...
});
```

**GET（チャンネル一覧取得）の変更**:
```typescript
channel: {
  select: {
    id: true,
    name: true,
    description: true,
    type: true,
    creatorId: true,  // ← 追加
    members: { ... }
  }
}

// レスポンスに追加
channels.push({
  id: channel.id,
  name: channel.name,
  description: channel.description,
  memberCount: channel.members.length,
  creatorId: channel.creatorId  // ← 追加
});
```

---

#### `src/app/api/channels/all/route.ts`

**変更内容**: 全チャンネル取得時もcreatorIdを返す

```typescript
select: {
  id: true,
  name: true,
  description: true,
  creatorId: true,  // ← 追加
  createdAt: true,
  members: { ... }
}

// レスポンスに追加
const channelsWithJoinStatus = allChannels.map(channel => ({
  id: channel.id,
  name: channel.name,
  description: channel.description,
  memberCount: channel.members.length,
  creatorId: channel.creatorId,  // ← 追加
  isJoined: channel.members.some(member => member.userId === user.id),
  createdAt: channel.createdAt
}));
```

---

#### `src/app/api/channels/[channelId]/route.ts`（チャンネル削除API）

**重要な変更**: 作成者のみが削除できるように権限チェックを追加

**変更前**:
```typescript
// メンバーなら誰でも削除できた
const isMember = channel.members.some(member => member.user.authId === user.id);
if (!isMember) {
  return NextResponse.json({ error: '権限がありません' }, { status: 403 });
}
```

**変更後**:
```typescript
// 1. チャンネル情報取得（creatorIdを含む）
const channel = await prisma.channel.findUnique({
  where: { id: channelId },
  select: {
    id: true,
    name: true,
    type: true,
    creatorId: true  // 作成者IDを取得
  }
});

// 2. 作成者チェック
if (channel.creatorId !== user.id) {
  console.error('❌ 作成者ではありません - 作成者ID:', channel.creatorId, 'ユーザーID:', user.id);
  return NextResponse.json({
    success: false,
    error: 'チャンネルを削除する権限がありません。作成者のみが削除できます。'
  }, { status: 403 });
}

console.log(`🔑 作成者確認OK - ユーザー: ${user.name}, チャンネル: ${channel.name}`);

// 3. 削除実行
await prisma.channel.delete({ where: { id: channelId } });
```

**セキュリティ強化ポイント**:
- 認証チェック: `getCurrentUser()`で確実にログインユーザーを取得
- 作成者確認: `channel.creatorId === user.id`で厳密にチェック
- エラーメッセージ: 「作成者のみが削除できます」と明示
- ステータスコード: 403 Forbidden（権限なし）

**import変更**:
```typescript
// 変更前
import { createClient } from '@/lib/supabase/server';

// 変更後
import { getCurrentUser } from '@/lib/auth-server';
```

---

### 3. フロントエンド修正

#### `src/app/workspace/layout.tsx`

**型定義の変更**:
```typescript
const [channels, setChannels] = useState<Array<{
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  creatorId?: string | null;  // ← 追加
}>>([]);
```

**ChannelListに渡すprops**:
```typescript
<ChannelList
  channels={channels}
  pathname={pathname}
  currentUserId={currentUser?.id}  // ← 追加（作成者判定用）
  onChannelCreated={updateSidebarData}
  onChannelJoined={handleChannelJoined}
  onChannelLeft={handleChannelLeft}
/>
```

**重要**: モバイル版とデスクトップ版の両方に`currentUserId`を渡している
- モバイル: 174行目
- デスクトップ: 218行目

---

#### `src/components/workspace/channelList.tsx`

**インターフェース変更**:
```typescript
interface Channel {
  id: string;
  name: string;
  description?: string;
  creatorId?: string | null;  // ← 追加
}

interface ChannelListProps {
  channels: Channel[];
  pathname: string;
  currentUserId?: string;  // ← 追加（作成者判定用）
  onChannelCreated?: () => void;
  onChannelJoined?: (channel: { ... }) => void;
  onChannelLeft?: (channelId: string) => void;
}
```

**削除ボタンの条件付き表示**（最重要な変更）:
```typescript
{/* アクションボタンエリア */}
<div className="flex items-center gap-0.5">
  {/* 退出アイコン（全員に表示） */}
  <Button
    variant="ghost"
    size="icon"
    className="group/leave h-5 w-5 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setLeaveChannel(channel);
    }}
    title="チャンネルから退出"
  >
    <LogOut className="h-3.5 w-3.5 text-gray-400 group-hover/leave:text-orange-500 transition-colors" />
  </Button>

  {/* 削除アイコン（作成者のみ表示） */}
  {currentUserId && channel.creatorId === currentUserId && (
    <Button
      variant="ghost"
      size="icon"
      className="group/delete h-5 w-5 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSettingsChannel(channel);
      }}
      title="チャンネル設定"
    >
      <Trash2 className="h-3.5 w-3.5 text-gray-400 group-hover/delete:text-red-500 transition-colors" />
    </Button>
  )}
</div>
```

**条件式の解説**:
```typescript
currentUserId && channel.creatorId === currentUserId
```
1. `currentUserId`: ログイン中のユーザーIDが存在する
2. `channel.creatorId === currentUserId`: そのユーザーがチャンネルの作成者

→ **両方が真の場合のみ削除ボタンを表示**

---

### 4. 追加ドキュメント

#### `docs/PRISMA_RELATION_GUIDE.md`（新規作成）

**内容**: Prismaの`@relation`の使い方を初心者向けに解説

**主なトピック**:
1. リレーション（@relation）とは？
2. @relationの構文解説
   - リレーション名
   - fields: [creatorId]
   - references: [id]
   - onDelete: SetNull
3. onDeleteの選択肢（SetNull / Cascade / Restrict）
4. 完全なコード例
5. よくある質問（FAQ）

**教育目的**: 次回以降のリレーション実装時の参考資料

---

## 動作確認手順

### 1. 作成者としてのテスト

**手順**:
1. ブラウザで http://localhost:3000 を開く
2. ログインする
3. 新しいチャンネルを作成する（例: "テストチャンネル"）
4. サイドバーでそのチャンネルにホバーする

**期待される動作**:
- ✅ 退出アイコン（LogOut）が表示される
- ✅ **削除アイコン（Trash2）も表示される**（作成者なので）
- ✅ 削除ボタンをクリックすると削除確認ダイアログが表示
- ✅ 削除を実行すると成功する

### 2. 非作成者としてのテスト

**手順**:
1. 別のアカウントでログインする
2. 他のユーザーが作成したチャンネルを探す
3. そのチャンネルにホバーする

**期待される動作**:
- ✅ 退出アイコンが表示される
- ✅ **削除アイコンは表示されない**（作成者ではないので）

### 3. API権限チェックのテスト

開発者ツールで以下を実行:
```javascript
fetch('/api/channels/【他人が作成したチャンネルID】', { method: 'DELETE' })
  .then(res => res.json())
  .then(data => console.log(data));
```

**期待される動作**:
- ✅ エラー: `"チャンネルを削除する権限がありません。作成者のみが削除できます。"`
- ✅ ステータスコード: 403

### 4. 既存チャンネルの扱い

**注意**: マイグレーション前に作成されたチャンネルは`creatorId`が`null`

**期待される動作**:
- ✅ 既存チャンネルには削除ボタンが表示されない
- ✅ これは正常な動作（creatorIdがnullのため）

---

## 実装の全体像

### データフロー

```
[チャンネル作成]
1. ユーザーがチャンネルを作成
   ↓
2. POST /api/channels
   data: { name, description, creatorId: user.id }  ← 作成者IDを保存
   ↓
3. データベースに保存
   Channel { id, name, description, type: 'channel', creatorId: user.id }
   ↓
4. サイドバーに表示


[削除ボタンの表示判定]
1. GET /api/channels でチャンネル一覧取得
   → creatorId を含む
   ↓
2. layout.tsx でチャンネル情報を管理
   channels: [{ id, name, creatorId, ... }]
   ↓
3. ChannelList に currentUserId を渡す
   ↓
4. 各チャンネル項目で判定
   if (currentUserId && channel.creatorId === currentUserId) {
     削除ボタンを表示
   }


[削除実行]
1. ユーザーが削除ボタンをクリック
   ↓
2. 削除確認ダイアログ表示
   ↓
3. DELETE /api/channels/[channelId]
   ↓
4. API側で作成者チェック
   if (channel.creatorId !== user.id) {
     return 403 Forbidden
   }
   ↓
5. 削除実行（作成者のみ）
   await prisma.channel.delete({ where: { id: channelId } })
   ↓
6. サイドバーから削除
   window.dispatchEvent(new Event('channelDeleted'))
```

---

## セキュリティ考慮事項

### 二重チェック体制

1. **フロントエンド**: 削除ボタンを作成者のみに表示
   - ユーザー体験の向上
   - 不要なUIを隠す

2. **バックエンド**: API側で厳密に権限チェック
   - セキュリティの最後の砦
   - 直接APIを叩いても弾く

### なぜ二重チェックが必要？

**フロントエンドだけでは不十分**:
- ブラウザの開発者ツールで削除ボタンを強制表示できる
- 直接APIを呼び出すことができる
- JavaScriptは改ざん可能

**バックエンドチェックが必須**:
- サーバー側で必ず権限を確認
- データベースの作成者情報と照合
- 不正なリクエストを確実に弾く

### ステータスコードの使い分け

- **401 Unauthorized**: 認証されていない（ログインが必要）
- **403 Forbidden**: 認証されているが権限がない（作成者ではない）
- **404 Not Found**: チャンネルが存在しない

---

## 既知の制限事項

### 1. 既存チャンネルのcreatorIdがnull

**問題**:
- マイグレーション前に作成されたチャンネルは`creatorId`が`null`
- これらのチャンネルは誰も削除できない

**対処方法（オプション）**:
もし既存チャンネルに作成者を設定したい場合、以下のSQLを実行:

```sql
-- 例: すべての既存チャンネル（creatorIdがnull）の作成者を特定のユーザーに設定
UPDATE "Channel"
SET "creatorId" = '【管理者ユーザーのID】'
WHERE "creatorId" IS NULL AND "type" = 'channel';
```

**注意**: DMチャンネル（`type = 'dm'`）は`creatorId`が`null`のままにする

### 2. DMチャンネルは削除不可

**仕様**:
- DMチャンネルは削除できない（API側で400エラー）
- 退出機能を使用する

**理由**:
- DMは1対1の会話なので「削除」ではなく「退出」が適切
- 既存の退出APIが存在する: `/api/channels/leave/[channelId]`

---

## 次のステップ（未実装）

### 推奨される追加機能

1. **チャンネル編集機能（作成者のみ）**
   - チャンネル名・説明の変更
   - 作成者のみが編集できる

2. **作成者の譲渡機能**
   - 作成者が別のユーザーに権限を譲渡
   - `UPDATE Channel SET creatorId = newUserId WHERE id = channelId`

3. **管理者権限の追加**
   - `isAdmin`フィールドをUserテーブルに追加
   - 管理者は全チャンネルを削除できる

4. **削除のソフトデリート化**
   - 実際には削除せず、`deletedAt`フィールドを設定
   - データの復元が可能になる

---

## トラブルシューティング

### 問題: 削除ボタンが表示されない

**原因1**: `currentUserId`が渡されていない
```typescript
// layout.tsx で確認
<ChannelList currentUserId={currentUser?.id} ... />
```

**原因2**: `creatorId`がnull
- 既存チャンネルの場合は正常
- 新規作成チャンネルで発生する場合はAPI確認

**原因3**: TypeScript型エラー
```bash
# 型エラーをチェック
npm run build
```

### 問題: 削除APIが403エラーを返す

**確認事項**:
1. ログインしているユーザーIDを確認
   ```javascript
   // ブラウザのコンソールで
   fetch('/api/channels').then(r => r.json()).then(d => console.log(d.currentUser))
   ```

2. チャンネルの作成者IDを確認
   ```javascript
   fetch('/api/channels').then(r => r.json()).then(d => console.log(d.channels))
   ```

3. IDが一致しているか確認
   ```
   currentUser.id === channel.creatorId
   ```

### 問題: マイグレーションエラー

```bash
# Prisma Clientを再生成
npx prisma generate

# マイグレーション状態を確認
npx prisma migrate status

# 必要に応じてリセット（開発環境のみ）
npx prisma migrate reset
```

---

## まとめ

### 実装完了事項

✅ データベーススキーマにcreatorId追加
✅ マイグレーション実行
✅ チャンネル作成時にcreatorIdを保存
✅ チャンネル一覧取得APIでcreatorIdを返す
✅ 全チャンネル取得APIでcreatorIdを返す
✅ フロントエンドで作成者のみに削除ボタン表示
✅ API側で作成者のみが削除できるように権限チェック
✅ Prismaリレーションガイドドキュメント作成

### 技術的な学び

1. **Prismaリレーション**: `@relation`の使い方、`onDelete`の動作
2. **セキュリティ**: フロントエンドとバックエンドの二重チェック
3. **React条件付きレンダリング**: `&&`演算子による表示制御
4. **TypeScript型定義**: nullable型（`string | null`）の扱い
5. **データベースマイグレーション**: 既存データへの影響を考慮

---

## 関連ファイルパス

### データベース
- `prisma/schema.prisma`
- `prisma/migrations/20251023005752_add_channel_creator/`

### API
- `src/app/api/channels/route.ts`
- `src/app/api/channels/all/route.ts`
- `src/app/api/channels/[channelId]/route.ts`

### フロントエンド
- `src/app/workspace/layout.tsx`
- `src/components/workspace/channelList.tsx`

### ドキュメント
- `docs/PRISMA_RELATION_GUIDE.md`
- `docs/OPTIMISTIC_UPDATE_IMPLEMENTATION.md`（関連）

---

## 参考資料

- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Prisma Referential Actions](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/referential-actions)
- [React Conditional Rendering](https://react.dev/learn/conditional-rendering)

---

**次回セッション開始時**: このファイルを読んで、実装状況を把握してください。
