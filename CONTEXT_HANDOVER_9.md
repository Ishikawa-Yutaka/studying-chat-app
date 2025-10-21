# コンテキスト引き継ぎ #9

## 現在の作業状況

**ファイル送信機能の実装が進行中です**

---

## 完了した作業

### 1. AIチャット機能の改善（前セッション）

#### 実装内容
- 会話コンテキスト保持機能（過去20件の会話履歴をOpenAI APIに送信）
- エラーハンドリング強化（リトライ処理・タイムアウト・エラー種類別メッセージ）
- ローディング表示改善（楽観的更新・バウンドアニメーション）

#### コミット
```bash
commit 577c975
feat: AIチャット機能の大幅改善（会話コンテキスト・エラーハンドリング・ローディング表示）
```

### 2. ファイル送信機能の基盤構築（今セッション）

#### 2-1. Prismaスキーマ更新

**変更ファイル**: `prisma/schema.prisma`

Messageモデルに以下のフィールドを追加：
```prisma
// ファイル添付関連フィールド
fileUrl         String?   // アップロードされたファイルのURL（Supabase Storage）
fileName        String?   // 元のファイル名（例: document.pdf）
fileType        String?   // ファイルのMIMEタイプ（例: image/png, application/pdf）
fileSize        Int?      // ファイルサイズ（バイト単位）
```

#### 2-2. データベースマイグレーション

**実行済みSQL**（Supabase Dashboard → SQL Editor）:
```sql
ALTER TABLE "Message"
ADD COLUMN IF NOT EXISTS "fileUrl" TEXT,
ADD COLUMN IF NOT EXISTS "fileName" TEXT,
ADD COLUMN IF NOT EXISTS "fileType" TEXT,
ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
```

#### 2-3. Supabase Storageバケット作成

**バケット名**: `chat-files`

**設定**:
- Public bucket: 有効
- Maximum file size: 10 MB
- Allowed MIME types:
  - `image/*` （画像全般）
  - `video/*` （動画全般）
  - `application/pdf` （PDF）
  - `application/vnd.openxmlformats-officedocument.*` （Word, Excel, PowerPoint）
  - `application/zip` （ZIP）
  - `text/plain` （テキスト）

**セキュリティポリシー**:
1. アップロード許可（INSERT）- 認証済みユーザーのみ
   ```sql
   CREATE POLICY "Allow authenticated users to upload pdeh8i_0"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'chat-files');
   ```

2. 読み取り許可（SELECT）- 全員
   ```sql
   CREATE POLICY "Allow public to read pdeh8i_0"
   ON storage.objects
   FOR SELECT
   TO public
   USING (bucket_id = 'chat-files');
   ```

#### 2-4. ファイルアップロードAPI作成

**新規ファイル**: `src/app/api/upload/route.ts`

**機能**:
- 認証済みユーザーのみアップロード可能
- ファイルサイズチェック（最大10MB）
- ファイル形式チェック（画像・動画・PDF・Office文書など）
- 一意なファイル名を自動生成（タイムスタンプ + ランダム文字列）
- Supabase Storageにアップロード
- 公開URLを返す

**エンドポイント**: `POST /api/upload`

**リクエスト**: FormData形式
```typescript
const formData = new FormData();
formData.append('file', fileObject);
```

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

---

## 未完了のタスク（次セッションで実装）

### 優先度: 高

1. **メッセージ送信API更新**
   - ファイル情報をメッセージと一緒に保存
   - 既存のメッセージ送信API（`/api/messages/[channelId]/route.ts`）を修正
   - fileUrl, fileName, fileType, fileSizeをデータベースに保存

2. **フロントエンド: ファイル選択UI**
   - メッセージ入力フォームにファイル選択ボタン追加
   - クリップアイコンを追加
   - PC・スマホ両方で動作
   - ファイル選択後、プレビュー表示

3. **フロントエンド: ファイル送信処理**
   - ファイル選択 → アップロードAPI呼び出し → メッセージ送信
   - アップロード中のローディング表示
   - 進捗バー表示（オプション）

4. **フロントエンド: ファイルプレビュー表示**
   - 画像: 直接表示（<img>タグ）
   - 動画: 埋め込みプレーヤー（<video>タグ）
   - PDF: アイコン + ダウンロードボタン
   - Office文書: アイコン + ダウンロードボタン

5. **フロントエンド: ダウンロード機能**
   - すべてのファイル形式でダウンロード可能
   - ファイル名を元の名前で保存

### 優先度: 中

6. **エラーハンドリング**
   - アップロード失敗時のエラーメッセージ
   - ファイルサイズ超過時の警告
   - 非対応ファイル形式の警告

7. **UI/UX改善**
   - ドラッグ&ドロップ対応
   - 複数ファイル同時アップロード
   - サムネイル表示

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

  // ファイル添付関連フィールド（新規追加）
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

**主要機能**:
- `POST /api/upload` エンドポイント
- FormDataからファイルを受け取る
- バリデーション（サイズ・形式）
- Supabase Storageにアップロード
- 公開URLを返す

**バリデーション**:
- 最大ファイルサイズ: 10MB
- 許可ファイル形式: 画像、動画、PDF、Office文書、ZIP、テキスト

---

## 技術的な重要ポイント

### 1. ファイルアップロードの流れ

```
[ユーザー] ファイル選択
   ↓
[フロントエンド] FormDataを作成
   ↓
[POST /api/upload] ファイルをSupabase Storageにアップロード
   ↓
[レスポンス] 公開URLを返す
   ↓
[フロントエンド] 公開URLを含めてメッセージ送信
   ↓
[POST /api/messages/[channelId]] メッセージ + ファイル情報を保存
   ↓
[データベース] Message テーブルに保存
```

### 2. ファイル名の一意性

重複を防ぐため、以下の形式でファイル名を生成：
```typescript
const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(2, 15);
const uniqueFileName = `${timestamp}_${randomStr}.${fileExt}`;
```

例: `1734567890_abc123xyz.pdf`

### 3. Supabase Storageの公開URL形式

```
https://[PROJECT_ID].supabase.co/storage/v1/object/public/chat-files/[FILE_NAME]
```

このURLは誰でもアクセス可能（public bucket設定のため）

### 4. セキュリティ対策

1. **認証チェック**: アップロードAPIは認証済みユーザーのみ
2. **ファイルサイズ制限**: 最大10MB
3. **ファイル形式制限**: 許可されたMIMEタイプのみ
4. **Storageポリシー**: Supabase側でも二重にチェック

---

## 次のセッションで実装すべきこと

### ステップ1: メッセージ送信API更新

**ファイル**: `src/app/api/messages/[channelId]/route.ts`

**変更内容**:
```typescript
// リクエストボディにファイル情報を追加
const { content, fileUrl, fileName, fileType, fileSize } = body;

// データベース保存時にファイル情報も含める
const message = await prisma.message.create({
  data: {
    content,
    senderId: dbUser.id,
    channelId,
    fileUrl,      // 追加
    fileName,     // 追加
    fileType,     // 追加
    fileSize,     // 追加
  }
});
```

### ステップ2: フロントエンド UI実装

**対象ファイル**:
- `src/app/workspace/channel/[channelId]/page.tsx`
- `src/app/workspace/dm/[userId]/page.tsx`

**実装内容**:
1. ファイル選択ボタン（クリップアイコン）
2. ファイル選択後のプレビュー
3. アップロード処理
4. メッセージ表示部分にファイルプレビュー追加

### ステップ3: テスト

1. 画像ファイルのアップロード・表示
2. PDFファイルのアップロード・ダウンロード
3. 動画ファイルのアップロード・再生
4. ファイルサイズ制限の確認
5. 非対応ファイル形式のエラー確認

---

## 開発環境情報

### 実行中のプロセス
```bash
# 複数の開発サーバーがバックグラウンドで実行中
# 必要に応じて古いサーバーは停止可能
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

### 前セッションのコンテキスト
- `CONTEXT_HANDOVER_8.md` - AIチャット機能改善

### Supabase Storage ドキュメント
- https://supabase.com/docs/guides/storage
- https://supabase.com/docs/guides/storage/uploads
- https://supabase.com/docs/guides/storage/security/access-control

### Next.js ファイルアップロード
- https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

## 既知の問題・制限事項

### 現時点での制限
1. 1メッセージにつき1ファイルのみ（複数ファイル同時送信は未実装）
2. ドラッグ&ドロップ未対応
3. アップロード進捗表示なし
4. ファイル削除機能なし

### 将来的な改善案
1. 複数ファイル同時アップロード
2. ドラッグ&ドロップ対応
3. アップロード進捗バー
4. ファイル削除機能
5. 画像の自動圧縮
6. 動画のサムネイル生成

---

## コミット履歴

```bash
# 最新コミット（前セッション）
577c975 - feat: AIチャット機能の大幅改善（会話コンテキスト・エラーハンドリング・ローディング表示）

# 今セッションの変更（未コミット）
- prisma/schema.prisma（Messageモデルにファイルフィールド追加）
- src/app/api/upload/route.ts（新規作成）
```

**リポジトリ**: https://github.com/Ishikawa-Yutaka/studying-chat-app

---

**作成日時**: 2025-01-18
**前回のコンテキスト**: CONTEXT_HANDOVER_8.md
**次のセッションで続行可能**
