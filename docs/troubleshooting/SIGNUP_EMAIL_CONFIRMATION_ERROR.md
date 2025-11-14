# サインアップ・メール確認フローのエラー解決ガイド

**作成日**: 2025年10月27日
**対象バージョン**: Next.js 15.5.4, Prisma 6.16.3, Supabase Auth

---

## 問題の概要

新規ユーザーがサインアップ後、メール確認を完了してログインしようとすると以下のエラーが発生：

```
❌ ユーザーが見つかりません
GET /api/dashboard?userId=fb4861a4-... 404 (Not Found)
```

### 発生状況

- 既存ユーザー（例: 石川裕）: ログイン成功 ✅
- 新規ユーザー（例: ちえ）: ログイン失敗、エラー発生 ❌

---

## 根本原因

### 原因1: メール確認フローのUI未実装

**問題**: サインアップ後、メール確認が必要なことをユーザーに伝えていなかった

**症状**:
- サインアップボタンを押しても何の反応もない
- ユーザーが確認メールを見逃す
- メールリンクをクリックしてもトップページにリダイレクトされる

### 原因2: Prisma Clientのキャッシュ問題

**問題**: Prisma Clientが古いスキーマ情報をキャッシュしていた

**症状**:
```
❌ Prismaユーザー同期エラー: Error [PrismaClientKnownRequestError]:
Invalid `prisma.user.upsert()` invocation:

The column `isOnline` does not exist in the current database.
```

**詳細**:
- Prismaスキーマには `isOnline` と `lastSeen` カラムが定義されている
- データベースにもカラムが存在する
- しかしPrisma Clientが古いスキーマを参照していた
- 結果、新規ユーザー作成時にエラー発生

---

## 解決方法

### 解決策1: メール確認メッセージの実装

#### 変更ファイル1: `src/app/signup/actions.ts`

**変更内容**: メール確認が必要かどうかを検出

```typescript
type ActionResult = {
  error?: string
  success?: string
  requiresEmailConfirmation?: boolean  // ← 追加
}

export async function signup(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  // ... バリデーション処理

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { name: data.name },
    },
  })

  if (error) {
    return { error: errorMessage }
  }

  // メール確認が必要かどうかをチェック
  const requiresEmailConfirmation = !authData.session

  if (requiresEmailConfirmation) {
    console.log('📧 メール確認が必要です:', data.email)
    return {
      success: '確認メールを送信しました',
      requiresEmailConfirmation: true
    }
  }

  // メール確認不要の場合のみPrismaユーザー作成
  if (authData.user) {
    await prisma.user.create({ ... })
  }

  revalidatePath('/', 'layout')
  redirect('/workspace')
}
```

#### 変更ファイル2: `src/app/signup/page.tsx`

**変更内容**: メール確認メッセージの表示

```tsx
import { Mail, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, null)

  return (
    <form action={formAction}>
      {/* メール確認メッセージ表示 */}
      {state?.requiresEmailConfirmation && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                確認メールを送信しました
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ご登録いただいたメールアドレスに確認メールを送信しました。
                メール内のリンクをクリックして、アカウントを有効化してください。
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    メールが届かない場合は、迷惑メールフォルダをご確認ください
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    確認後、ログインページからログインできます
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Link href="/login" className="block">
              <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                ログインページへ
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 既存のフォーム */}
    </form>
  )
}
```

#### 変更ファイル3: `src/app/login/actions.ts`

**変更内容**: `update` から `upsert` に変更（初回ログイン時のユーザー作成対応）

```typescript
export async function login(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  // ... ログイン処理

  if (authData.user) {
    try {
      const userName = authData.user.user_metadata?.name ||
                      authData.user.user_metadata?.full_name ||
                      authData.user.email?.split('@')[0] ||
                      'Unknown User'

      const avatarUrl = authData.user.user_metadata?.avatar_url ||
                       authData.user.user_metadata?.picture ||
                       null

      // update → upsert に変更
      await prisma.user.upsert({
        where: { authId: authData.user.id },
        update: {
          isOnline: true,
          lastSeen: new Date(),
        },
        create: {
          authId: authData.user.id,
          name: userName,
          email: authData.user.email || '',
          avatarUrl: avatarUrl,
          isOnline: true,
          lastSeen: new Date(),
        },
      })
      console.log('✅ Prismaユーザーを作成/更新しました:', authData.user.email)
    } catch (dbError: any) {
      console.error('❌ Prismaユーザー作成/更新エラー:', {
        message: dbError.message,
        code: dbError.code,
      })
      // DB更新失敗してもログインは成功とする
    }
  }

  revalidatePath('/', 'layout')
  redirect('/workspace')
}
```

### 解決策2: Prisma Clientのキャッシュクリア

#### 手順1: Prisma Clientの完全削除・再生成

```bash
# Prisma Clientのキャッシュを完全削除
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# Prisma Clientを再生成
npx prisma generate
```

**実行結果（正常）**:
```
✔ Generated Prisma Client (v6.16.3) to ./node_modules/@prisma/client in 71ms
```

#### 手順2: 開発サーバーの再起動

```bash
# 既存のサーバーを停止
# Ctrl + C または kill コマンド

# サーバーを再起動
npm run dev
```

**確認ログ（成功）**:
```
✅ Prismaユーザーを作成/更新しました: ちえ@example.com
👤 現在のユーザー: ちえ (ID: cmh8gyna60000j0mz1atk1lve)
✅ ダッシュボード統計取得成功 { channelCount: 0, dmPartnerCount: 0, totalUserCount: 8 }
```

---

## データベース状態の確認方法

### Supabase Auth の確認

1. https://supabase.com/dashboard にアクセス
2. プロジェクト選択 → **Authentication** → **Users**
3. 新規ユーザーのメールアドレスを検索
4. **Email Confirmed** 列が ✅ になっているか確認
5. **Raw User Meta Data** に `{name: "ユーザー名"}` が入っているか確認

### Prisma Database の確認

```bash
# Prisma Studio を起動
npx prisma studio
```

ブラウザで http://localhost:5555 にアクセス:
1. **User** テーブルを開く
2. 新規ユーザーのレコードが存在するか確認
3. `name`, `email`, `isOnline`, `lastSeen` カラムに値が入っているか確認

---

## トラブルシューティング

### 問題: 「isOnline does not exist」エラーが再発する

**原因**: データベースにカラムが存在しない、またはPrisma Clientのキャッシュ問題

**解決策**:

1. **マイグレーション状態を確認**
   ```bash
   npx prisma migrate status
   ```

2. **データベースに強制同期**
   ```bash
   npx prisma db push
   ```

3. **Prisma Client再生成**
   ```bash
   rm -rf node_modules/.prisma && rm -rf node_modules/@prisma/client
   npx prisma generate
   ```

4. **開発サーバー再起動**
   ```bash
   npm run dev
   ```

### 問題: メール確認メッセージが表示されない

**原因**: Supabaseの設定でメール確認が無効になっている

**確認方法**:
1. Supabaseダッシュボード → **Authentication** → **Providers** → **Email**
2. **Confirm email** が ON になっているか確認

**開発環境での対処**:
- 開発中は **Confirm email** を OFF にすると、サインアップ直後にログイン可能

### 問題: Prismaユーザーが作成されない

**確認ポイント**:

1. **ログインアクションが実行されているか**
   - ターミナルで `✅ Prismaユーザーを作成/更新しました` ログを確認

2. **upsert が正しく動作しているか**
   - エラーログを確認: `❌ Prismaユーザー作成/更新エラー`

3. **データベース接続が正常か**
   ```bash
   npx prisma studio
   ```
   正常に起動すれば接続OK

---

## 予防策

### 1. Prismaスキーマ変更時のベストプラクティス

スキーマ変更後は必ず以下を実行：

```bash
# マイグレーション生成・適用
npx prisma migrate dev --name <変更内容>

# Prisma Client再生成
npx prisma generate

# 開発サーバー再起動
# Ctrl + C してから npm run dev
```

### 2. メール確認フローのテスト手順

新規ユーザー作成フローの確認：

1. サインアップページで新規ユーザー作成
2. ✅ メール確認メッセージが表示されることを確認
3. メールの確認リンクをクリック
4. ✅ `/workspace` にリダイレクトされることを確認
5. ✅ ブラウザコンソールにエラーがないことを確認
6. ✅ Prisma Studio でユーザーレコードが作成されていることを確認

### 3. ログ監視

開発サーバーのターミナルで以下のログを確認：

**正常なログ**:
```
✅ ユーザー認証成功: user@example.com
✅ Prismaユーザーを作成/更新しました: user@example.com
👤 現在のユーザー: ユーザー名 (ID: xxx)
✅ ダッシュボード統計取得成功
```

**異常なログ**:
```
❌ Prismaユーザー同期エラー
❌ getCurrentUser エラー
The column `xxx` does not exist
```

---

## 関連ドキュメント

- [Supabase メール確認設定ガイド](../docs/SUPABASE_EMAIL_CONFIRMATION_SETUP.md)
- [サインアップ時のデータフロー](../docs/SIGNUP_DATA_FLOW.md)
- [Prisma マイグレーショントラブルシューティング](./PRISMA_MIGRATION_TROUBLESHOOTING.md)

---

**最終更新**: 2025年10月27日
**解決確認**: ✅ 新規ユーザー「ちえ」でログイン成功、エラーなし
