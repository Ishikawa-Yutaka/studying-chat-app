# テストディレクトリ構成ガイド

このディレクトリには、プロジェクトのすべてのテストファイルが含まれます。

## ディレクトリ構成

```
src/
├── __tests__/           # テストファイルのルートディレクトリ
│   ├── unit/           # ユニットテスト（関数・ロジック単位）
│   ├── components/     # コンポーネントテスト（React コンポーネント）
│   ├── api/            # API テスト（エンドポイントの動作）
│   └── integration/    # 統合テスト（複数の機能を組み合わせたテスト）
│
└── __mocks__/          # モックファイル（MSW ハンドラーなど）
    ├── handlers.ts     # API モックハンドラー
    └── server.ts       # MSW サーバー設定
```

## 各ディレクトリの役割

### 1. `unit/` - ユニットテスト

**目的**: 個別の関数・ユーティリティ・カスタムフックのテスト

**テスト対象の例**:
- 認証関数（`email-auth.ts`, `social-auth.ts`）
- ユーティリティ関数
- カスタムフック（`useAuth`, `useRealtimeMessages`）
- バリデーション関数

**ファイル命名規則**: `<ファイル名>.test.ts` または `<機能名>.test.ts`

**例**:
```
unit/
├── email-auth.test.ts           # メール認証関数のテスト
├── social-auth.test.ts          # ソーシャル認証関数のテスト
├── useAuth.test.tsx             # useAuth フックのテスト
└── useRealtimeMessages.test.tsx # useRealtimeMessages フックのテスト
```

**サンプルテストコード**:
```typescript
// unit/email-auth.test.ts
import { signInWithEmail, signUpWithEmail } from '@/utils/email-auth'

describe('メール認証関数', () => {
  test('正しいメールアドレスとパスワードでログインできる', async () => {
    const result = await signInWithEmail('test@example.com', 'password123')
    expect(result.success).toBe(true)
  })

  test('メールアドレス形式が不正な場合エラーになる', async () => {
    await expect(
      signInWithEmail('invalid-email', 'password123')
    ).rejects.toThrow()
  })
})
```

### 2. `components/` - コンポーネントテスト

**目的**: React コンポーネントの表示・動作のテスト

**テスト対象の例**:
- メッセージ表示コンポーネント（`messageView.tsx`）
- サイドバーコンポーネント（`channelList.tsx`, `directMessageList.tsx`）
- フォームコンポーネント（`messageForm.tsx`）
- ヘッダーコンポーネント

**ファイル命名規則**: `<コンポーネント名>.test.tsx`

**例**:
```
components/
├── messageView.test.tsx       # メッセージ表示コンポーネント
├── channelList.test.tsx       # チャンネルリスト
├── directMessageList.test.tsx # DM リスト
└── messageForm.test.tsx       # メッセージ送信フォーム
```

**サンプルテストコード**:
```typescript
// components/messageView.test.tsx
import { render, screen } from '@testing-library/react'
import { MessageView } from '@/components/channel/messageView'

describe('MessageView コンポーネント', () => {
  const mockMessages = [
    {
      id: '1',
      content: 'こんにちは',
      sender: { id: 'user-1', name: 'テストユーザー' },
      createdAt: new Date().toISOString(),
    },
  ]

  test('メッセージが正しく表示される', () => {
    render(<MessageView messages={mockMessages} />)

    expect(screen.getByText('こんにちは')).toBeInTheDocument()
    expect(screen.getByText('テストユーザー')).toBeInTheDocument()
  })

  test('メッセージが0件の場合、空状態が表示される', () => {
    render(<MessageView messages={[]} />)

    expect(screen.getByText(/メッセージがありません/i)).toBeInTheDocument()
  })
})
```

### 3. `api/` - API テスト

**目的**: Next.js API Routes の動作テスト（リクエスト・レスポンス）

**テスト対象の例**:
- 認証 API（`/api/auth/*`）
- メッセージ API（`/api/messages/*`）
- チャンネル API（`/api/channels/*`）
- ユーザー API（`/api/user/*`）

**ファイル命名規則**: `<エンドポイント名>.test.ts`

**例**:
```
api/
├── auth.test.ts      # 認証 API
├── messages.test.ts  # メッセージ API
├── channels.test.ts  # チャンネル API
└── user.test.ts      # ユーザー API
```

**サンプルテストコード**:
```typescript
// api/messages.test.ts
describe('メッセージ API', () => {
  test('GET /api/messages/:channelId - メッセージ一覧取得', async () => {
    const response = await fetch('/api/messages/channel-1')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.messages).toBeInstanceOf(Array)
  })

  test('POST /api/messages/:channelId - メッセージ送信', async () => {
    const response = await fetch('/api/messages/channel-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'テストメッセージ',
        senderId: 'user-1',
      }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message.content).toBe('テストメッセージ')
  })
})
```

### 4. `integration/` - 統合テスト

**目的**: 複数の機能を組み合わせたエンドツーエンドに近いテスト

**テスト対象の例**:
- メッセージ送信フロー全体（フォーム入力 → API 送信 → 画面更新）
- チャンネル作成フロー（モーダル表示 → 入力 → API → リスト更新）
- 認証フロー（ログイン → リダイレクト → ダッシュボード表示）

**ファイル命名規則**: `<機能名>-flow.test.tsx`

**例**:
```
integration/
├── message-send-flow.test.tsx   # メッセージ送信フロー
├── channel-create-flow.test.tsx # チャンネル作成フロー
└── auth-flow.test.tsx           # 認証フロー
```

**サンプルテストコード**:
```typescript
// integration/message-send-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChannelPage } from '@/app/workspace/channel/[channelId]/page'

describe('メッセージ送信フロー', () => {
  test('ユーザーがメッセージを送信すると画面に表示される', async () => {
    const user = userEvent.setup()
    render(<ChannelPage />)

    // メッセージ入力
    const input = screen.getByPlaceholderText(/メッセージを入力/i)
    await user.type(input, 'こんにちは')

    // 送信ボタンクリック
    const submitButton = screen.getByRole('button', { name: /送信/i })
    await user.click(submitButton)

    // 画面にメッセージが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('こんにちは')).toBeInTheDocument()
    })

    // 入力欄がクリアされる
    expect(input).toHaveValue('')
  })
})
```

## テスト実行コマンド

```bash
# すべてのテストを実行
npm test

# ファイル変更時に自動再実行（開発時に便利）
npm run test:watch

# カバレッジレポート付きで実行
npm run test:coverage

# 特定のテストファイルのみ実行
npm test <ファイル名>
# 例: npm test email-auth.test.ts

# 特定のディレクトリのみ実行
npm test -- src/__tests__/unit
npm test -- src/__tests__/components
```

## テスト作成のベストプラクティス

### 1. テストの命名

- **describe**: 「何」をテストするのか（コンポーネント名・関数名）
- **test/it**: 「どんな動作」を確認するのか

```typescript
describe('MessageView コンポーネント', () => {
  test('メッセージが正しく表示される', () => {
    // ...
  })

  test('メッセージが0件の場合、空状態が表示される', () => {
    // ...
  })
})
```

### 2. テストの3ステップ (AAA パターン)

```typescript
test('例', () => {
  // Arrange (準備) - テストデータ・モック・初期状態の準備
  const mockData = { ... }

  // Act (実行) - テスト対象の関数・操作を実行
  const result = myFunction(mockData)

  // Assert (検証) - 結果が期待通りか確認
  expect(result).toBe(expectedValue)
})
```

### 3. 1つのテストで1つの動作を確認

```typescript
// ❌ Bad - 複数の動作を1つのテストに詰め込む
test('メッセージ関連のすべての機能', () => {
  // メッセージ送信のテスト
  // メッセージ削除のテスト
  // メッセージ編集のテスト
})

// ✅ Good - 1つのテストで1つの動作
test('メッセージを送信できる', () => { ... })
test('メッセージを削除できる', () => { ... })
test('メッセージを編集できる', () => { ... })
```

### 4. モックの活用

外部依存（API、データベース）はモックする：

```typescript
// MSW でAPIをモック
import { server } from '@/__mocks__/server'
import { http, HttpResponse } from 'msw'

test('エラーケース', () => {
  server.use(
    http.get('/api/messages/:channelId', () => {
      return HttpResponse.json(
        { error: 'サーバーエラー' },
        { status: 500 }
      )
    })
  )

  // エラー時の動作をテスト
})
```

## 参考リンク

- [Jest 公式ドキュメント](https://jestjs.io/ja/)
- [React Testing Library 公式ドキュメント](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW 公式ドキュメント](https://mswjs.io/)
- [プロジェクトのテストガイド](../../docs/TESTING_GUIDE.md)
- [テストツール概要](../../docs/TESTING_TOOLS_OVERVIEW.md)
