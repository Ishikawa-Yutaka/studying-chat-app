# サインアップ時のデータフロー完全ガイド

**作成日**: 2025年10月27日
**対象**: 初心者向け
**内容**: ユーザーがサインアップしてから、データベースに保存されるまでの完全な流れ

---

## 概要

このアプリでは、**2つのデータベースシステム**を連携させてユーザー情報を管理しています。

### 使用している2つのデータベース

| データベース | 役割 | 保存するデータ |
|------------|------|--------------|
| **Supabase Auth Database** | 認証専用 | メールアドレス、パスワード、認証トークン、user_metadata |
| **Prisma Database (PostgreSQL)** | アプリケーションデータ | ユーザー名、アバター、オンライン状態、メッセージなど |

### なぜ2つに分かれているのか？

- **Supabase Auth**: セキュアな認証機能（パスワードハッシュ化、トークン管理など）を提供
- **Prisma Database**: アプリ固有のデータ（メッセージ履歴、チャンネル情報など）を柔軟に管理

この2つを連携させることで、セキュリティと柔軟性を両立しています。

---

## サインアップからログインまでの完全フロー

### 全体の流れ（図解）

```
【ステップ1: サインアップ】
┌────────────────────────────────────┐
│  ブラウザ: サインアップページ       │
│  http://localhost:3000/signup      │
├────────────────────────────────────┤
│  ユーザー名: [ちえ        ]        │ ← ユーザーが入力
│  メール:     [chie@example.com]   │
│  パスワード: [••••••••]            │
│                                    │
│      [アカウント作成] ボタン        │
└────────────────────────────────────┘
         ↓ フォーム送信
         ↓
┌────────────────────────────────────┐
│  Next.js Server Action             │
│  src/app/signup/actions.ts         │
├────────────────────────────────────┤
│  1. formData から取得:             │
│     - name: "ちえ"                 │
│     - email: "chie@example.com"   │
│     - password: "••••••••"        │
│                                    │
│  2. Zodバリデーション実行          │
│     ✅ 形式チェックOK              │
│                                    │
│  3. Supabase Auth へリクエスト:    │
│     supabase.auth.signUp({        │
│       email: "chie@example.com",  │
│       password: "••••••••",       │
│       options: {                  │
│         data: {                   │
│           name: "ちえ"  ← 重要！   │
│         }                         │
│       }                           │
│     })                            │
└────────────────────────────────────┘
         ↓
         ↓
┌────────────────────────────────────┐
│  Supabase Auth Database            │
│  (認証専用データベース)             │
├────────────────────────────────────┤
│  ✅ ユーザーレコード作成:          │
│                                    │
│  ● id: "fb4861a4-..."  ← authId   │
│  ● email: "chie@example.com"      │
│  ● encrypted_password: "..."      │
│  ● email_confirmed_at: null       │
│  ● raw_user_meta_data: {          │
│      name: "ちえ"  ← ここに保存！  │
│    }                              │
│  ● display_name: (空)             │
└────────────────────────────────────┘
         ↓
         ↓ メール確認が有効な場合
         ↓
┌────────────────────────────────────┐
│  Supabase が確認メールを送信        │
├────────────────────────────────────┤
│  件名: Confirm Your Signup         │
│  本文: 以下のリンクをクリックして    │
│        アカウントを有効化してください │
│                                    │
│  → http://localhost:3000/          │
│     auth/callback?token_hash=...  │
└────────────────────────────────────┘
         ↓
         ↓ ユーザーがメールのリンクをクリック
         ↓
【ステップ2: メール確認】
┌────────────────────────────────────┐
│  Next.js Route Handler             │
│  src/app/auth/callback/route.ts    │
├────────────────────────────────────┤
│  1. 認証コードをセッションに交換    │
│     exchangeCodeForSession()       │
│                                    │
│  2. ユーザー情報を取得:            │
│     const { user } = await         │
│       supabase.auth.getUser()      │
│                                    │
│  3. user_metadata から名前取得:    │
│     userName =                     │
│       user.user_metadata?.name ||  │
│       user.email?.split('@')[0]    │
│     → "ちえ" を取得                │
│                                    │
│  4. Prisma へユーザー作成:         │
│     await prisma.user.upsert({     │
│       where: { authId: user.id },  │
│       create: {                    │
│         authId: user.id,           │
│         name: "ちえ",              │
│         email: "chie@example.com", │
│         isOnline: true,            │
│         lastSeen: new Date()       │
│       }                            │
│     })                             │
└────────────────────────────────────┘
         ↓
         ↓
┌────────────────────────────────────┐
│  Prisma Database (PostgreSQL)      │
│  (アプリケーションデータベース)      │
├────────────────────────────────────┤
│  ✅ User テーブルに作成:           │
│                                    │
│  ● id: "cmh8gyna6..." (Prisma ID) │
│  ● authId: "fb4861a4-..." ← 連携  │
│  ● name: "ちえ"                   │
│  ● email: "chie@example.com"      │
│  ● avatarUrl: null                │
│  ● isOnline: true                 │
│  ● lastSeen: 2025-10-27 10:30:00  │
│  ● createdAt: 2025-10-27 10:30:00 │
│  ● updatedAt: 2025-10-27 10:30:00 │
└────────────────────────────────────┘
         ↓
         ↓ リダイレクト
         ↓
┌────────────────────────────────────┐
│  ブラウザ: ワークスペースページ     │
│  http://localhost:3000/workspace   │
├────────────────────────────────────┤
│  ✅ ログイン成功！                 │
│  ✅ 「ちえ」さんとして表示          │
└────────────────────────────────────┘
```

---

## 詳細解説

### ステップ1: フォームデータの取得

**ファイル**: `src/app/signup/page.tsx:183-306`

ユーザーがフォームに入力した内容を Server Action に送信します。

```tsx
<form action={formAction} className="space-y-4">
  {/* ユーザー名入力 */}
  <div>
    <label htmlFor="name">ユーザー名</label>
    <Input
      id="name"
      name="name"  ← この name 属性が重要！
      type="text"
      required
      placeholder="あなたの名前"
      maxLength={50}
    />
  </div>

  {/* メールアドレス入力 */}
  <div>
    <label htmlFor="email">メールアドレス</label>
    <Input
      id="email"
      name="email"  ← この name 属性が重要！
      type="email"
      required
      placeholder="your-email@example.com"
    />
  </div>

  {/* パスワード入力 */}
  <div>
    <label htmlFor="password">パスワード</label>
    <Input
      id="password"
      name="password"  ← この name 属性が重要！
      type="password"
      required
      placeholder="8文字以上"
    />
  </div>

  <SignupButton />
</form>
```

**ポイント**:
- `name` 属性の値が、Server Action で `formData.get('name')` として取得されます
- React の `useActionState` を使用して、サーバー側の処理と状態を管理

---

### ステップ2: Server Action での処理

**ファイル**: `src/app/signup/actions.ts:43-163`

#### 2-1. フォームデータの取得とバリデーション

```typescript
export async function signup(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  // フォームからユーザー情報を取得
  const rawData = {
    email: formData.get('email') as string,      // "chie@example.com"
    password: formData.get('password') as string, // "••••••••"
    name: formData.get('name') as string,        // "ちえ"
  }

  // Zodバリデーション（型安全なバリデーション）
  const validation = signupSchema.safeParse(rawData)

  if (!validation.success) {
    // バリデーションエラー時、最初のエラーメッセージを返す
    const errorMessage = validation.error.issues[0]?.message || 'バリデーションエラー'
    console.error('❌ サインアップバリデーションエラー:', errorMessage)
    return { error: errorMessage }
  }

  const data = validation.data
  // ここから先は、型安全な data を使用
```

**バリデーション内容** (`src/lib/validations.ts`):
```typescript
export const signupSchema = z.object({
  email: z.string().email('正しいメールアドレス形式で入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  name: z.string().min(1, 'ユーザー名を入力してください').max(50, 'ユーザー名は50文字以内で入力してください'),
})
```

#### 2-2. Supabase Auth へのユーザー登録

```typescript
  // Supabaseでユーザー登録処理を実行
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,         // "chie@example.com"
    password: data.password,   // "••••••••"
    options: {
      data: {
        name: data.name,       // "ちえ" ← これが raw_user_meta_data に保存される
      },
    },
  })

  if (error) {
    console.error('❌ サインアップエラー:', error.message)

    // エラーメッセージを日本語に変換
    let errorMessage = 'アカウント作成に失敗しました'
    if (error.message.includes('User already registered')) {
      errorMessage = 'このメールアドレスは既に登録されています'
    }

    return { error: errorMessage }
  }
```

**Supabaseへの送信内容**:
```json
{
  "email": "chie@example.com",
  "password": "ハッシュ化される前のパスワード",
  "options": {
    "data": {
      "name": "ちえ"
    }
  }
}
```

**Supabase Auth Database に保存される内容**:
```json
{
  "id": "fb4861a4-4ca9-4aa4-9545-cff1572157a1",
  "email": "chie@example.com",
  "encrypted_password": "$2a$10$...",  // ハッシュ化済み
  "email_confirmed_at": null,           // メール確認前なので null
  "raw_user_meta_data": {
    "name": "ちえ"  // ← ここに保存される！
  },
  "display_name": null,                 // 設定していないので null
  "created_at": "2025-10-27T01:30:00Z"
}
```

#### 2-3. メール確認チェック

```typescript
  // メール確認が必要かどうかをチェック
  // Supabaseの設定で「Confirm email」が有効な場合、session は null になる
  const requiresEmailConfirmation = !authData.session

  if (requiresEmailConfirmation) {
    console.log('📧 メール確認が必要です:', data.email)

    // ユーザーにメール確認メッセージを表示
    return {
      success: '確認メールを送信しました',
      requiresEmailConfirmation: true
    }
  }
```

**重要**:
- `authData.session` が `null` = メール確認が必要
- `authData.session` が存在 = すぐにログイン可能（メール確認不要）

#### 2-4. Prisma ユーザー作成（メール確認不要の場合のみ）

```typescript
  // メール確認が不要な場合（または既に確認済みの場合）のみ実行
  if (authData.user) {
    try {
      await prisma.user.create({
        data: {
          authId: authData.user.id,     // Supabaseユーザーの ID
          email: data.email,
          name: data.name,
          isOnline: true,                // サインアップ直後はオンライン
          lastSeen: new Date(),          // 現在時刻を設定
        },
      })
      console.log('✅ Prisma User created successfully')
    } catch (prismaError: any) {
      console.error('❌ Prisma User creation error:', prismaError)
      // エラーハンドリング
    }
  }

  // ワークスペースにリダイレクト
  revalidatePath('/', 'layout')
  redirect('/workspace')
}
```

---

### ステップ3: メール確認（メール確認が有効な場合）

#### 3-1. ユーザーがメールのリンクをクリック

Supabaseから送信されるメールの例:
```
件名: Confirm Your Signup

こんにちは！

以下のリンクをクリックして、アカウントを有効化してください:

http://localhost:3000/auth/callback?token_hash=xxx&type=email

このメールに心当たりがない場合は、無視してください。
```

#### 3-2. 認証コールバック処理

**ファイル**: `src/app/auth/callback/route.ts:15-129`

```typescript
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')  // 認証コード取得

  if (code) {
    const supabase = await createClient()

    try {
      // ステップA: 認証コードをセッショントークンに交換
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('❌ セッション交換エラー:', exchangeError)
        return NextResponse.redirect(`${origin}/login`)
      }

      // ステップB: ログイン成功：ユーザー情報を取得
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('❌ ユーザー取得エラー:', userError)
        return NextResponse.redirect(`${origin}/login`)
      }

      console.log('✅ ユーザー認証成功:', user.email)

      // ステップC: user_metadata から名前とアバターを取得
      const userName = user.user_metadata?.name ||
                      user.user_metadata?.full_name ||
                      user.email?.split('@')[0] ||
                      'Unknown User'

      const avatarUrl = user.user_metadata?.avatar_url ||
                       user.user_metadata?.picture ||
                       null

      console.log('🔄 Prismaユーザー同期開始:', {
        authId: user.id,
        email: user.email,
        userName,
        avatarUrl: avatarUrl ? '有り' : '無し',
      })

      // ステップD: Prisma Database にユーザー情報を同期
      try {
        const prismaUser = await prisma.user.upsert({
          where: { authId: user.id },
          update: {
            // 既存ユーザーの場合は名前、メール、アバター、オンライン状態を更新
            name: userName,
            email: user.email || '',
            avatarUrl: avatarUrl,
            isOnline: true,
            lastSeen: new Date(),
          },
          create: {
            // 新規ユーザーの場合は作成
            authId: user.id,
            name: userName,
            email: user.email || '',
            avatarUrl: avatarUrl,
            isOnline: true,
            lastSeen: new Date(),
          },
        })

        console.log('✅ Prismaにユーザー情報を同期成功:', {
          id: prismaUser.id,
          authId: prismaUser.authId,
          name: prismaUser.name,
          email: prismaUser.email,
        })
      } catch (dbError: any) {
        console.error('❌ Prismaユーザー同期エラー:', dbError)
        return NextResponse.redirect(
          `${origin}/login?error=データベース同期エラーが発生しました。再度お試しください。`
        )
      }

      // ステップE: ワークスペースページにリダイレクト
      return NextResponse.redirect(`${origin}/workspace`)
    } catch (error) {
      console.error('❌ 認証コールバックエラー:', error)
      return NextResponse.redirect(`${origin}/login`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
```

---

### ステップ4: ログイン時の処理（初回ログインの場合）

メール確認後、ユーザーがログインページからログインした場合の処理。

**ファイル**: `src/app/login/actions.ts:84-122`

```typescript
  // ログイン成功時: Prismaユーザーを作成/更新
  if (authData.user) {
    try {
      // user_metadata から名前とアバターを取得
      const userName = authData.user.user_metadata?.name ||
                      authData.user.user_metadata?.full_name ||
                      authData.user.email?.split('@')[0] ||
                      'Unknown User'

      const avatarUrl = authData.user.user_metadata?.avatar_url ||
                       authData.user.user_metadata?.picture ||
                       null

      // upsert: レコードがあれば更新、なければ作成
      await prisma.user.upsert({
        where: { authId: authData.user.id },
        update: {
          // 既存ユーザーの場合はオンライン状態を更新
          isOnline: true,
          lastSeen: new Date(),
        },
        create: {
          // 新規ユーザーの場合は作成（メール確認後の初回ログイン）
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
      console.error('❌ Prismaユーザー作成/更新エラー:', dbError)
      // DB更新失敗してもログインは成功とする（致命的ではない）
    }
  }

  revalidatePath('/', 'layout')
  redirect('/workspace')
```

---

## データの対応関係

### Supabase Auth ↔ Prisma Database の連携

| Supabase Auth | Prisma Database | 説明 |
|--------------|----------------|------|
| `user.id` | `User.authId` | **連携キー**（ユニーク制約） |
| `user.email` | `User.email` | メールアドレス |
| `user.user_metadata.name` | `User.name` | ユーザー名 |
| `user.user_metadata.avatar_url` | `User.avatarUrl` | アバターURL（ソーシャル認証時） |
| - | `User.isOnline` | オンライン状態（Prisma専用） |
| - | `User.lastSeen` | 最終ログイン時刻（Prisma専用） |

### Display Name について

| フィールド | 保存場所 | 用途 | 設定されているか |
|----------|---------|------|----------------|
| `display_name` | Supabase Auth | ダッシュボード表示用 | ❌ 未設定（空） |
| `raw_user_meta_data.name` | Supabase Auth | アプリが使用する名前 | ✅ 設定済み |
| `User.name` | Prisma Database | アプリが使用する名前 | ✅ 設定済み |

**重要**: `display_name` が空でも、`raw_user_meta_data.name` に値があればアプリは正常動作します。

---

## よくある質問

### Q1: なぜ2つのデータベースを使うのですか？

**A**: 役割分担のためです。

- **Supabase Auth**: 認証専用に特化したデータベース。パスワードハッシュ化、トークン管理、セッション管理など、セキュアな認証機能を提供します。
- **Prisma Database**: アプリケーション固有のデータを柔軟に管理できます。メッセージ、チャンネル、リレーションなど、複雑なデータ構造を扱いやすくします。

### Q2: `raw_user_meta_data` とは何ですか？

**A**: Supabase Authが提供する、**カスタムデータ保存領域**です。

アプリ側で自由に使えるJSONフィールドで、サインアップ時に `options.data` として渡したデータが保存されます。

```typescript
// サインアップ時
supabase.auth.signUp({
  email: "user@example.com",
  password: "password",
  options: {
    data: {
      name: "ユーザー名",  // ← これが raw_user_meta_data に保存される
      favorite_color: "blue"  // カスタムデータも自由に追加可能
    }
  }
})

// 取得時
const userName = user.user_metadata?.name  // "ユーザー名"
const color = user.user_metadata?.favorite_color  // "blue"
```

### Q3: メール確認をスキップできますか？

**A**: 開発環境では可能です（本番環境では非推奨）。

Supabaseダッシュボード:
1. **Authentication** → **Providers** → **Email**
2. **Confirm email** を **OFF** に設定

これにより、サインアップ直後にログイン可能になります。

### Q4: `upsert` とは何ですか？

**A**: **Update または Insert** の略で、「既にあれば更新、なければ作成」する操作です。

```typescript
await prisma.user.upsert({
  where: { authId: user.id },  // この条件で検索
  update: { isOnline: true },  // 見つかれば更新
  create: { authId: user.id, name: "ちえ" }  // なければ作成
})
```

**メリット**:
- 初回ログインか再ログインかを気にせず使える
- コードがシンプルになる

### Q5: ソーシャル認証（Google、GitHubなど）の場合はどうなりますか？

**A**: 基本的な流れは同じですが、`user_metadata` の取得元が異なります。

```typescript
// Google認証の場合
const userName = user.user_metadata?.full_name ||  // Googleから取得
                user.user_metadata?.name ||
                user.email?.split('@')[0]

const avatarUrl = user.user_metadata?.picture ||  // Googleのプロフィール画像
                 null

// GitHub認証の場合
const userName = user.user_metadata?.name ||  // GitHubから取得
                user.email?.split('@')[0]

const avatarUrl = user.user_metadata?.avatar_url ||  // GitHubのアバター
                 null
```

---

## データフロー図（まとめ）

```
┌──────────────────────────────────────────────────────────────┐
│                     サインアップフロー                        │
└──────────────────────────────────────────────────────────────┘

1. ユーザー入力
   ↓
2. signup/actions.ts
   ├─ formData.get('name') → "ちえ"
   ├─ Zodバリデーション
   └─ supabase.auth.signUp({ options: { data: { name: "ちえ" } } })
   ↓
3. Supabase Auth Database
   ├─ email: "chie@example.com"
   ├─ encrypted_password: "ハッシュ化済み"
   └─ raw_user_meta_data: { name: "ちえ" } ← 保存
   ↓
4. メール確認メッセージ表示
   ↓
5. ユーザーがメールリンクをクリック
   ↓
6. auth/callback/route.ts
   ├─ exchangeCodeForSession()
   ├─ getUser() → user.user_metadata.name = "ちえ"
   └─ prisma.user.upsert({ create: { name: "ちえ", ... } })
   ↓
7. Prisma Database (PostgreSQL)
   ├─ authId: "fb4861a4-..." (Supabaseと連携)
   ├─ name: "ちえ"
   ├─ email: "chie@example.com"
   ├─ isOnline: true
   └─ lastSeen: 2025-10-27 10:30:00
   ↓
8. /workspace にリダイレクト
   ↓
✅ ログイン完了！
```

---

## 関連ファイル

### サインアップ関連
- `src/app/signup/page.tsx` - サインアップページUI
- `src/app/signup/actions.ts` - サインアップServer Action
- `src/lib/validations.ts` - Zodバリデーションスキーマ

### 認証コールバック
- `src/app/auth/callback/route.ts` - メール確認後の処理

### ログイン関連
- `src/app/login/page.tsx` - ログインページUI
- `src/app/login/actions.ts` - ログインServer Action

### Supabase設定
- `src/lib/supabase/server.ts` - サーバー側Supabaseクライアント
- `src/lib/supabase/client.ts` - クライアント側Supabaseクライアント

### データベース
- `prisma/schema.prisma` - Prismaスキーマ定義
- `src/lib/prisma.ts` - Prisma Clientインスタンス

---

## 参考資料

- [Supabase Auth ドキュメント](https://supabase.com/docs/guides/auth)
- [Prisma ORM ドキュメント](https://www.prisma.io/docs)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Zod バリデーション](https://zod.dev/)

---

**最終更新**: 2025年10月27日
**動作確認**: ✅ 新規ユーザー「ちえ」でサインアップ・メール確認・ログイン成功
