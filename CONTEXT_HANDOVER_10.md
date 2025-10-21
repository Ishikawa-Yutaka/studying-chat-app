# コンテキスト引き継ぎ #10

## 現在の作業状況

**ソーシャル認証機能の実装準備中**

---

## 完了した作業

### 1. ファイル送信・プレビュー機能の実装（前セッション）

#### 実装内容

**バックエンド**:
- Prisma Messageモデルにファイル添付フィールド追加
  - `fileUrl`: ファイルのURL
  - `fileName`: ファイル名
  - `fileType`: MIMEタイプ
  - `fileSize`: ファイルサイズ（バイト）
- ファイルアップロードAPI作成（`/api/upload`）
  - Supabase Storageへのアップロード
  - 最大10MBのファイルサイズ制限
  - バリデーション（サイズ・形式チェック）
- メッセージ送信APIをファイル情報対応に更新

**フロントエンド**:
- メッセージ入力フォームにファイル選択ボタン追加
  - クリップアイコンボタン
  - ファイル選択後のプレビュー表示
  - アップロード中のローディング表示
- ファイル表示機能
  - 画像: メッセージ内に直接表示、クリックで拡大
  - 動画: 埋め込みプレーヤーで再生
  - PDF/Office文書: カード形式で表示
- ファイルプレビューモーダル（新規コンポーネント）
  - PDF: iframeで直接プレビュー
  - Word/Excel/PowerPoint: Microsoft Office Online Viewerでプレビュー
  - 画像: 拡大表示
- ダウンロード機能
  - fetchを使った強制ダウンロード処理

**対応ファイル形式**:
- 画像: `image/*`
- 動画: `video/*`
- PDF: `application/pdf`
- Word: `.doc`, `.docx`
- Excel: `.xls`, `.xlsx`
- PowerPoint: `.ppt`, `.pptx`
- その他: `.zip`, `.txt`

#### コミット

```bash
commit e086f21
feat: ファイル送信・プレビュー機能を実装
```

**変更ファイル**:
- `prisma/schema.prisma` - Messageモデルにファイルフィールド追加
- `src/app/api/upload/route.ts` - ファイルアップロードAPI（新規）
- `src/app/api/messages/[channelId]/route.ts` - ファイル情報対応
- `src/app/workspace/channel/[channelId]/page.tsx` - ファイル情報の型定義とメッセージ送信処理
- `src/components/channel/messageForm.tsx` - ファイル選択・アップロードUI
- `src/components/channel/messageView.tsx` - ファイル表示・プレビュー
- `src/components/channel/filePreviewModal.tsx` - プレビューモーダル（新規）

### 2. Supabase Storageの設定

**バケット名**: `chat-files`

**設定内容**:
- Public bucket: 有効
- Maximum file size: 10 MB
- Allowed MIME types: 画像、動画、PDF、Office文書、ZIP、テキスト

**セキュリティポリシー**:
1. アップロード許可（INSERT）- 認証済みユーザーのみ
2. 読み取り許可（SELECT）- 全員（public）

### 3. ドキュメント作成

#### `docs/SUPABASE_STORAGE_SETUP.md`
- Supabase Storageの設定手順
- バケット作成方法
- セキュリティポリシーの設定
- Next.jsでの実装方法
- トラブルシューティング

#### `docs/SOCIAL_AUTH_SETUP.md`
- ソーシャル認証（Google、GitHub、Twitter/X、Facebook）の設定ガイド
- 各プロバイダーのOAuth設定手順
- Supabaseでの設定方法
- Next.js側の実装コード例
- トラブルシューティング

### 4. UI改善

- クリップアイコンの色を明るく変更（ライトモード: gray-600、ダークモード: gray-300）
- ホバー時にブルーに変化

---

## 未完了のタスク（次セッションで実装）

### 優先度: 高

#### 1. ソーシャル認証の実装

**必要な作業**:

##### 1-1. Supabase側の設定（手動）
ユーザーが `docs/SOCIAL_AUTH_SETUP.md` を見ながら以下を実施:

1. **Google認証**
   - Google Cloud Consoleでプロジェクト作成
   - OAuth同意画面設定
   - OAuth 2.0クライアントID作成
   - SupabaseにClient IDとSecretを設定

2. **GitHub認証**
   - GitHub OAuth App作成
   - Callback URL設定
   - SupabaseにClient IDとSecretを設定

3. **Twitter/X認証**
   - Twitter Developer PortalでApp作成
   - API KeyとSecret取得
   - Callback URL設定
   - SupabaseにAPI KeyとSecretを設定

4. **Facebook認証（オプション）**
   - Facebook Developersでアプリ作成
   - Facebook Login設定
   - SupabaseにApp IDとSecretを設定

##### 1-2. Next.js側の実装

**新規ファイル作成**:
- `src/lib/auth.ts` - ソーシャル認証ヘルパー関数
  ```typescript
  export type SocialProvider = 'google' | 'github' | 'twitter' | 'facebook';
  export async function signInWithSocial(provider: SocialProvider)
  ```

**既存ファイル更新**:
- `src/app/login/page.tsx` - ソーシャルログインボタン追加
- `src/app/signup/page.tsx` - ソーシャルサインアップボタン追加

**ボタンデザイン**:
- Google、GitHub、Twitter、Facebookのロゴ付きボタン
- 2列グリッドレイアウト
- 「または」の区切り線

##### 1-3. アイコン素材の準備

**必要なアイコン**:
- Google: `public/icons/google.svg`
- GitHub: `public/icons/github.svg`
- Twitter: `public/icons/twitter.svg`
- Facebook: `public/icons/facebook.svg`

または、React Icons（lucide-react）を使用。

##### 1-4. コールバック処理の確認

**ファイル**: `src/app/auth/callback/route.ts`

既存のコールバック処理がソーシャル認証に対応しているか確認。
必要に応じて、Prismaへのユーザー情報同期処理を追加。

```typescript
// ソーシャル認証後、Prismaにユーザー情報を同期
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await prisma.user.upsert({
    where: { authId: user.id },
    update: {
      name: user.user_metadata.name || user.email,
      email: user.email,
    },
    create: {
      authId: user.id,
      name: user.user_metadata.name || user.email || 'Unknown',
      email: user.email || '',
    },
  });
}
```

#### 2. DM（ダイレクトメッセージ）ページへのファイル送信機能追加

**対象ファイル**:
- `src/app/workspace/dm/[userId]/page.tsx`

**実装内容**:
- チャンネルページと同様のファイル送信機能を追加
- MessageFormコンポーネントの再利用

### 優先度: 中

#### 3. ファイル送信機能の改善

1. **ドラッグ&ドロップ対応**
   - メッセージ入力欄にファイルをドラッグ&ドロップ
   - ドロップゾーンの視覚的フィードバック

2. **複数ファイル同時アップロード**
   - 1メッセージに複数ファイル添付可能
   - ファイルリストのプレビュー

3. **アップロード進捗バー**
   - 大きなファイルのアップロード時に進捗表示

4. **画像の自動圧縮**
   - クライアント側で画像を圧縮してからアップロード
   - ファイルサイズを削減

#### 4. エラーハンドリングの改善

- `alert()` から Toast 通知に変更（shadcn/ui）
- より詳細なエラーメッセージ

---

## 主要ファイルの現在の状態

### 1. Prismaスキーマ (`prisma/schema.prisma`)

```prisma
model Message {
  id              String   @id @default(cuid())
  content         String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  parentMessageId String?

  // ファイル添付関連フィールド
  fileUrl         String?
  fileName        String?
  fileType        String?
  fileSize        Int?

  // リレーション
  sender         User      @relation(fields: [senderId], references: [id], onDelete: Cascade)
  senderId       String
  channel        Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  channelId      String
  parentMessage  Message?  @relation("ThreadReplies", fields: [parentMessageId], references: [id], onDelete: Cascade)
  replies        Message[] @relation("ThreadReplies")
}
```

### 2. ファイルアップロードAPI (`src/app/api/upload/route.ts`)

**エンドポイント**: `POST /api/upload`

**主要機能**:
- FormDataからファイル取得
- 認証チェック（認証済みユーザーのみ）
- ファイルサイズチェック（最大10MB）
- ファイル形式チェック
- 一意なファイル名生成（タイムスタンプ + ランダム文字列）
- Supabase Storageにアップロード
- 公開URLを返却

**レスポンス**:
```json
{
  "success": true,
  "file": {
    "url": "https://...supabase.co/storage/v1/object/public/chat-files/...",
    "name": "document.pdf",
    "type": "application/pdf",
    "size": 123456
  }
}
```

### 3. メッセージ送信API (`src/app/api/messages/[channelId]/route.ts`)

**更新内容**:
- リクエストボディに `fileUrl`, `fileName`, `fileType`, `fileSize` を追加
- ファイル情報をデータベースに保存
- ファイル添付時のログ出力

### 4. メッセージ入力フォーム (`src/components/channel/messageForm.tsx`)

**主要機能**:
- クリップアイコンボタン
- ファイル選択処理（`handleFileSelect`）
- ファイルサイズチェック（10MB制限）
- ファイルプレビュー表示
- アップロード処理（`handleSubmit`）
- ローディング表示（スピナー）

### 5. ファイルプレビューモーダル (`src/components/channel/filePreviewModal.tsx`)

**対応ファイル**:
- PDF: `<iframe>` で直接表示
- Office文書: Microsoft Office Online Viewer で表示
- 画像: `<img>` で拡大表示

---

## 技術的な重要ポイント

### 1. ソーシャル認証のフロー

```
1. ユーザーが「Googleでログイン」ボタンをクリック
   ↓
2. supabase.auth.signInWithOAuth() を呼び出し
   ↓
3. Googleのログイン画面にリダイレクト
   ↓
4. ユーザーがGoogleでログイン・認可
   ↓
5. Supabaseのコールバック URL にリダイレクト
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ↓
6. Supabaseがセッションを作成
   ↓
7. アプリのコールバックページにリダイレクト
   /auth/callback
   ↓
8. セッションコードを交換（exchangeCodeForSession）
   ↓
9. Prismaにユーザー情報を同期（upsert）
   ↓
10. ダッシュボードにリダイレクト
```

### 2. Supabase Auth と Prisma の連携

**重要**: ソーシャル認証でログインしたユーザー情報を Prisma の User テーブルにも保存する必要があります。

```typescript
// Supabase Auth のユーザー情報
const { data: { user } } = await supabase.auth.getUser();

// Prisma にユーザー情報を同期
await prisma.user.upsert({
  where: { authId: user.id },
  update: {
    name: user.user_metadata.name || user.email,
    email: user.email,
  },
  create: {
    authId: user.id,
    name: user.user_metadata.name || user.email || 'Unknown',
    email: user.email || '',
  },
});
```

### 3. リダイレクト URL の設定

**開発環境**:
- Supabase Callback URL: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
- アプリ Callback URL: `http://localhost:3000/auth/callback`

**本番環境**:
- Supabase Callback URL: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
- アプリ Callback URL: `https://your-domain.com/auth/callback`

---

## 既知の問題・制限事項

### ファイル送信機能

1. 1メッセージにつき1ファイルのみ（複数ファイル同時送信は未実装）
2. ドラッグ&ドロップ未対応
3. アップロード進捗表示なし
4. ファイル削除機能なし
5. 画像の自動圧縮なし

### ソーシャル認証

1. まだ実装されていない（ドキュメントのみ作成済み）
2. 各プロバイダーのOAuth設定が必要（手動）
3. 本番環境では各プロバイダーの審査が必要な場合がある

---

## 次のセッションで実装すべきこと

### ステップ1: Supabase側の設定（手動作業）

1. `docs/SOCIAL_AUTH_SETUP.md` を開く
2. Google Cloud Consoleで OAuth設定
3. GitHub で OAuth App作成
4. Twitter Developer Portalで App作成
5. Supabase Dashboardで各プロバイダーのClient IDとSecretを設定

### ステップ2: 認証ヘルパー関数の作成

**ファイル**: `src/lib/auth.ts`（新規作成）

```typescript
export type SocialProvider = 'google' | 'github' | 'twitter' | 'facebook';
export async function signInWithSocial(provider: SocialProvider);
```

### ステップ3: ログイン・サインアップページの更新

**ファイル**:
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`

ソーシャルログインボタンを追加。

### ステップ4: コールバック処理の確認

**ファイル**: `src/app/auth/callback/route.ts`

ソーシャル認証後の Prisma 同期処理を追加。

### ステップ5: テスト

1. Googleでログイン
2. GitHubでログイン
3. Twitterでログイン
4. ログイン後、Prisma Studioでユーザー情報が正しく保存されているか確認

---

## 開発環境情報

### 実行中のプロセス
```bash
# 開発サーバーがバックグラウンドで実行中
npm run dev
# → http://localhost:3000
```

### 環境変数（.env.local）
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...
DIRECT_URL=...
OPENAI_API_KEY=...
```

---

## 参考ドキュメント

### プロジェクト内ドキュメント
- `CLAUDE.md` - プロジェクト全体の説明
- `docs/SUPABASE_STORAGE_SETUP.md` - Supabase Storage設定ガイド
- `docs/SOCIAL_AUTH_SETUP.md` - ソーシャル認証設定ガイド
- `CONTEXT_HANDOVER_9.md` - 前セッションのコンテキスト

### 外部ドキュメント
- [Supabase Auth - Social Login](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Twitter OAuth](https://developer.twitter.com/en/docs/authentication/oauth-2-0)

---

## コミット履歴

```bash
# 最新コミット
e086f21 - feat: ファイル送信・プレビュー機能を実装

# 今セッションの変更（未コミット）
- docs/SUPABASE_STORAGE_SETUP.md（新規作成）
- docs/SOCIAL_AUTH_SETUP.md（新規作成）
```

**リポジトリ**: https://github.com/Ishikawa-Yutaka/studying-chat-app

---

**作成日時**: 2025-01-18
**前回のコンテキスト**: CONTEXT_HANDOVER_9.md
**次のセッションで続行可能**
