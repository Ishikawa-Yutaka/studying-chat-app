# コンテキスト引き継ぎ 12 - APIセキュリティ共通関数化

**作成日**: 2025-10-21
**前回**: CONTEXT_HANDOVER_11.md（アバター手動アップロード実装）

---

## 今回の作業内容

### 1. APIセキュリティの共通関数化

**背景**: 以前に`/api/messages/[channelId]`と`/api/dashboard`でセキュリティ強化を実装したが、認証チェックのコードが重複していた。

**解決策**: 認証ロジックを共通関数に切り出し、全APIで統一的に使用するようにした。

---

## 実装した機能

### A. 共通認証関数の作成

#### ファイル: `src/lib/auth-server.ts` (新規作成)

**理由**: `src/lib/auth.ts`はクライアント側のソーシャル認証関数を含むため、サーバー専用の認証関数を別ファイルに分離。

**提供する関数**:

```typescript
// 1. 現在ログインしているユーザーを取得
export async function getCurrentUser() {
  // Supabase認証トークン検証 + Prismaユーザー取得
  return { user, error, status };
}

// 2. チャンネルメンバーシップ確認
export async function checkChannelMembership(userId: string, channelId: string) {
  // ユーザーがチャンネルのメンバーか確認
  return { isMember, error, status };
}
```

**使用例**:
```typescript
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server';

const { user, error, status } = await getCurrentUser();
if (error) return NextResponse.json({ error }, { status });

const { isMember, error, status } = await checkChannelMembership(user.id, channelId);
if (!isMember) return NextResponse.json({ error }, { status });
```

---

### B. 修正したAPIファイル一覧

#### 1. `/api/dashboard/route.ts`
- **変更前**: URLパラメータ `?userId=xxx` から取得
- **変更後**: 認証トークンから自動取得（共通関数使用）
- **セキュリティ**: 他のユーザーのダッシュボードは絶対に見れない

#### 2. `/api/channel/[channelId]/route.ts`
- **変更前**: 認証チェックなし
- **変更後**: 認証 + メンバーシップ確認（共通関数使用）
- **セキュリティ**: 未参加のチャンネルは絶対に見れない

#### 3. `/api/messages/[channelId]/route.ts`
- **変更前**: 直接認証コードを記述（74行）
- **変更後**: 共通関数使用（34行に短縮）
- **セキュリティ**: 既に強化済みだったが、コードを簡潔化

#### 4. `/api/threads/[messageId]/route.ts` (GET & POST)
- **変更前**: **認証チェックなし**（重大な脆弱性！）
- **変更後**: 認証 + メンバーシップ確認（共通関数使用）
- **セキュリティ**: 参加していないチャンネルのスレッドは絶対に見れない

#### 5. `/api/channels/route.ts` (GET & POST)
- **変更前**: 直接認証コードを記述
- **変更後**: 共通関数使用
- **セキュリティ**: 既に強化済みだったが、コードを簡潔化

#### 6. `/api/avatar/upload/route.ts`
- **変更前**: 直接認証コードを記述
- **変更後**: 共通関数使用（Supabase Storageアクセス用に`createClient()`も併用）
- **セキュリティ**: 既に強化済みだったが、コードを簡潔化

---

## 重要な発見

### スレッドAPI (`/api/threads/[messageId]`) に認証がなかった！

**問題**:
- GET: 誰でもスレッドを読める（チャンネルメンバーでなくても）
- POST: 誰でもスレッド返信を送信できる

**修正内容**:
1. 認証チェック追加
2. 親メッセージが属するチャンネルのメンバーシップ確認
3. メンバーのみがスレッドを閲覧・返信可能に

---

## ファイル構成の変更

### 修正・追加されたファイル

```
src/lib/
├── auth.ts              (修正) クライアント側専用（ソーシャル認証）
└── auth-server.ts       (新規) サーバー側専用（API認証チェック）

src/app/api/
├── dashboard/route.ts                (修正) 共通関数使用
├── channel/[channelId]/route.ts      (修正) 共通関数使用
├── messages/[channelId]/route.ts     (修正) 共通関数使用
├── threads/[messageId]/route.ts      (修正) 認証追加 + 共通関数使用
├── channels/route.ts                 (修正) 共通関数使用
└── avatar/upload/route.ts            (修正) 共通関数使用
```

---

## セキュリティ強化のまとめ

### 保護されている機能

| API | 認証 | メンバーシップ確認 | 説明 |
|-----|------|------------------|------|
| `/api/dashboard` | ✅ | - | 自分のダッシュボードのみ表示 |
| `/api/channel/[channelId]` | ✅ | ✅ | 参加チャンネルのみ情報取得可能 |
| `/api/messages/[channelId]` | ✅ | ✅ | 参加チャンネルのメッセージのみ取得 |
| `/api/threads/[messageId]` | ✅ | ✅ | 参加チャンネルのスレッドのみ閲覧・返信可能 |
| `/api/channels` (GET) | ✅ | - | 自分が参加しているチャンネル一覧のみ |
| `/api/channels` (POST) | ✅ | - | ログインユーザーのみチャンネル作成可能 |
| `/api/avatar/upload` | ✅ | - | 自分のアバターのみアップロード可能 |

### 攻撃者が試みても...

```
攻撃者: 「他人のデータを見たい！」

試み1: URLパラメータを変更
  → 効果なし（もうuserIdパラメータは使っていない）

試み2: チャンネルIDを直接入力
  → 403エラー（メンバーではないため拒否）

試み3: 認証トークンを偽造
  → 不可能（Supabaseが暗号検証）

結果: 諦めるしかない
```

---

## コード削減効果

共通関数を使用することで、コードが大幅に簡潔化：

| API | 変更前 | 変更後 | 削減率 |
|-----|--------|--------|--------|
| `/api/messages/[channelId]` | 74行 | 34行 | -54% |
| `/api/dashboard` | 36行 | 19行 | -47% |
| `/api/channel/[channelId]` | なし→ | 42行 | 新規追加 |
| `/api/channels` (POST) | 44行 | 25行 | -43% |

**メリット**:
- コードの重複を削減
- 変更時に1箇所（`auth-server.ts`）を修正すればよい
- 読みやすく、メンテナンスしやすい

---

## 次のタスク

### 1. テスト（最優先）

以下の機能が正常に動作するか確認：

- [ ] ログイン
- [ ] ダッシュボード表示
- [ ] チャンネル一覧表示
- [ ] チャンネルをクリック→メッセージ表示
- [ ] メッセージ送信
- [ ] **スレッド機能**（メッセージに返信） ← 認証追加したのでテスト必須
- [ ] アバターアップロード

### 2. コミット・プッシュ

**変更されたファイル**:
```
modified:   src/lib/auth.ts
new file:   src/lib/auth-server.ts
modified:   src/app/api/dashboard/route.ts
modified:   src/app/api/channel/[channelId]/route.ts
modified:   src/app/api/messages/[channelId]/route.ts
modified:   src/app/api/threads/[messageId]/route.ts
modified:   src/app/api/channels/route.ts
modified:   src/app/api/avatar/upload/route.ts
```

**コミットメッセージ案**:
```
feat: APIセキュリティを共通関数化してコード簡潔化

- 認証チェック用の共通関数を作成 (auth-server.ts)
  - getCurrentUser(): 認証トークンからユーザー取得
  - checkChannelMembership(): チャンネルメンバーシップ確認

- セキュリティ強化したAPI:
  - /api/dashboard: 認証トークンベースに変更
  - /api/channel/[channelId]: 認証+メンバーシップ確認を追加
  - /api/threads/[messageId]: 認証追加（重大な脆弱性を修正）
  - /api/messages/[channelId]: 共通関数使用（コード54%削減）
  - /api/channels: 共通関数使用
  - /api/avatar/upload: 共通関数使用

- コードの重複を削減し、メンテナンス性向上
- クライアント/サーバー認証関数を分離

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 技術的な注意点

### `src/lib/auth.ts` vs `src/lib/auth-server.ts`

**問題**: 最初は1つのファイルにまとめていたが、以下のエラーが発生：
```
Error: You're importing a component that needs "next/headers".
That only works in a Server Component
```

**原因**: `next/headers`を使用するコードがクライアント側でも読み込まれてしまう。

**解決策**: ファイルを分離
- `auth.ts`: クライアント側専用（ソーシャル認証）
- `auth-server.ts`: サーバー側専用（API認証チェック）

---

## 未対応の項目

以下のAPIファイルは今回の対象外（必要に応じて後で対応）:

- `/api/dm/*` - DM関連API
- `/api/ai/*` - AI機能（未実装）
- `/api/upload/*` - ファイルアップロード（既に認証済み）
- `/api/debug/*` - デバッグ用API（開発環境のみ）
- `/api/seed*` - テストデータ生成API

---

## 既知の問題

### 文字化け問題

**症状**: コンソールログの絵文字が文字化けする

**原因**: ターミナルの文字エンコーディング設定

**対応**: CLAUDE.mdに「絵文字は使用しない」と記載されているが、既存のコンソールログには絵文字が多数使用されている。

**次回の対応候補**:
```typescript
// 現在
console.log("✅ 認証成功");
console.error("❌ エラー");

// 修正案
console.log("[SUCCESS] 認証成功");
console.error("[ERROR] エラー");
```

---

## ドキュメント

関連ドキュメント:
- `docs/API_SECURITY_AUTHENTICATION.md` - セキュリティ強化の詳細説明（初心者向け）

---

## 次回への引き継ぎ

1. **テストを実行**して、すべての機能が正常に動作するか確認
2. 問題なければ**コミット・プッシュ**
3. 文字化け問題を解決したい場合は、コンソールログの絵文字を削除

---

作成者: Claude Code
引き継ぎ先: 次のセッション
