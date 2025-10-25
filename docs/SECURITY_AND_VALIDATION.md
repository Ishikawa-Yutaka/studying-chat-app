# バリデーションとセキュリティ対策ガイド

このドキュメントでは、チャットアプリに実装されているバリデーション（入力検証）とセキュリティ対策について、初心者向けに解説します。

## 目次

1. [なぜバリデーションとセキュリティが必要なのか？](#なぜバリデーションとセキュリティが必要なのか)
2. [実装されている対策一覧](#実装されている対策一覧)
3. [各対策の詳細解説](#各対策の詳細解説)
4. [実際のコード例](#実際のコード例)
5. [テスト方法](#テスト方法)

---

## なぜバリデーションとセキュリティが必要なのか？

### 問題例1: バリデーションがない場合

```typescript
// ❌ バリデーションなし
const createMessage = (content: string) => {
  // 何もチェックせずにデータベースに保存
  db.save({ content });
}

// ユーザーが100万文字のメッセージを送信
createMessage("あああああ...（100万文字）");
// → データベースがクラッシュ！
```

### 問題例2: セキュリティ対策がない場合

```typescript
// ❌ セキュリティ対策なし
// 他人のメッセージを勝手に見る攻撃
fetch('/api/messages/他人のプライベートチャンネルID');
// → 本来見えないはずのメッセージが見えてしまう！
```

### 問題例3: XSS攻撃（クロスサイトスクリプティング）

```typescript
// ❌ XSS対策なし
const userInput = "<script>alert('ハッキング！')</script>";
// HTMLとして直接表示
<div dangerouslySetInnerHTML={{__html: userInput}} />
// → スクリプトが実行されてしまう！
```

**結論**: バリデーションとセキュリティ対策がないと、アプリが壊れたり、ユーザーの情報が盗まれたりする危険があります。

---

## 実装されている対策一覧

| カテゴリ | 対策内容 | 実装場所 | 目的 |
|---------|---------|---------|------|
| **入力長制限** | メッセージ5000文字、ユーザー名50文字、メール255文字、パスワード8〜128文字 | フロントエンド＋サーバー | データベース保護、DoS攻撃防止 |
| **ファイル検証** | タイプ（画像・PDF・Office）、サイズ（10MB以下） | フロントエンド＋サーバー | 不正ファイルアップロード防止 |
| **サーバー側バリデーション** | Zodによる型チェック | API Routes | クライアント側の改ざん防止 |
| **認証・認可** | ログイン確認、チャンネルメンバーシップ確認 | API Middleware | 不正アクセス防止 |
| **XSS対策** | React自動エスケープ | コンポーネント全体 | スクリプトインジェクション防止 |
| **SQLインジェクション対策** | Prisma ORM | データベースアクセス | データベース攻撃防止 |
| **CSRF対策** | Next.js Server Actions | フォーム送信 | なりすまし攻撃防止 |

---

## 各対策の詳細解説

### 1. 入力長制限

**なぜ必要？**
- 超巨大なデータを送られるとサーバーがダウンする
- データベースの容量を使い切ってしまう
- 他のユーザーに迷惑がかかる

**実装方法**:

#### フロントエンド（ユーザーに優しい早期警告）
```typescript
// src/components/channel/messageForm.tsx
const MAX_MESSAGE_LENGTH = 5000;

<Input
  maxLength={5000}  // 5000文字以上入力できない
  placeholder="メッセージを入力"
/>
```

#### サーバー側（セキュリティの最後の砦）
```typescript
// src/lib/validations.ts
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'メッセージを入力してください')
    .max(5000, 'メッセージは5000文字以内で入力してください')
    .refine((val) => val.trim().length > 0, {
      message: '空白のみのメッセージは送信できません'
    }),
});

// src/app/api/messages/[channelId]/route.ts
const validation = messageSchema.safeParse(data);
if (!validation.success) {
  // エラーを返す（不正なデータは保存されない）
  return NextResponse.json({ error: '...' }, { status: 400 });
}
```

**具体的な制限値**:
- メッセージ: 5000文字（Discordと同じ）
- ユーザー名: 50文字
- チャンネル名: 50文字
- メールアドレス: 255文字（一般的なDB制限）
- パスワード: 8〜128文字

---

### 2. ファイル検証

**なぜ必要？**
- 悪意のあるファイル（ウイルス、巨大ファイル）のアップロード防止
- サーバーのストレージ容量保護
- 他のユーザーへの影響を防ぐ

**実装方法**:

#### 許可されたファイルタイプ
```typescript
// src/lib/validations.ts
export const allowedFileTypes = [
  // 画像
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  // PDF
  'application/pdf',
  // Microsoft Office
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  // テキスト
  'text/plain', 'text/csv',
];

export const fileSchema = z.object({
  type: z.string().refine(
    (val) => allowedFileTypes.includes(val),
    { message: '許可されていないファイル形式です' }
  ),
  size: z.number().max(10 * 1024 * 1024, 'ファイルサイズは10MB以下にしてください'),
  name: z.string().max(255, 'ファイル名は255文字以内にしてください'),
});
```

#### フロントエンドでの検証
```typescript
// src/components/channel/messageForm.tsx
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    // Zodバリデーション
    const validation = fileSchema.safeParse({
      type: file.type,
      size: file.size,
      name: file.name,
    });

    if (!validation.success) {
      // ユーザーに分かりやすいエラーメッセージを表示
      const errorMessage = validation.error.issues[0]?.message;
      alert(errorMessage);
      return;
    }

    setSelectedFile(file);
  }
};
```

**制限内容**:
- ファイルタイプ: 画像、PDF、Office文書、テキストのみ
- ファイルサイズ: 10MB以下
- ファイル名: 255文字以内

---

### 3. サーバー側バリデーション

**なぜ必要？**

フロントエンドのバリデーションは**簡単にバイパスできます**：

```bash
# ブラウザの開発者ツールで maxLength を削除
# または、直接APIを叩く
curl -X POST http://localhost:3000/api/messages/channel123 \
  -H "Content-Type: application/json" \
  -d '{"content": "あああ...(100万文字)", "senderId": "user123"}'
```

→ フロントエンドのバリデーションだけでは不十分！

**実装方法**:

#### サーバー側で必ずチェック
```typescript
// src/app/api/messages/[channelId]/route.ts
export async function POST(request: NextRequest, { params }) {
  const body = await request.json();

  // Zodバリデーション（型安全）
  const validation = messageSchema.safeParse({
    content: body.content,
    senderId: body.senderId,
    channelId: channelId,
  });

  if (!validation.success) {
    // バリデーションエラー時、不正なデータは絶対に保存されない
    console.error('バリデーションエラー:', validation.error.issues);
    return NextResponse.json({
      success: false,
      error: validation.error.issues[0]?.message,
    }, { status: 400 });
  }

  // バリデーション成功後のデータのみ使用
  const { content, senderId } = validation.data;

  // データベースに保存
  await prisma.message.create({ data: { content, senderId, channelId } });
}
```

**Zodを使う理由**:
- TypeScriptの型と整合性がとれる
- エラーメッセージが分かりやすい
- コードが読みやすい

---

### 4. 認証・認可チェック

**なぜ必要？**

```typescript
// ❌ 認証・認可チェックなし
// 悪意のあるユーザーがURLを直接叩く
fetch('/api/messages/プライベートチャンネルID');
// → 本来見えないメッセージが見えてしまう！
```

**実装方法**:

#### 認証チェック（ログインしているか？）
```typescript
// src/lib/auth-server.ts
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: '認証が必要です',
      status: 401  // Unauthorized
    };
  }

  return { user, error: null, status: 200 };
}
```

#### 認可チェック（このチャンネルのメンバーか？）
```typescript
// src/lib/auth-server.ts
export async function checkChannelMembership(userId: string, channelId: string) {
  const membership = await prisma.channelMember.findFirst({
    where: {
      userId: userId,
      channelId: channelId
    }
  });

  if (!membership) {
    return {
      isMember: false,
      error: 'このチャンネルにアクセスする権限がありません',
      status: 403  // Forbidden
    };
  }

  return { isMember: true, error: null, status: 200 };
}
```

#### APIでの使用例
```typescript
// src/app/api/messages/[channelId]/route.ts
export async function POST(request: NextRequest, { params }) {
  // 1. 認証チェック
  const { user, error: authError, status: authStatus } = await getCurrentUser();
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: authStatus });
  }

  // 2. 認可チェック
  const { isMember, error: memberError, status: memberStatus } =
    await checkChannelMembership(user.id, channelId);
  if (!isMember) {
    return NextResponse.json({ error: memberError }, { status: memberStatus });
  }

  // 3. ここまで来たら、このユーザーはこのチャンネルのメンバー
  // メッセージを保存する処理
}
```

**保護されているAPI**:
- メッセージ取得: `GET /api/messages/[channelId]`
- メッセージ送信: `POST /api/messages/[channelId]`
- チャンネル情報取得: `GET /api/channels/[channelId]`

---

### 5. XSS対策（クロスサイトスクリプティング）

**XSSとは？**

悪意のあるユーザーがスクリプトを含むメッセージを送信し、他のユーザーのブラウザで実行させる攻撃。

```typescript
// 攻撃者が送信
const maliciousMessage = "<script>alert('ハッキング！')</script>";

// ❌ XSS脆弱性あり
<div dangerouslySetInnerHTML={{__html: maliciousMessage}} />
// → スクリプトが実行されてしまう！

// ✅ 安全（React自動エスケープ）
<p>{maliciousMessage}</p>
// → "<script>alert('ハッキング！')</script>" とテキストで表示される
// → スクリプトは実行されない
```

**実装方法**:

#### React自動エスケープを活用
```typescript
// src/components/channel/messageView.tsx
<div className="message">
  {/* ✅ 安全: Reactが自動的にエスケープ */}
  <p>{message.content}</p>
  <span>{message.sender.name}</span>
</div>

// ❌ 危険: dangerouslySetInnerHTMLは絶対に使わない
<div dangerouslySetInnerHTML={{__html: message.content}} />
```

#### チェックポイント
```bash
# プロジェクト全体で dangerouslySetInnerHTML が使われていないか確認
grep -r "dangerouslySetInnerHTML" src/
# → 結果: 見つからない（安全）
```

**エスケープの仕組み**:

| 入力 | エスケープ前 | エスケープ後 | 結果 |
|------|------------|------------|------|
| `<script>alert('XSS')</script>` | そのまま実行 | `&lt;script&gt;alert('XSS')&lt;/script&gt;` | テキストとして表示 |
| `<img src=x onerror=alert('XSS')>` | 画像エラーで実行 | `&lt;img src=x onerror=alert('XSS')&gt;` | テキストとして表示 |

---

### 6. SQLインジェクション対策

**SQLインジェクションとは？**

```sql
-- ❌ 生のSQL（危険）
SELECT * FROM messages WHERE channelId = '${userInput}';

-- ユーザーが以下を入力
userInput = "1' OR '1'='1";

-- 実行されるSQL
SELECT * FROM messages WHERE channelId = '1' OR '1'='1';
-- → すべてのメッセージが取得されてしまう！
```

**実装方法**:

#### Prisma ORMを使用（自動的に安全）
```typescript
// ✅ 安全: Prismaは自動的にプリペアドステートメントを使用
const messages = await prisma.message.findMany({
  where: {
    channelId: userInput  // ← どんな値が入っても安全
  }
});

// Prismaが内部的に以下のように処理
// SELECT * FROM messages WHERE channelId = ? (プレースホルダー)
// パラメータ: [userInput]
// → SQLインジェクションは不可能
```

**Prismaを使うメリット**:
- プリペアドステートメント（パラメータ化されたクエリ）を自動使用
- TypeScript型チェック
- SQLを書かなくても安全

---

### 7. CSRF対策（クロスサイトリクエストフォージェリ）

**CSRFとは？**

悪意のあるサイトから、ユーザーが気づかないうちに別のサイトにリクエストを送信させる攻撃。

```html
<!-- 攻撃者のサイト（evil.com） -->
<form action="https://your-chat-app.com/api/messages" method="POST">
  <input type="hidden" name="content" value="スパムメッセージ" />
  <input type="hidden" name="channelId" value="channel123" />
</form>
<script>
  // ユーザーが知らない間に自動送信
  document.forms[0].submit();
</script>
```

**実装方法**:

#### Next.js Server Actionsを使用（自動保護）
```typescript
// src/app/login/actions.ts
'use server'  // ← これがCSRF保護を自動で有効化

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Next.jsが自動的にCSRFトークンを検証
  await supabase.auth.signInWithPassword({ email, password });
}
```

**Next.jsの仕組み**:
1. Server Actionを呼び出す時、自動的にCSRFトークンが送信される
2. サーバー側で自動的にトークンを検証
3. トークンが一致しない場合、リクエストを拒否

→ 開発者は何もしなくても保護される！

---

## 実際のコード例

### 完全な例: メッセージ送信フロー

```typescript
// 1. フロントエンド（src/components/channel/messageForm.tsx）
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // クライアント側の早期チェック（UX向上）
  if (content.length > MAX_MESSAGE_LENGTH) {
    alert(`メッセージは${MAX_MESSAGE_LENGTH}文字以内で入力してください`);
    return;
  }

  // APIリクエスト
  const response = await fetch(`/api/messages/${channelId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: content,
      senderId: myUserId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    // サーバー側のバリデーションエラーを表示
    alert(data.error);
  }
};

// 2. サーバー側（src/app/api/messages/[channelId]/route.ts）
export async function POST(request: NextRequest, { params }) {
  const { channelId } = await params;
  const body = await request.json();

  // ステップ1: Zodバリデーション
  const validation = messageSchema.safeParse({
    content: body.content,
    senderId: body.senderId,
    channelId: channelId,
  });

  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error.issues[0]?.message,
    }, { status: 400 });
  }

  const { content, senderId } = validation.data;

  // ステップ2: 認証チェック
  const { user, error: authError, status: authStatus } = await getCurrentUser();
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: authStatus });
  }

  // ステップ3: 認可チェック
  const { isMember, error: memberError, status: memberStatus } =
    await checkChannelMembership(user.id, channelId);
  if (!isMember) {
    return NextResponse.json({ error: memberError }, { status: memberStatus });
  }

  // ステップ4: データベースに保存（Prisma ORMで安全）
  const newMessage = await prisma.message.create({
    data: {
      content: content,  // ← バリデーション済み
      senderId: sender.id,
      channelId: channelId,
    },
  });

  return NextResponse.json({ success: true, message: newMessage });
}

// 3. フロントエンド表示（src/components/channel/messageView.tsx）
{messages.map((message) => (
  <div key={message.id}>
    {/* React自動エスケープでXSS防止 */}
    <p>{message.content}</p>
    <span>{message.sender.name}</span>
  </div>
))}
```

---

## テスト方法

### 1. 入力長制限のテスト

#### テスト手順
1. メッセージ入力欄に5000文字以上入力を試みる
2. → 5000文字以上入力できないことを確認
3. 開発者ツールでHTMLを直接編集し、`maxLength`属性を削除
4. 5001文字以上のメッセージを送信
5. → サーバーがエラーを返すことを確認

```bash
# コマンドラインからテスト
curl -X POST http://localhost:3000/api/messages/channel123 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "あああ...（5001文字）",
    "senderId": "user123"
  }'

# 期待される結果
{
  "success": false,
  "error": "メッセージは5000文字以内で入力してください"
}
```

### 2. ファイル検証のテスト

#### テスト手順
1. 許可されていないファイル（例: .exe）をアップロード
2. → エラーメッセージが表示されることを確認
3. 10MB以上のファイルをアップロード
4. → エラーメッセージが表示されることを確認

### 3. 認可チェックのテスト

#### テスト手順
1. ユーザーAでログイン
2. ユーザーBだけが参加しているプライベートチャンネルのURLを取得
3. ユーザーAでそのURLにアクセス
4. → 「このチャンネルにアクセスする権限がありません」と表示されることを確認

```bash
# コマンドラインからテスト
curl http://localhost:3000/api/messages/他人のチャンネルID \
  -H "Cookie: ユーザーAのセッションクッキー"

# 期待される結果
{
  "success": false,
  "error": "このチャンネルにアクセスする権限がありません"
}
```

### 4. XSS対策のテスト

#### テスト手順
1. メッセージに `<script>alert('XSS')</script>` を入力して送信
2. → 画面に「<script>alert('XSS')</script>」とテキストで表示される
3. アラートは表示されない
4. → XSS対策が機能していることを確認

### 5. SQLインジェクション対策のテスト

#### テスト手順
```bash
# SQLインジェクションを試みる
curl http://localhost:3000/api/messages/1%27%20OR%20%271%27%3D%271

# 期待される結果
{
  "success": false,
  "error": "チャンネルが見つかりません"
}
# → エラーが返り、すべてのメッセージが取得されないことを確認
```

---

## まとめ

### セキュリティの多層防御（Defense in Depth）

```
┌─────────────────────────────────────┐
│ レイヤー1: フロントエンド            │
│ - HTML5バリデーション                │
│ - maxLength, minLength属性           │
│ - React自動エスケープ                │
│ → ユーザーに優しい早期警告           │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ レイヤー2: サーバー側バリデーション  │
│ - Zodスキーマ検証                    │
│ - 型安全なバリデーション             │
│ → 不正なデータは絶対に通さない       │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ レイヤー3: 認証・認可                │
│ - Supabase Auth（認証）              │
│ - チャンネルメンバーシップ確認（認可）│
│ → 不正アクセスを防止                 │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ レイヤー4: データベース              │
│ - Prisma ORM（SQLインジェクション防止）│
│ - トランザクション処理               │
│ → データの整合性を保証               │
└─────────────────────────────────────┘
```

### チェックリスト

実装済みの対策を確認しましょう：

- [x] メッセージの文字数制限（5000文字）
- [x] ユーザー名の文字数制限（50文字）
- [x] メールアドレスの形式チェックと文字数制限（255文字）
- [x] パスワードの長さ制限（8〜128文字）
- [x] ファイルタイプ検証（画像、PDF、Officeのみ）
- [x] ファイルサイズ制限（10MB以下）
- [x] サーバー側Zodバリデーション（メッセージ、サインアップ、ログイン）
- [x] 認証チェック（ログインユーザーのみアクセス可能）
- [x] 認可チェック（チャンネルメンバーのみメッセージ送受信可能）
- [x] XSS対策（React自動エスケープ、dangerouslySetInnerHTML未使用）
- [x] SQLインジェクション対策（Prisma ORM使用）
- [x] CSRF対策（Next.js Server Actions自動保護）

### 参考リンク

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Webアプリケーションの主要なセキュリティリスク
- [Zod Documentation](https://zod.dev/) - TypeScript型安全バリデーションライブラリ
- [React Security](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html) - Reactのセキュリティベストプラクティス
- [Prisma Security](https://www.prisma.io/docs/guides/security) - Prismaのセキュリティガイド

---

**更新日**: 2025-10-25
**作成者**: Claude Code
