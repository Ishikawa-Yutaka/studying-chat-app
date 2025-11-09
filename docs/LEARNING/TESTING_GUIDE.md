# テストガイド - チャットアプリケーション

このドキュメントは、チャットアプリケーションのテスト計画と実装方法をまとめたものです。
初心者向けに、自動テストと手動テストの両方をカバーしています。

## 目次

1. [テストの目的](#テストの目的)
2. [テストの種類](#テストの種類)
3. [カバレッジ目標](#カバレッジ目標)
4. [テストフレームワーク構成](#テストフレームワーク構成)
5. [自動テスト実装計画](#自動テスト実装計画)
6. [手動テスト計画](#手動テスト計画)
7. [テスト実行手順](#テスト実行手順)

---

## テストの目的

### なぜテストが必要？

1. **バグの早期発見**: 問題を早く見つけることで、修正コストを削減
2. **リグレッション防止**: 新しい変更が既存機能を壊していないか確認
3. **ドキュメント**: テストコードは「仕様書」としても機能
4. **リファクタリングの安全性**: コード改善時の安心材料
5. **実務スキル**: 実際の開発現場で必須のスキル

---

## テストの種類

### 1. 自動テスト（テストコード）

コードでテストを記述し、自動的に実行します。

#### ユニットテスト
- **対象**: 個別の関数・メソッド
- **ツール**: Jest
- **例**: ユーティリティ関数、バリデーション関数
- **難易度**: 低（最初に学ぶべき）

```typescript
// 例: メール検証関数のテスト
describe('isValidEmail', () => {
  test('正しいメールアドレスの場合はtrueを返す', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  test('不正なメールアドレスの場合はfalseを返す', () => {
    expect(isValidEmail('invalid-email')).toBe(false);
  });
});
```

#### コンポーネントテスト
- **対象**: Reactコンポーネント
- **ツール**: Jest + React Testing Library
- **例**: ボタンコンポーネント、メッセージカード
- **難易度**: 中

```typescript
// 例: メッセージカードコンポーネントのテスト
test('メッセージが正しく表示される', () => {
  render(<MessageCard message={mockMessage} />);
  expect(screen.getByText('こんにちは')).toBeInTheDocument();
});
```

#### 統合テスト
- **対象**: APIエンドポイント + データベース
- **ツール**: Jest + MSW（モックサーバー）
- **例**: メッセージ送信API、チャンネル作成API
- **難易度**: 中〜高

```typescript
// 例: メッセージ送信APIのテスト
test('メッセージを送信できる', async () => {
  const response = await fetch('/api/messages/channel-id', {
    method: 'POST',
    body: JSON.stringify({ content: 'テストメッセージ' })
  });
  expect(response.ok).toBe(true);
});
```

#### E2Eテスト（End-to-End）
- **対象**: ブラウザ操作全体
- **ツール**: Playwright または Cypress
- **例**: ログイン → メッセージ送信 → ログアウトの一連の流れ
- **難易度**: 高（時間があれば実装）

### 2. 手動テスト

実際にアプリを操作して確認します。

- **UI/UX の確認**: 見た目、使いやすさ
- **ブラウザ互換性**: Chrome、Safari、Firefox
- **レスポンシブデザイン**: デスクトップ、モバイル
- **エッジケース**: 想定外の操作パターン

---

## カバレッジ目標

### 全体目標: **50-60%**

初心者にとって現実的で達成可能な目標です。

### 機能別の目標

| 機能カテゴリ | カバレッジ目標 | 理由 |
|------------|--------------|------|
| **認証機能** | 80%以上 | セキュリティ上最重要 |
| **API エンドポイント** | 80%以上 | ビジネスロジックの中核 |
| **ビジネスロジック** | 80%以上 | バグの影響が大きい |
| **React コンポーネント** | 60%以上 | ユーザー体験に直結 |
| **フォームバリデーション** | 60%以上 | データ品質の保証 |
| **UI コンポーネント** | 40%以上 | シンプルなコンポーネント |
| **スタイリング関連** | 40%以上 | 視覚的な確認が中心 |

### テスト不要なファイル

- 設定ファイル（`next.config.js`、`tailwind.config.ts`）
- 型定義のみのファイル（`types/*.ts`）
- ビルド成果物（`.next/`）

---

## テストフレームワーク構成

### インストールするパッケージ

```bash
# テストランナー
npm install --save-dev jest @types/jest jest-environment-jsdom

# React Testing Library
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Next.js との統合
npm install --save-dev @testing-library/react-hooks

# API モックサーバー
npm install --save-dev msw

# カバレッジレポート
# Jest に含まれているので追加インストール不要
```

### 設定ファイル

#### `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Next.js アプリのパス
  dir: './',
})

const customJestConfig = {
  // テスト環境
  testEnvironment: 'jest-environment-jsdom',

  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // テストファイルのパターン
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  // カバレッジ設定
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/types/**',
  ],

  // カバレッジ閾値
  coverageThresholds: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // モジュールパスのエイリアス
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

module.exports = createJestConfig(customJestConfig)
```

#### `jest.setup.js`

```javascript
// Testing Library のカスタムマッチャー
import '@testing-library/jest-dom'

// MSW のセットアップ（API モック）
import { server } from './src/__mocks__/server'

// テスト前にモックサーバーを起動
beforeAll(() => server.listen())

// 各テスト後にリクエストハンドラーをリセット
afterEach(() => server.resetHandlers())

// すべてのテスト後にモックサーバーを停止
afterAll(() => server.close())
```

---

## 自動テスト実装計画

### Phase 1: セットアップ

1. **テストフレームワークのインストール**
   - Jest、React Testing Library、MSW
   - 設定ファイルの作成（`jest.config.js`、`jest.setup.js`）

2. **テスト用ディレクトリ構成**
   ```
   src/
   ├── __tests__/           # テストファイル
   │   ├── api/            # API テスト
   │   ├── components/     # コンポーネントテスト
   │   ├── hooks/          # カスタムフックテスト
   │   └── utils/          # ユーティリティ関数テスト
   ├── __mocks__/          # モックデータ・モックサーバー
   │   ├── handlers.ts     # MSW リクエストハンドラー
   │   ├── server.ts       # MSW サーバー設定
   │   └── data.ts         # テスト用ダミーデータ
   ```

### Phase 2: ユニットテスト（優先度: 高）

#### 対象ファイル

1. **認証関連**
   - `src/utils/email-auth.ts` - メール・パスワード認証
   - `src/lib/social-auth.ts` - ソーシャル認証

2. **ユーティリティ関数**
   - バリデーション関数
   - 日付フォーマット関数
   - テキスト処理関数

3. **カスタムフック**
   - `src/hooks/useAuth.ts` - 認証状態管理
   - `src/hooks/useRealtimeMessages.ts` - リアルタイムメッセージ

#### テスト例

```typescript
// src/__tests__/utils/validation.test.ts
import { isValidEmail } from '@/utils/validation';

describe('isValidEmail', () => {
  test('有効なメールアドレスの場合はtrueを返す', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user+tag@domain.co.jp')).toBe(true);
  });

  test('無効なメールアドレスの場合はfalseを返す', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });
});
```

### Phase 3: コンポーネントテスト（優先度: 中）

#### 対象コンポーネント

1. **メッセージ表示**
   - `src/components/channel/messageView.tsx`
   - `src/components/channel/messageForm.tsx`

2. **サイドバー**
   - `src/components/workspace/channelList.tsx`
   - `src/components/workspace/directMessageList.tsx`

3. **認証画面**
   - `src/app/login/page.tsx`
   - `src/app/signup/page.tsx`

#### テスト例

```typescript
// src/__tests__/components/messageView.test.tsx
import { render, screen } from '@testing-library/react';
import MessageView from '@/components/channel/messageView';

const mockMessages = [
  {
    id: '1',
    content: 'こんにちは',
    sender: { id: '1', name: 'テストユーザー', email: 'test@example.com' },
    createdAt: new Date(),
  },
];

test('メッセージが正しく表示される', () => {
  render(<MessageView messages={mockMessages} />);

  expect(screen.getByText('こんにちは')).toBeInTheDocument();
  expect(screen.getByText('テストユーザー')).toBeInTheDocument();
});
```

### Phase 4: API 統合テスト（優先度: 高）

#### 対象API

1. **認証API**
   - `POST /api/auth/signup`
   - `POST /api/auth/login`
   - `POST /api/auth/logout`

2. **メッセージAPI**
   - `GET /api/messages/[channelId]`
   - `POST /api/messages/[channelId]`

3. **チャンネルAPI**
   - `GET /api/channels`
   - `POST /api/channels`
   - `DELETE /api/channels/[channelId]`

#### テスト例

```typescript
// src/__tests__/api/messages.test.ts
import { POST } from '@/app/api/messages/[channelId]/route';

describe('POST /api/messages/[channelId]', () => {
  test('メッセージを送信できる', async () => {
    const request = new Request('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      body: JSON.stringify({ content: 'テストメッセージ' }),
    });

    const response = await POST(request, { params: Promise.resolve({ channelId: 'channel-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

---

## 手動テスト計画

手動テストは実際にアプリを操作して確認します。

### Phase 1: 認証機能テスト

#### 1. サインアップ
- [ ] 新しいメールアドレスで登録できる
- [ ] パスワード表示アイコンが正しく動作する
- [ ] エラーメッセージが適切に表示される（既存メール、短いパスワード）
- [ ] 確認メールが送信される

#### 2. メール確認フロー
- [ ] 確認メールが届く
- [ ] 確認リンクをクリックしてログインできる

#### 3. ログイン・ログアウト
- [ ] 正しいパスワードでログインできる
- [ ] 誤ったパスワードでエラーが表示される
- [ ] ログアウト後、ワークスペースにアクセスできない

### Phase 2: チャット機能テスト

#### 4. メッセージ送信
- [ ] 通常のテキストメッセージを送信できる
- [ ] 絵文字を含むメッセージを送信できる
- [ ] 空メッセージは送信できない

#### 5. メッセージ受信（リアルタイム）
- [ ] 別のユーザーが送信したメッセージが即座に表示される
- [ ] 送信者名、タイムスタンプが正しく表示される

### Phase 3: チャンネル機能テスト

#### 6. チャンネル作成・参加・退出
- [ ] 新しいチャンネルを作成できる
- [ ] 他のユーザーがチャンネルに参加できる
- [ ] チャンネルから退出できる
- [ ] 退出後、チャンネルがサイドバーから消える

#### 7. チャンネル削除
- [ ] 作成者のみ削除ボタンが表示される
- [ ] 削除後、全ユーザーのサイドバーから消える

### Phase 4: DM機能テスト

#### 8. DM作成・送受信
- [ ] ユーザーリストから相手を選んでDM開始できる
- [ ] DMメッセージをリアルタイムで送受信できる
- [ ] 同じ相手へのDMは1つのチャンネルにまとまる

### Phase 5: リアルタイム機能テスト

#### 9. 複数タブでのメッセージ同期
- [ ] 同じユーザーで2つのタブを開く
- [ ] タブAでメッセージ送信 → タブBにも表示される
- [ ] 楽観的更新が正しく動作する

#### 10. オンライン状態テスト
- [ ] ユーザーAがログイン → ユーザーBの画面でオンライン表示
- [ ] ユーザーAがログアウト → オフライン表示

### Phase 6: エッジケーステスト

#### 11. 長いメッセージ
- [ ] 1000文字以上のメッセージを送信できる
- [ ] 正しく表示され、レイアウトが崩れない

#### 12. 削除済みユーザーのメッセージ
- [ ] ユーザーAがメッセージ送信後、アカウント削除
- [ ] メッセージが「削除済みユーザー」として表示される

### Phase 7: UI/UXテスト

#### 13. モバイル表示
- [ ] スマートフォンで正しく表示される
- [ ] サイドバーが正しく開閉する
- [ ] メッセージが読みやすく表示される

#### 14. ダークモード・ライトモード
- [ ] 設定からテーマ切り替えができる
- [ ] すべての要素が見やすい色になっている
- [ ] パスワード表示アイコンが両モードで見える

### Phase 8: セキュリティテスト

#### 15. 未ログイン時のアクセス制限
- [ ] シークレットモードで `/workspace` にアクセス → ログインページにリダイレクト
- [ ] API エンドポイントに直接アクセス → エラーになる

---

## テスト実行手順

### 自動テストの実行

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルのみ実行
npm test -- src/__tests__/api/messages.test.ts

# カバレッジレポート付きで実行
npm test -- --coverage

# ウォッチモード（ファイル変更時に自動実行）
npm test -- --watch
```

### カバレッジレポートの確認

テスト実行後、`coverage/` ディレクトリにHTMLレポートが生成されます。

```bash
# カバレッジレポートをブラウザで開く
open coverage/lcov-report/index.html
```

レポートでは以下を確認できます：
- **Lines**: 実行された行の割合
- **Functions**: 実行された関数の割合
- **Branches**: 実行された条件分岐の割合
- **Statements**: 実行された文の割合

### 手動テストの実行

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **ブラウザでアクセス**
   ```
   http://localhost:3000
   ```

3. **テストケースに沿って操作**
   - チェックリストを1つずつ確認
   - 問題があれば記録

---

## テスト結果の記録

### バグ報告テンプレート

```markdown
## バグ報告

### 概要
簡潔にバグの内容を記載

### 再現手順
1. ログインページにアクセス
2. メールアドレスに「test@example.com」を入力
3. パスワードに「12345」を入力（8文字未満）
4. ログインボタンをクリック

### 期待される動作
「パスワードは8文字以上である必要があります」とエラーメッセージが表示される

### 実際の動作
エラーメッセージが表示されず、ログインに失敗する

### スクリーンショット
（可能であれば添付）

### 環境
- OS: macOS 14.0
- ブラウザ: Chrome 120
- デバイス: デスクトップ
```

---

## 参考リンク

- [Jest 公式ドキュメント](https://jestjs.io/docs/getting-started)
- [React Testing Library 公式ドキュメント](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW 公式ドキュメント](https://mswjs.io/docs/)
- [Next.js テストガイド](https://nextjs.org/docs/app/building-your-application/testing/jest)

---

## まとめ

このテストガイドに従って、段階的にテストを実装していきましょう。

**優先順位**:
1. テストフレームワークのセットアップ
2. 認証機能のテスト（自動 + 手動）
3. API エンドポイントのテスト
4. React コンポーネントのテスト
5. カバレッジ確認と改善
6. 手動テストでUX確認
7. バグ修正

**学習のポイント**:
- 最初は簡単なユニットテストから始める
- テストを書くことでコードの品質が向上する
- テストは「仕様書」としても機能する
- 実務で必須のスキルなので、しっかり身につける

Good luck with your testing!
