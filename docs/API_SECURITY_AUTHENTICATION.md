# APIセキュリティ：認証トークンベースの実装（初心者向け）

## 目次
1. [問題点：何が危険だったのか](#問題点何が危険だったのか)
2. [解決策：認証トークンベースの実装](#解決策認証トークンベースの実装)
3. [なぜ安全になったのか](#なぜ安全になったのか)
4. [認証の仕組み（2段階の流れ）](#認証の仕組み2段階の流れ)
5. [具体例で比較](#具体例で比較)
6. [技術用語の説明](#技術用語の説明)

---

## 問題点：何が危険だったのか

### 変更前の実装（脆弱）

**`/api/messages/[channelId]` API（メッセージ取得）**

```typescript
// ❌ 悪い例：クエリパラメーターをそのまま信用
export async function GET(request: NextRequest) {
  const userId = url.searchParams.get('userId');  // URLから取得

  // このuserIdを使ってメッセージを取得
  const messages = await prisma.message.findMany({
    where: { channelId: channelId }
  });

  return messages;  // 誰でも見れてしまう！
}
```

**フロントエンド側**
```typescript
// ブラウザから呼び出し
fetch(`/api/messages/channel123?userId=user456`)
```

### なぜ危険なのか？

#### 問題1: URLは誰でも変更できる

```
悪意のあるユーザーの操作：

1. 自分のID: user456
2. ブラウザの開発者ツール（F12）を開く
3. URLを手動で書き換える:
   /api/messages/channel123?userId=user789  ← 他人のID

結果：他人のメッセージが見れてしまう！
```

#### 問題2: チャンネルメンバーシップのチェックがない

```
1. ユーザーAは「開発チャンネル」のメンバーではない
2. でもチャンネルID（channel123）を知っている
3. URLを直接入力:
   /api/messages/channel123

結果：参加していないチャンネルのメッセージが見れてしまう！
```

#### 実際の被害例（もし悪用されたら）

```
攻撃者の手順：
1. 自分のアカウントでログイン
2. チャンネル一覧からチャンネルIDを取得
3. URLを手動で変更してアクセス
   → 本来見れないチャンネルのメッセージを盗み見

機密情報が漏洩する危険性！
```

---

## 解決策：認証トークンベースの実装

### 変更後の実装（安全）

**`/api/messages/[channelId]` API（セキュリティ強化版）**

```typescript
// ✅ 良い例：認証トークンから現在のユーザーを取得
export async function GET(request: NextRequest) {
  // ステップ1: 認証トークンから現在のユーザーを取得
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // ステップ2: Prismaデータベースからユーザー情報を取得
  const currentUser = await prisma.user.findFirst({
    where: { authId: authUser.id }
  });

  // ステップ3: このユーザーがチャンネルのメンバーか確認
  const membership = await prisma.channelMember.findFirst({
    where: {
      channelId: channelId,
      userId: currentUser.id
    }
  });

  if (!membership) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  // ステップ4: メンバーだけがメッセージを取得できる
  const messages = await prisma.message.findMany({
    where: { channelId: channelId }
  });

  return messages;
}
```

**フロントエンド側**
```typescript
// ✅ userIdパラメーターを削除
fetch('/api/messages/channel123')  // パラメーターなし
```

---

## なぜ安全になったのか

### 認証トークンとは？

**ログイン時に発行される秘密の鍵**

```
ログインの流れ：

1. ユーザーがGoogleでログイン
   ↓
2. Supabaseが認証トークンを発行
   ↓
3. ブラウザがこのトークンを自動的に保存（Cookie）
   ↓
4. API呼び出し時、自動的にトークンが送られる
   ↓
5. サーバー側でトークンを検証
   → 「このユーザーは本人だ」と確認
```

### 改ざん不可能な理由

**クエリパラメーター（脆弱）**
```
❌ /api/messages/channel123?userId=user456
   ↑ URLはブラウザで簡単に変更できる
```

**認証トークン（安全）**
```
✅ Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ↑ 暗号化された文字列
   ↑ ブラウザから変更不可能
   ↑ Supabaseが検証して本物か確認
```

### 悪意のあるユーザーが試みても...

```
攻撃者：「他人のIDでアクセスしたい！」
↓
試み1: URLを変更
   → 効果なし（もうuserIdパラメーターは使っていない）

試み2: 認証トークンを偽造
   → 不可能（暗号化されていて改ざんできない）

試み3: 他人のトークンを盗む
   → 不可能（HTTPSで保護されているため盗めない）

結果：諦めるしかない
```

---

## 認証の仕組み（2段階の流れ）

### データベースの構造

```
[Supabase Auth Database]        [Prisma Database (PostgreSQL)]
認証情報を管理                   アプリデータを管理
━━━━━━━━━━━━━━━━━━━━━━        ━━━━━━━━━━━━━━━━━━━━━━━━━
authId: taro-auth-123           id: prisma-user-456
email: taro@example.com         authId: taro-auth-123  ← ここで紐付け
password: (ハッシュ化)           name: 田中太郎
token: eyJhbG...                email: taro@example.com
                                avatarUrl: https://...
                                ↓
                               メッセージ、チャンネルなど
```

### ステップ1: 認証トークンの検証（ここで一致確認）

```typescript
// ステップ1: 認証トークンから現在のユーザーを取得
const supabase = await createClient();
const { data: { user: authUser }, error } = await supabase.auth.getUser();
```

**ここで何が起きているか：**

```
1. ブラウザから送られてきた認証トークンを取得
   ↓
2. Supabaseが内部で検証
   - 「このトークンは本物か？」
   - 「有効期限は切れていないか？」
   - 「改ざんされていないか？」
   ↓
3. 検証成功 → authUser（ユーザー情報）を返す
   検証失敗 → error（エラー）を返す
```

**つまり、`supabase.auth.getUser()`の時点で既に一致確認済み！**

### ステップ2: データベースから詳細情報を取得

```typescript
// ステップ2: Prismaデータベースからユーザー情報を取得
const currentUser = await prisma.user.findFirst({
  where: { authId: authUser.id }
});
```

**ここで何が起きているか：**

```
1. authUser.id = "abc123"（Supabaseが検証済みのID）
2. Prismaデータベースで「authId = "abc123"のユーザー」を探す
3. 見つかったユーザーの詳細情報を取得
   - id（Prisma内部ID）
   - name（ユーザー名）
   - email（メールアドレス）
   - avatarUrl（アバター画像）
```

**なぜこのステップが必要？**

SupabaseとPrismaは**別々のデータベース**だからです：

| データベース | 役割 | 保存データ |
|------------|------|----------|
| **Supabase Auth** | 認証専用 | authId, パスワード, トークン |
| **Prisma Database** | アプリデータ | ユーザー名, メッセージ, チャンネル |

### 具体例：太郎がログインした場合

**ステップ1: 認証トークンの検証**

```
1. 太郎がGoogleでログイン
2. Supabaseが認証トークンを発行
   → トークン内容: { authId: "taro-auth-123", email: "taro@example.com" }
3. 太郎がAPIを呼び出す
4. supabase.auth.getUser() を実行

Supabaseの内部処理:
- トークンを復号化
- 署名を検証（改ざんされていないか？）
- 有効期限をチェック
- ✅ OK → authUser = { id: "taro-auth-123", email: "taro@example.com" }
```

**この時点で「このトークンは本物で、太郎のものだ」と確認済み**

**ステップ2: Prismaデータベースから詳細情報を取得**

```
1. authUser.id = "taro-auth-123"（検証済み）
2. Prismaで検索:
   SELECT * FROM User WHERE authId = "taro-auth-123"
3. 結果:
   {
     id: "prisma-user-456",
     name: "田中太郎",
     email: "taro@example.com",
     authId: "taro-auth-123",
     avatarUrl: "https://..."
   }
```

**ここでは検索しているだけ（検証は既に終わっている）**

### まとめ：2段階の役割

```typescript
// ステップ1: ここで認証トークンとユーザーの一致を確認
const { data: { user: authUser }, error } = await supabase.auth.getUser();
// ↑ Supabaseが「このトークンは本物で、このユーザーのものだ」と検証

if (error || !authUser) {
  // トークンが無効 or 改ざんされている
  return エラー;
}

// ステップ2: ここでは検証済みのIDを使ってデータを取得
const currentUser = await prisma.user.findFirst({
  where: { authId: authUser.id }  // ← 検証済みのIDを使用
});
// ↑ もう検証は済んでいるので、単にデータを引っ張ってくるだけ
```

**つまり：**
- ✅ **一致確認はステップ1で実施済み**（Supabaseが検証）
- ✅ **ステップ2は検証済みIDでデータ取得**（検証ではない）

**セキュリティポイント：**
```
悪意のあるユーザーが偽のトークンを送っても...
↓
ステップ1でSupabaseが「このトークンは偽物だ！」と判定
↓
errorが返される
↓
ステップ2には到達しない（その前にエラーで弾かれる）
```

---

## 具体例で比較

### シナリオ：太郎が花子のメッセージを盗み見ようとする

#### 変更前（脆弱な実装）

```
1. 太郎がログイン（自分のID: taro123）
2. 開発者ツール（F12）を開く
3. ネットワークタブで花子のIDを見つける（hanako456）
4. URLを手動で変更:
   /api/messages/channel123?userId=hanako456
5. リクエスト送信

結果：
✅ APIは「hanako456のメッセージください」と受け取る
✅ 花子のメッセージが取得できてしまう！
❌ 太郎が花子のプライベートメッセージを読める
```

#### 変更後（安全な実装）

```
1. 太郎がログイン（認証トークンが発行される）
2. URLを変更しようとする
   /api/messages/channel123?userId=hanako456
3. リクエスト送信

APIの処理：
1. URLパラメーターは無視
2. 認証トークンを確認
   → 「このトークンは太郎のものだ」
3. データベースで太郎の情報を取得
4. チャンネルメンバーシップを確認
   → 「太郎はこのチャンネルのメンバーか？」
5. メンバーなら太郎のメッセージを返す
   メンバーでないなら「アクセス権限がありません」

結果：
✅ 太郎は自分のメッセージしか見れない
❌ URLを変更しても無駄（認証トークンで判定するため）
```

---

## 改善のまとめ

### Before（変更前）

| 問題 | 説明 |
|------|------|
| ❌ URLで他人になりすませる | `?userId=他人のID` を指定すれば他人のデータが取得できた |
| ❌ チェック機能なし | チャンネルのメンバーでなくてもアクセスできた |
| ❌ 誰でも見放題 | チャンネルIDさえ知っていれば誰でもメッセージを見れた |

### After（変更後）

| 改善 | 説明 |
|------|------|
| ✅ 本人確認が必須 | 認証トークンで「この人は本当にログインしているか？」を確認 |
| ✅ メンバーシップ確認 | 「この人はこのチャンネルのメンバーか？」を確認 |
| ✅ 改ざん不可能 | URLを変更しても無駄（トークンで判定） |
| ✅ データ漏洩防止 | 自分が参加しているチャンネルのメッセージしか見れない |

---

## 技術用語の説明

### 認証トークン（Authentication Token）
```
ログイン時に発行される「身分証明書」のようなもの。
暗号化されていて、本人しか使えない。
```

### クエリパラメーター（Query Parameter）
```
URLの後ろに付ける情報。
例: ?userId=123&name=太郎

簡単に変更できるので、セキュリティには使えない。
```

### チャンネルメンバーシップ（Channel Membership）
```
「誰がどのチャンネルに参加しているか」の記録。
データベースで管理されている。
```

### ステータスコード（HTTP Status Code）
```
APIの結果を表す数字：
- 200: 成功
- 401: 認証が必要（ログインしてください）
- 403: 権限がない（アクセス禁止）
- 404: 見つからない
- 500: サーバーエラー
```

---

## セキュリティ強化したAPI一覧

| API | 変更内容 |
|-----|---------|
| **`/api/messages/[channelId]` GET** | 認証チェック + チャンネルメンバーシップ確認を追加 |
| **`/api/channels` GET** | userIdパラメーターを削除し、認証トークンのみを使用 |

---

## 参考資料

- `CLAUDE.md` - プロジェクト全体のアーキテクチャ
- `DATABASE_ACCESS_PATTERNS.md` - Prisma vs Supabase SDK
- `troubleshooting/SUPABASE_AUTH_INTEGRATION.md` - 認証統合

---

作成日: 2025-10-21
目的: APIセキュリティ強化の理解（初心者向け）
