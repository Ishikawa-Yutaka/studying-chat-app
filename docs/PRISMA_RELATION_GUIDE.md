# Prisma リレーション（@relation）初心者ガイド

## リレーション（@relation）とは？

データベースでは、複数のテーブルを「関連付ける」ことができます。これを**リレーション（関係）**と呼びます。

### 具体例で理解しよう

```
チャンネルテーブル:
┌────────┬─────────┬───────────┐
│ id     │ name    │ creatorId │
├────────┼─────────┼───────────┤
│ ch-001 │ 雑談    │ user-123  │ ← この人が作った
│ ch-002 │ 技術    │ user-456  │ ← この人が作った
└────────┴─────────┴───────────┘
              ↓ creatorIdで紐付け
ユーザーテーブル:
┌──────────┬─────────┐
│ id       │ name    │
├──────────┼─────────┤
│ user-123 │ 太郎    │
│ user-456 │ 花子    │
└──────────┴─────────┘
```

## @relation の構文解説

### 基本的な書き方

```typescript
model Channel {
  creatorId String?  // 外部キー（参照先のIDを保存する列）

  creator User? @relation(
    "ChannelCreator",           // リレーションの名前
    fields: [creatorId],        // このテーブルのどの列を使うか
    references: [id],           // 参照先テーブルのどの列を見るか
    onDelete: SetNull           // 参照先が削除された時の動作
  )
}
```

### 各部分の意味

#### 1. リレーション名: `"ChannelCreator"`

```typescript
@relation("ChannelCreator", ...)
          ^^^^^^^^^^^^^^^^
```

- **役割**: この関係の名前（識別用のラベル）
- **なぜ必要？** 同じテーブル間に複数の関係がある場合の区別用

**例**:
```typescript
model User {
  // 同じChannel-User間に複数の関係
  createdChannels Channel[] @relation("ChannelCreator")  // 作成したチャンネル
  channels        ChannelMember[]  // 参加しているチャンネル（別の中間テーブル経由）
}
```

#### 2. fields: `[creatorId]`

```typescript
fields: [creatorId]
```

- **意味**: このテーブル（Channel）のどの列を使って関連付けるか
- **実例**: Channelテーブルの`creatorId`列に「user-123」が入っていれば、そのIDのユーザーを探す

#### 3. references: `[id]`

```typescript
references: [id]
```

- **意味**: 参照先テーブルのどの列を見るか
- **重要**: リレーションフィールドの型を見て、どのテーブルか判断している

**型による判断の仕組み**:

```typescript
model Channel {
  creator User? @relation(
  //      ^^^^ ← この型を見ている！
    "ChannelCreator",
    fields: [creatorId],
    references: [id]  // ← User テーブルの id だと分かる
  )
}
```

**ステップごとの処理**:
1. `creator`フィールドの型が`User?` → Userテーブルを参照することが分かる
2. `references: [id]` → Userテーブルのid列を使う

**別の例（自己参照）**:

```typescript
model Message {
  parentMessageId String?

  parentMessage Message? @relation(
  //            ^^^^^^^ ← Messageテーブルを参照
    "ThreadReplies",
    fields: [parentMessageId],
    references: [id]  // ← Message テーブルの id（自分自身のテーブル）
  )
}
```

#### 4. onDelete: `SetNull` ⭐重要

```typescript
onDelete: SetNull
```

- **意味**: 参照先（作成者ユーザー）が削除された時の動作

**実際の動作例**:

```
【削除前】
チャンネル「雑談」の作成者: 太郎（user-123）

【太郎のアカウントを削除】
↓
【削除後】
チャンネル「雑談」の作成者: null（なし）
                           ^^^^ creatorIdがnullになる
```

### onDelete の選択肢

| 設定値 | 動作 | 使用例 |
|--------|------|--------|
| `SetNull` | 外部キーを`null`にする | ユーザー削除時、チャンネルは残すが作成者情報だけ消す |
| `Cascade` | 関連データごと削除 | ユーザー削除時、そのユーザーのメッセージも全削除 |
| `Restrict` | 削除を拒否 | 関連データが存在する限り削除できない |
| `NoAction` | 何もしない（DBエラー） | 通常は使わない |

**具体例での使い分け**:

```typescript
model Channel {
  creatorId String?
  creator User? @relation(..., onDelete: SetNull)
  // ↑ ユーザーが退会してもチャンネルは残したい
}

model Message {
  senderId String
  sender User @relation(..., onDelete: Cascade)
  // ↑ ユーザーが退会したらメッセージも削除したい
}

model ChannelMember {
  userId String
  user User @relation(..., onDelete: Cascade)
  // ↑ ユーザーが退会したら参加記録も削除したい
}
```

## 完全なコード例

### チャンネル作成者のリレーション

```typescript
// ユーザーモデル
model User {
  id              String   @id @default(cuid())
  name            String
  email           String   @unique

  // リレーション（逆側）
  createdChannels Channel[] @relation("ChannelCreator")  // このユーザーが作ったチャンネル一覧
  messages        Message[]                              // このユーザーが送ったメッセージ一覧
}

// チャンネルモデル
model Channel {
  id          String   @id @default(cuid())
  name        String?
  description String?
  type        String   // "channel" または "dm"
  creatorId   String?  // 作成者のID（nullも許可）

  // リレーション
  creator  User?            @relation("ChannelCreator", fields: [creatorId], references: [id], onDelete: SetNull)
  messages Message[]        // このチャンネル内のメッセージ一覧
  members  ChannelMember[]  // このチャンネルに参加しているユーザー一覧
}
```

### データベース上での動き（SQL）

Prismaが内部的に生成するSQL（イメージ）:

```sql
CREATE TABLE "Channel" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "creatorId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,

  -- 外部キー制約
  FOREIGN KEY ("creatorId")
    REFERENCES "User"("id")
    ON DELETE SET NULL  -- ユーザー削除時はNULLにする
);
```

## よくある質問（FAQ）

### Q1: なぜ`creatorId String?`に`?`が必要なのか？

**A**: `onDelete: SetNull`を使う場合、nullを許可する必要があります。

```typescript
creatorId String?  // ← ? をつけてnullを許可
//               ^
creator User? @relation(..., onDelete: SetNull)
//          ^
```

- ユーザーが削除された時に`creatorId`が`null`になる
- DMの場合は作成者が不要なので`null`でOK

### Q2: リレーション名はいつ必要？

**A**: 同じテーブル間に複数の関係がある場合のみ必要です。

**不要な例（1対1の関係）**:
```typescript
model Message {
  senderId String
  sender User @relation(fields: [senderId], references: [id])
  // ↑ 名前なしでOK（Message-User間に1つだけの関係）
}
```

**必要な例（複数の関係）**:
```typescript
model Channel {
  creator User? @relation("ChannelCreator", ...)  // 名前が必要
  //                      ^^^^^^^^^^^^^^^^
}

model User {
  createdChannels Channel[] @relation("ChannelCreator")  // 同じ名前
  channels        ChannelMember[]  // 別のリレーション
}
```

### Q3: `fields`と`references`の順番は？

**A**: 常に同じ順番で対応させます。

```typescript
// 単一フィールドの場合
fields: [creatorId],
references: [id]
// creatorId → User.id に対応

// 複合キーの場合（複数の列を使う）
fields: [userId, channelId],
references: [id, id]
// userId → User.id
// channelId → Channel.id
```

## まとめ

### リレーションの基本パターン

```typescript
// パターン1: 1対多（作成者とチャンネル）
model Channel {
  creatorId String?
  creator User? @relation("名前", fields: [creatorId], references: [id], onDelete: SetNull)
}

model User {
  createdChannels Channel[] @relation("名前")
}
```

```typescript
// パターン2: 多対多（中間テーブル使用）
model ChannelMember {
  userId    String
  channelId String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  channel   Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)
}
```

### 覚えておくべきポイント

1. **リレーションフィールドの型** = 参照先テーブル
2. **fields** = このテーブルの列
3. **references** = 参照先テーブルの列
4. **onDelete** = 参照先削除時の動作（SetNull / Cascade / Restrict）
5. **リレーション名** = 同じテーブル間に複数関係がある場合のみ必要

## 参考リンク

- [Prisma 公式ドキュメント - Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Prisma 公式ドキュメント - Referential actions](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/referential-actions)
