# Supabase Storage セットアップガイド

ファイルアップロード機能を実装するための Supabase Storage の設定手順をまとめたドキュメントです。

## 目次

1. [Supabase Storage とは](#supabase-storage-とは)
2. [バケットの作成](#バケットの作成)
3. [セキュリティポリシーの設定](#セキュリティポリシーの設定)
4. [Next.js での実装](#nextjs-での実装)
5. [トラブルシューティング](#トラブルシューティング)

---

## Supabase Storage とは

**Supabase Storage** は、Supabase が提供するオブジェクトストレージサービスです。

### 主な特徴

- **S3 互換**: Amazon S3 と同様の API を使用
- **セキュリティ**: Row Level Security (RLS) によるアクセス制御
- **CDN**: 自動的に CDN 経由で配信
- **無料枠**: 1GB のストレージと 2GB の転送量が無料

### 用途

- 画像・動画のアップロード
- PDF・Office 文書の保存
- ユーザープロフィール画像
- チャットアプリのファイル共有

---

## バケットの作成

バケットは、ファイルを保存する「フォルダ」のようなものです。

### 手順

1. **Supabase Dashboard にアクセス**
   - https://app.supabase.com にログイン
   - プロジェクトを選択

2. **Storage セクションに移動**
   - 左サイドバーの「Storage」をクリック

3. **新しいバケットを作成**
   - 「Create a new bucket」ボタンをクリック
   - バケット名を入力（例: `chat-files`）
   - **Public bucket** を有効化（チェックを入れる）
     - 有効化すると、ファイルの URL に直接アクセス可能
     - 無効化すると、認証が必要

4. **ファイル制限の設定（オプション）**
   - **Maximum file size**: `10 MB`
   - **Allowed MIME types**: 以下を設定
     ```
     image/*
     video/*
     application/pdf
     application/vnd.openxmlformats-officedocument.*
     application/msword
     application/vnd.ms-excel
     application/vnd.ms-powerpoint
     application/zip
     text/plain
     ```

5. **「Save」をクリックして作成完了**

### 設定の意味

| 設定項目 | 説明 | 推奨値 |
|---------|------|--------|
| **Bucket name** | バケットの識別名 | `chat-files` など |
| **Public bucket** | 認証なしでファイルにアクセス可能 | チャットアプリの場合は `ON` |
| **Maximum file size** | アップロード可能な最大ファイルサイズ | `10 MB` |
| **Allowed MIME types** | アップロード可能なファイル形式 | 上記参照 |

---

## セキュリティポリシーの設定

Supabase Storage では、**RLS (Row Level Security)** を使ってアクセス制御を行います。

### なぜ必要？

Public bucket でも、**誰でもファイルをアップロードできてしまうと悪用される**可能性があります。
そのため、「認証済みユーザーのみアップロード可能」などの制限をかけます。

### 手順

1. **Storage の Policies に移動**
   - Storage ページで作成したバケット（`chat-files`）を選択
   - 上部の「Policies」タブをクリック

2. **アップロード許可ポリシーを作成**
   - 「New Policy」をクリック
   - テンプレートから選択するか、カスタムポリシーを作成

#### ポリシー 1: 認証済みユーザーのみアップロード可能

```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');
```

**説明**:
- `FOR INSERT`: ファイルのアップロード（INSERT）に対する制限
- `TO authenticated`: 認証済みユーザーのみ許可
- `WITH CHECK (bucket_id = 'chat-files')`: `chat-files` バケットのみ適用

#### ポリシー 2: すべてのユーザーがファイルを読み取り可能

```sql
CREATE POLICY "Allow public to read files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-files');
```

**説明**:
- `FOR SELECT`: ファイルの読み取り（SELECT）に対する制限
- `TO public`: すべてのユーザー（未認証も含む）に許可
- `USING (bucket_id = 'chat-files')`: `chat-files` バケットのみ適用

### Supabase Dashboard での設定（GUI）

1. **「New Policy」をクリック**
2. **ポリシー名を入力**: 例: `Allow authenticated users to upload`
3. **Allowed operation** で `INSERT` を選択
4. **Target roles** で `authenticated` を選択
5. **Policy definition** で以下を入力:
   ```sql
   bucket_id = 'chat-files'
   ```
6. **「Save policy」をクリック**

同様に、読み取りポリシーも作成します。

### ポリシーの確認

```sql
-- すべてのポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

---

## Next.js での実装

### 1. 環境変数の設定

`.env.local` に以下を追加:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxx
```

### 2. Supabase クライアントの作成

**ファイル**: `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 3. ファイルアップロード API の実装

**ファイル**: `src/app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // FormData からファイルを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      );
    }

    // 許可されたファイル形式のチェック
    const allowedTypes = [
      'image/',
      'video/',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'application/zip',
      'text/plain',
    ];

    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'このファイル形式はサポートされていません' },
        { status: 400 }
      );
    }

    // 一意なファイル名を生成
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const uniqueFileName = `${timestamp}_${randomStr}.${fileExt}`;

    // Supabase Storage にアップロード
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(uniqueFileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // 公開 URL を取得
    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(uniqueFileName);

    return NextResponse.json({
      success: true,
      file: {
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      },
    });

  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    return NextResponse.json(
      { success: false, error: 'ファイルのアップロードに失敗しました' },
      { status: 500 }
    );
  }
}
```

### 4. フロントエンドでのファイルアップロード

```typescript
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    console.log('アップロード成功:', data.file.url);
    // ファイル URL をメッセージに含めて送信
  } else {
    console.error('アップロード失敗:', data.error);
  }
};
```

---

## トラブルシューティング

### 1. アップロードが 401 エラーになる

**原因**: ポリシーが正しく設定されていない、または認証されていない

**解決策**:
- Storage Policies で `authenticated` ユーザーに `INSERT` 権限があるか確認
- ログイン状態を確認（`supabase.auth.getUser()` が正常に動作するか）

### 2. ファイルが見つからない（404 エラー）

**原因**: Public bucket が無効、またはファイルが存在しない

**解決策**:
- バケットが Public になっているか確認
- `getPublicUrl()` で取得した URL が正しいか確認
- ブラウザのデベロッパーツールで URL を確認

### 3. ファイルサイズ制限エラー

**原因**: Supabase の制限、または API 側の制限

**解決策**:
- Supabase の無料プランでは 50MB まで
- API 側で独自の制限を設定している場合は、その値を確認

### 4. CORS エラー

**原因**: Supabase のドメイン設定が不足

**解決策**:
- Supabase Dashboard → Settings → API → CORS で `localhost:3000` を追加
- 本番環境では、実際のドメインを追加

---

## 参考リンク

- [Supabase Storage 公式ドキュメント](https://supabase.com/docs/guides/storage)
- [Supabase Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Storage API リファレンス](https://supabase.com/docs/reference/javascript/storage-from-upload)

---

## まとめ

このドキュメントで学んだこと:

1. **Supabase Storage のバケット作成**
2. **セキュリティポリシーの設定（RLS）**
3. **Next.js でのファイルアップロード実装**
4. **トラブルシューティングの方法**

これで、チャットアプリや他のプロジェクトでファイルアップロード機能を実装できます。

---

**作成日**: 2025-01-18
**対象プロジェクト**: リアルタイムチャットアプリ（卒業制作）
