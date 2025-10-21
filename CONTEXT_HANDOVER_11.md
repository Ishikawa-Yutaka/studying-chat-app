# CONTEXT_HANDOVER_11.md

## セッション概要

アバター機能の実装を完了し、手動アバターアップロード機能の実装を開始しました。

---

## 完了した作業

### 1. アバター表示機能の実装 ✅

#### 実装内容
- **UserAvatarコンポーネント作成** (`src/components/userAvatar.tsx`)
  - プロフィール画像表示（avatarUrlがある場合）
  - イニシャル表示（avatarUrlがない場合）
  - Google方式：最初の1文字のみ表示
  - 3つのサイズ対応（sm/md/lg）
  - グラデーション背景

- **メッセージにアバター統合** (`src/components/channel/messageView.tsx`)
  - 送信者のアバターを左側に表示
  - 自分のアバターを右側に表示
  - UserAvatarコンポーネントを使用

- **サイドバーにアバター統合**
  - `src/components/workspace/userProfileBar.tsx` - プロフィールバー
  - `src/components/workspace/directMessageList.tsx` - DM一覧

- **OAuth認証でアバター自動取得** (`src/app/auth/callback/route.ts`)
  - Google: `user_metadata.picture`
  - GitHub: `user_metadata.avatar_url`
  - 初回ログイン時にデータベースに保存

- **APIにavatarUrl追加**
  - `/api/channels` - ユーザー情報とDM相手のアバター
  - `/api/messages/[channelId]` - メッセージ送信者のアバター
  - `/api/user/[userId]` - ユーザー情報

### 2. セキュリティ強化 ✅

#### `/api/channels` のセキュリティ改善

**変更前（脆弱）**:
```typescript
const userId = url.searchParams.get('userId');  // ⚠️ クエリパラメータを信用
```

**変更後（安全）**:
```typescript
// 認証トークンから現在のユーザーを取得
const supabase = await createClient();
const { data: { user: authUser }, error } = await supabase.auth.getUser();
// authUser.id を使用（改ざん不可能）
```

**効果**:
- 他人のIDを指定できなくなった
- 認証トークンの自動検証
- 既存のPOSTメソッドと一貫性のあるセキュリティ実装

**フロントエンド変更**:
```typescript
// Before
fetch(`/api/channels?userId=${user.id}`)

// After
fetch('/api/channels')  // userIdパラメータ削除
```

### 3. ドキュメント作成 ✅

**`docs/DATABASE_ACCESS_PATTERNS.md`** を作成

内容：
- Prisma vs Supabase SDKの違い
- データの流れ（図解付き）
- 使い分けのルール
- 実装例
- よくある質問

---

## 進行中の作業

### アバター画像の手動アップロード機能 🔄

#### 要件
- サイドバー下部（プロフィールバーの上）に歯車アイコン
- 歯車アイコンクリック → ドロップダウンメニュー表示
  - 「アバター設定」リンク
  - 「ダークモード切り替え」項目（将来実装）
- アバター設定リンククリック → 画像アップロード

#### 完了済み
1. ✅ shadcn/ui DropdownMenuをインストール
2. ✅ 設定メニューコンポーネント作成 (`src/components/workspace/settingsMenu.tsx`)

#### Todoリスト（残りのタスク）

```
[x] 設定メニューコンポーネントを作成（歯車アイコン、ドロップダウン）
[ ] Supabase Storageにavatarsバケットを作成
[ ] アバター画像アップロードAPIを作成
[ ] アバター設定モーダル/ページを作成
[ ] 画像プレビュー機能を追加
[ ] テスト：アバター画像アップロード・表示確認
[ ] ダークモード切り替え機能（将来実装）
```

---

## 次のステップ

### ステップ1: SettingsMenuをworkspace/layout.tsxに追加

**ファイル**: `src/app/workspace/layout.tsx`

**追加場所**: プロフィールバーの**上**（2箇所：モバイル版とデスクトップ版）

```tsx
import SettingsMenu from '@/components/workspace/settingsMenu';

// state追加
const [isAvatarSettingsOpen, setIsAvatarSettingsOpen] = useState(false);

// モバイル版（SheetContent内）
<SheetContent side="left" className="flex flex-col p-0">
  {/* ... チャンネル・DM一覧 ... */}

  <Separator />

  {/* 設定メニュー追加 */}
  <SettingsMenu onAvatarSettingsClick={() => setIsAvatarSettingsOpen(true)} />

  <div className="p-4">
    <UserProfileBar user={currentUser} onSignOut={signOut} />
  </div>
</SheetContent>

// デスクトップ版（aside内）
<aside className="...">
  {/* ... チャンネル・DM一覧 ... */}

  {/* 設定メニュー追加 */}
  <SettingsMenu onAvatarSettingsClick={() => setIsAvatarSettingsOpen(true)} />

  <div className="sticky bottom-0 border-t bg-background p-4">
    <UserProfileBar user={currentUser} onSignOut={signOut} />
  </div>
</aside>
```

### ステップ2: Supabase Storageバケット作成

1. **Supabase Dashboard** → Storage → Create bucket
2. **バケット名**: `avatars`
3. **Public bucket**: ON（画像を公開アクセス可能にする）
4. **File size limit**: 2MB
5. **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`

### ステップ3: アバターアップロードAPI作成

**ファイル**: `src/app/api/avatar/upload/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // 2. FormDataから画像ファイル取得
  const formData = await request.formData();
  const file = formData.get('avatar') as File;

  if (!file) {
    return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
  }

  // 3. ファイル検証（サイズ、MIME type）
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'ファイルサイズは2MB以下にしてください' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: '画像ファイルのみアップロード可能です' }, { status: 400 });
  }

  // 4. ファイル名生成（重複を避ける）
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;

  // 5. Supabase Storageにアップロード
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true
    });

  if (uploadError) {
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
  }

  // 6. 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // 7. Prismaデータベースを更新
  await prisma.user.updateMany({
    where: { authId: user.id },
    data: { avatarUrl: publicUrl }
  });

  return NextResponse.json({ success: true, avatarUrl: publicUrl });
}
```

### ステップ4: アバター設定モーダル作成

**ファイル**: `src/components/workspace/avatarSettingsDialog.tsx`

shadcn/ui Dialogを使用：
```bash
npx shadcn@latest add dialog
```

コンポーネント内容：
- ファイル選択input
- 画像プレビュー
- アップロードボタン
- ローディング状態
- エラーハンドリング

### ステップ5: workspace/layout.tsxでモーダル表示

```tsx
<AvatarSettingsDialog
  open={isAvatarSettingsOpen}
  onOpenChange={setIsAvatarSettingsOpen}
  currentAvatarUrl={currentUser?.avatarUrl}
  onAvatarUpdated={(newUrl) => {
    setCurrentUser(prev => prev ? { ...prev, avatarUrl: newUrl } : null);
  }}
/>
```

---

## 現在のファイル構成

### 新規作成されたファイル
```
src/components/
├── userAvatar.tsx ✅
└── workspace/
    └── settingsMenu.tsx ✅（今回作成）

src/components/ui/
└── dropdown-menu.tsx ✅（shadcn追加）

docs/
└── DATABASE_ACCESS_PATTERNS.md ✅
```

### 修正されたファイル
```
src/app/auth/callback/route.ts ✅（OAuth avatarUrl取得）
src/app/api/channels/route.ts ✅（セキュリティ強化、avatarUrl追加）
src/app/api/messages/[channelId]/route.ts ✅（avatarUrl追加）
src/app/api/user/[userId]/route.ts ✅（avatarUrl追加）
src/app/workspace/layout.tsx ✅（currentUser state、セキュリティ強化）
src/components/channel/messageView.tsx ✅（UserAvatar統合）
src/components/workspace/userProfileBar.tsx ✅（UserAvatar統合）
src/components/workspace/directMessageList.tsx ✅（UserAvatar統合）
src/hooks/useRealtimeMessages.ts ✅（avatarUrl型追加）
prisma/schema.prisma ✅（User.avatarUrl追加）
```

---

## 技術的な学習ポイント

### 1. Prisma vs Supabase SDK

**Prisma（ORM）**:
- PostgreSQLデータベース専用
- TypeScript型安全
- マイグレーション管理
- 用途：メッセージ、ユーザー、チャンネルなどのCRUD操作

**Supabase SDK**:
- Supabase独自サービス専用
- 認証、Realtime、Storage
- 用途：ログイン、リアルタイム監視、ファイルアップロード

**重要**: 2つは完全に別の経路。混ざることはない。

### 2. セキュリティのベストプラクティス

**クエリパラメータを信用しない**:
- ❌ `?userId=xxx` を受け取って使用
- ✅ 認証トークンから現在のユーザーを取得

**認証チェックの標準パターン**:
```typescript
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
}

// user.id を使用（改ざん不可能）
```

### 3. Supabase Storage

**構造**:
```
Supabase Storage
└── Buckets
    ├── avatars（今回作成予定）
    │   ├── user1-timestamp.jpg
    │   └── user2-timestamp.png
    └── files（既存：ファイル送信用）
```

**アクセス制御**:
- Public bucket: 誰でも画像を見れる（アバターに最適）
- Private bucket: 認証が必要

---

## データベース構造（現在）

```sql
-- User テーブル
CREATE TABLE "User" (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  authId     TEXT UNIQUE NOT NULL,
  avatarUrl  TEXT,  -- ← OAuth自動取得 or 手動アップロード
  createdAt  TIMESTAMP DEFAULT NOW(),
  updatedAt  TIMESTAMP
);
```

**avatarUrlの値**:
- OAuth認証: `https://lh3.googleusercontent.com/...`（Google）
- OAuth認証: `https://avatars.githubusercontent.com/...`（GitHub）
- 手動アップロード: `https://xxx.supabase.co/storage/v1/object/public/avatars/...`
- 未設定: `null`（イニシャル表示）

---

## 動作確認済み

### アバター表示
- ✅ OAuth認証（Google）でアバター自動取得
- ✅ メッセージにアバター表示
- ✅ DM一覧にアバター表示
- ✅ プロフィールバーにアバター表示
- ✅ イニシャル表示（avatarUrlがない場合）
- ✅ Google方式：最初の1文字のみ表示

### セキュリティ
- ✅ 認証トークンから現在のユーザー取得
- ✅ 他人のIDを指定できない

### API
- ✅ `/api/channels` - currentUserを返す
- ✅ `/api/messages/[channelId]` - sender.avatarUrlを返す
- ✅ `/api/user/[userId]` - avatarUrlを返す

---

## 未完了・次のタスク

### すぐに実装するもの（優先度：高）

1. **SettingsMenuをworkspace/layout.tsxに統合**
2. **Supabase Storageバケット作成**（手動作業）
3. **アバターアップロードAPI作成**
4. **shadcn/ui Dialog追加**
5. **AvatarSettingsDialog作成**
6. **テスト・動作確認**

### 将来実装するもの（優先度：中〜低）

- ダークモード切り替え機能
- アバター画像の削除機能
- 画像トリミング機能
- 複数画像形式のサポート拡充

---

## トラブルシューティング

### 問題1: サイドバーにチャンネル・DMが表示されない

**原因**: API修正後、認証エラーまたはキャッシュ問題

**解決策**: ログアウト → 再ログイン

### 問題2: アバターがイニシャル1文字しか表示されない

**原因**: 名前にスペースがない（例：「田中太郎」）

**解決策**: Google方式に変更（最初の1文字のみ表示）

---

## 開発環境

- Node.js: v20.19.0
- Next.js: 15.5.4
- Prisma: 最新版
- Supabase: 最新SDK
- TypeScript: 最新版

---

## 参考ドキュメント

- `CLAUDE.md` - プロジェクト全体のアーキテクチャ
- `docs/DATABASE_ACCESS_PATTERNS.md` - Prisma vs Supabase SDK
- `troubleshooting/PRISMA_MIGRATION_DRIFT_ERROR.md` - マイグレーション問題
- `troubleshooting/SUPABASE_AUTH_INTEGRATION.md` - 認証統合

---

## 次のセッションへの指示

1. **CONTEXT_HANDOVER_11.mdを読む**
2. **「次のステップ」から実装を再開**
3. **Todoリストを確認して進捗管理**
4. **完了したらCONTEXT_HANDOVER_12.mdを作成**

---

作成日: 2025-10-21
前回セッション: アバター機能実装とセキュリティ強化
今回セッション: 手動アバターアップロード機能（進行中）
