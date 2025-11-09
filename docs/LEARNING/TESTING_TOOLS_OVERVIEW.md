# テストツール概要 - 初心者向け完全ガイド

このドキュメントでは、チャットアプリケーションのテストで使用する各ツールについて、初心者向けに詳しく解説します。

## 目次

1. [テストツール一覧](#テストツール一覧)
2. [基本テストツール（必須）](#基本テストツール必須)
3. [E2Eテストツール（オプション）](#e2eテストツールオプション)
4. [ツールの選択理由](#ツールの選択理由)
5. [実際の使用例](#実際の使用例)

---

## テストツール一覧

### 今回インストールするツール（基本テスト）

| ツール | 役割 | 難易度 |
|--------|------|--------|
| Jest | テストランナー（司令塔） | 低 |
| @types/jest | TypeScript型定義 | 低 |
| jest-environment-jsdom | ブラウザ環境シミュレーター | 低 |
| @testing-library/react | Reactコンポーネントテスト | 中 |
| @testing-library/jest-dom | HTML検証ツール | 低 |
| @testing-library/user-event | ユーザー操作シミュレーター | 中 |
| MSW (Mock Service Worker) | APIモックサーバー | 中 |

### 今回は含まれないツール（将来的に追加検討）

| ツール | 役割 | 難易度 |
|--------|------|--------|
| Playwright または Cypress | E2Eテスト | 高 |

---

## 基本テストツール（必須）

### 1. Jest - テストランナー（司令塔）

#### 役割
テストを実行・管理するメインツール

#### 例え
オーケストラの指揮者のような存在
- どのテストを実行するか決める
- テスト結果をまとめて表示
- カバレッジレポートを生成

#### できること
```typescript
// テストケースを書く
test('1 + 1 は 2 になる', () => {
  expect(1 + 1).toBe(2);
});

// グループ化
describe('計算機能', () => {
  test('足し算', () => {
    expect(1 + 1).toBe(2);
  });

  test('引き算', () => {
    expect(5 - 3).toBe(2);
  });
});
```

#### 主な機能
- **テスト実行**: `npm test` でテストを実行
- **ウォッチモード**: ファイル変更時に自動実行
- **カバレッジ**: どれだけコードがテストされているか測定
- **モック**: 外部依存をシミュレート

---

### 2. @types/jest - Jest の型定義

#### 役割
TypeScript で Jest を使うための型情報

#### なぜ必要？
- VSCode でコード補完が効くようになる
- タイプミスを防げる
- `test`, `expect` などの関数の使い方がわかる

#### 例え
辞書・取扱説明書のようなもの
- 「この関数はこう使います」という説明書
- TypeScriptが「間違った使い方だよ」と教えてくれる

#### 効果
```typescript
// @types/jest がないと
test('タイトル', () => {
  expect(1 + 1).toBe(2); // VSCodeで補完が効かない、型チェックもない
});

// @types/jest があると
test('タイトル', () => {
  expect(1 + 1).toBe(2); // VSCodeで補完が効く、型チェックもある
  // toBe の引数が間違っていたらエラーが出る
});
```

---

### 3. jest-environment-jsdom - ブラウザ環境シミュレーター

#### 役割
Node.js 上でブラウザ環境を再現

#### なぜ必要？
- テストは Node.js 上で実行される
- でも React コンポーネントはブラウザで動くもの
- ブラウザの機能（`window`, `document` など）を使えるようにする

#### 例え
バーチャル・ブラウザ
- 実際のブラウザを開かずに、ブラウザっぽい環境でテスト
- 映画の撮影セットのようなもの（本物じゃないけど機能する）

#### 提供される機能
```typescript
// ブラウザの機能が使える
document.getElementById('button');
window.location.href;
localStorage.setItem('key', 'value');
window.addEventListener('resize', () => {});

// React コンポーネントがレンダリングできる
const root = document.createElement('div');
document.body.appendChild(root);
```

#### 仕組み
```
【通常のNode.js】
- window ❌ 使えない
- document ❌ 使えない
- DOM API ❌ 使えない

【jest-environment-jsdom】
- window ✅ 使える（シミュレート）
- document ✅ 使える（シミュレート）
- DOM API ✅ 使える（シミュレート）
```

---

### 4. @testing-library/react - React テストの主役

#### 役割
React コンポーネントをテストするための専用ツール

#### 哲学
「ユーザーが実際に使うように」テストする
- 内部実装ではなく、見た目と動作をテスト
- 「このボタンをクリックしたら何が起きる？」という視点

#### 例え
ユーザーの代わりにアプリを操作するロボット
- 実際のユーザーと同じように画面を見る
- ボタンを探して、クリックする
- 結果を確認する

#### できること
```typescript
import { render, screen } from '@testing-library/react';

// コンポーネントを画面に表示
render(<Button>クリック</Button>);

// 画面から要素を探す（ユーザーと同じように）
const button = screen.getByText('クリック'); // テキストで探す
const input = screen.getByPlaceholderText('メールアドレス'); // プレースホルダーで探す
const heading = screen.getByRole('heading'); // 役割で探す

// ユーザーと同じように確認
expect(button).toBeInTheDocument();
```

#### 主な機能

**1. レンダリング**
```typescript
const { container } = render(<MyComponent />);
```

**2. 要素の検索**
```typescript
// テキストで検索（最も推奨）
screen.getByText('ログイン');

// 役割（role）で検索
screen.getByRole('button', { name: 'ログイン' });

// ラベルで検索
screen.getByLabelText('メールアドレス');

// プレースホルダーで検索
screen.getByPlaceholderText('your-email@example.com');

// テストIDで検索（最終手段）
screen.getByTestId('login-button');
```

**3. 非同期処理の待機**
```typescript
// 要素が表示されるまで待つ
const message = await screen.findByText('送信しました');

// 要素が消えるまで待つ
await waitFor(() => {
  expect(screen.queryByText('ローディング中...')).not.toBeInTheDocument();
});
```

---

### 5. @testing-library/jest-dom - 便利な検証ツール

#### 役割
HTMLの状態を確認するための便利な関数を追加

#### なぜ必要？
Jest だけでは「要素が表示されているか」などを確認しづらい
→ わかりやすい関数（カスタムマッチャー）を追加してくれる

#### 例え
検査キット
- 「この要素は見えている？」
- 「このボタンは無効になっている？」
- 「このテキストは含まれている？」

#### 使える関数（カスタムマッチャー）

**表示状態の確認**
```typescript
// 要素がDOM内に存在するか
expect(element).toBeInTheDocument();

// 要素が見えるか（display: none じゃないか）
expect(element).toBeVisible();

// 要素が見えないか
expect(element).not.toBeVisible();
```

**状態の確認**
```typescript
// ボタンが無効か
expect(button).toBeDisabled();

// ボタンが有効か
expect(button).toBeEnabled();

// チェックボックスがチェックされているか
expect(checkbox).toBeChecked();
```

**テキストの確認**
```typescript
// テキストが含まれているか
expect(element).toHaveTextContent('こんにちは');

// 完全一致
expect(element).toHaveTextContent(/^こんにちは$/);
```

**属性・クラスの確認**
```typescript
// クラスが付いているか
expect(element).toHaveClass('active');
expect(element).toHaveClass('btn', 'btn-primary');

// 属性の値を確認
expect(input).toHaveAttribute('type', 'text');
expect(link).toHaveAttribute('href', '/home');

// スタイルを確認
expect(element).toHaveStyle('color: red');
```

**フォームの確認**
```typescript
// input の値
expect(input).toHaveValue('test@example.com');

// フォームの値
expect(input).toHaveFormValues({ email: 'test@example.com' });

// フォーカスされているか
expect(input).toHaveFocus();
```

#### Jest のみとの比較
```typescript
// Jest のみ（わかりにくい）
expect(element.style.display).not.toBe('none');
expect(element.disabled).toBe(true);
expect(element.textContent).toContain('こんにちは');

// jest-dom 使用（わかりやすい）
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveTextContent('こんにちは');
```

---

### 6. @testing-library/user-event - ユーザー操作シミュレーター

#### 役割
実際のユーザー操作（クリック、入力など）を再現

#### fireEvent との違い

| 項目 | fireEvent | user-event |
|------|-----------|------------|
| **レベル** | 低レベル（イベント発火） | 高レベル（ユーザー行動） |
| **リアル度** | 単純なイベント | 実際のユーザー行動 |
| **速度** | 即座 | わずかに遅い |
| **推奨度** | 非推奨 | **推奨** |

#### 例え
より人間らしい操作ロボット
- クリックする前にマウスを動かす
- 入力する前にフォーカスする
- キーボードで操作する

#### できること

**クリック操作**
```typescript
import userEvent from '@testing-library/user-event';

// ユーザーがボタンをクリック
await userEvent.click(button);

// ダブルクリック
await userEvent.dblClick(button);

// 右クリック
await userEvent.pointer({ target: button, keys: '[MouseRight]' });
```

**入力操作**
```typescript
// ユーザーが入力欄に文字を入力
await userEvent.type(input, 'テストメッセージ');

// 既存の値をクリアしてから入力
await userEvent.clear(input);
await userEvent.type(input, '新しい値');

// 遅延を入れて1文字ずつ入力（よりリアル）
await userEvent.type(input, 'ゆっくり', { delay: 100 });
```

**キーボード操作**
```typescript
// ユーザーがキーボードで操作
await userEvent.keyboard('{Enter}');
await userEvent.keyboard('{Escape}');
await userEvent.keyboard('{Backspace}');

// 複数のキーを組み合わせ
await userEvent.keyboard('{Control>}a{/Control}'); // Ctrl+A
await userEvent.keyboard('{Shift>}Tab{/Shift}'); // Shift+Tab
```

**マウス操作**
```typescript
// ユーザーがホバー
await userEvent.hover(element);

// ホバー解除
await userEvent.unhover(element);
```

**選択操作**
```typescript
// セレクトボックスから選択
await userEvent.selectOptions(select, 'option1');

// チェックボックスをチェック
await userEvent.click(checkbox);

// ラジオボタンを選択
await userEvent.click(radio);
```

**ファイルアップロード**
```typescript
// ファイルを選択
const file = new File(['hello'], 'hello.png', { type: 'image/png' });
await userEvent.upload(input, file);
```

#### fireEvent との比較
```typescript
// fireEvent（シンプル、でも人間らしくない）
fireEvent.click(button);
// → クリックイベントだけ発火

// user-event（人間らしい動き）
await userEvent.click(button);
// → マウス移動 → マウスダウン → マウスアップ の順で実行
// → より実際のユーザー行動に近い
```

---

### 7. MSW (Mock Service Worker) - API モックサーバー

#### 役割
本物のバックエンド API の代わりになる偽のサーバー

#### なぜ必要？

**テスト中に実際の API を呼びたくない理由**:
1. **データベースが汚れる**: テストデータが本番DBに入る
2. **テストが遅くなる**: ネットワーク通信に時間がかかる
3. **ネットワークエラー**: 通信が不安定
4. **外部サービスの料金**: API呼び出しごとに課金される場合がある
5. **再現性**: 同じ結果が保証されない

#### 例え
映画の撮影セット
- 本物のビルではなく、見た目だけ同じセット
- でも、演技（テスト）には十分使える
- 何度でも同じシーンを撮影できる

#### 仕組み
```
【通常のAPI呼び出し】
アプリ → 本物のバックエンドサーバー → データベース

【MSWを使ったテスト】
アプリ → MSW（偽のサーバー） → 偽のレスポンス
（本物のサーバーには届かない）
```

#### セットアップ

**1. モックサーバーの作成**
```typescript
// src/__mocks__/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // GET /api/messages/:channelId にリクエストが来たら...
  rest.get('/api/messages/:channelId', (req, res, ctx) => {
    const { channelId } = req.params;

    // この偽のデータを返す
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        messages: [
          {
            id: '1',
            content: 'テストメッセージ',
            sender: {
              id: '1',
              name: 'テストユーザー',
              email: 'test@example.com'
            },
            createdAt: new Date().toISOString()
          }
        ]
      })
    );
  }),

  // POST /api/messages/:channelId
  rest.post('/api/messages/:channelId', async (req, res, ctx) => {
    const { content } = await req.json();

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: {
          id: '2',
          content,
          sender: { id: '1', name: 'テストユーザー' },
          createdAt: new Date().toISOString()
        }
      })
    );
  })
];
```

**2. サーバーの起動**
```typescript
// src/__mocks__/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**3. テストでの使用**
```typescript
// jest.setup.js
import { server } from './src/__mocks__/server';

// テスト前にモックサーバーを起動
beforeAll(() => server.listen());

// 各テスト後にリクエストハンドラーをリセット
afterEach(() => server.resetHandlers());

// すべてのテスト後にモックサーバーを停止
afterAll(() => server.close());
```

#### できること

**1. 成功レスポンスのテスト**
```typescript
test('メッセージ一覧を取得できる', async () => {
  const response = await fetch('/api/messages/channel-1');
  const data = await response.json();

  expect(data.success).toBe(true);
  expect(data.messages).toHaveLength(1);
});
```

**2. エラーレスポンスのテスト**
```typescript
import { server } from '@/__mocks__/server';
import { rest } from 'msw';

test('API エラー時の処理', async () => {
  // このテストだけエラーを返すようにオーバーライド
  server.use(
    rest.get('/api/messages/:channelId', (req, res, ctx) => {
      return res(
        ctx.status(500),
        ctx.json({ success: false, error: 'サーバーエラー' })
      );
    })
  );

  const response = await fetch('/api/messages/channel-1');
  const data = await response.json();

  expect(data.success).toBe(false);
  expect(data.error).toBe('サーバーエラー');
});
```

**3. 遅延のシミュレート**
```typescript
rest.get('/api/messages/:channelId', (req, res, ctx) => {
  return res(
    ctx.delay(2000), // 2秒遅延
    ctx.json({ messages: [] })
  );
});
```

**4. リクエスト内容の確認**
```typescript
rest.post('/api/messages/:channelId', async (req, res, ctx) => {
  const { content } = await req.json();
  const authHeader = req.headers.get('Authorization');

  // リクエスト内容をテストで確認できる
  console.log('送信されたメッセージ:', content);
  console.log('認証ヘッダー:', authHeader);

  return res(ctx.json({ success: true }));
});
```

#### メリット
- 実際の API と同じように動く
- エラーケースも簡単にテストできる
- テストが高速（ネットワーク通信なし）
- データベースに影響しない
- 再現性が高い（常に同じ結果）

---

## E2Eテストツール（オプション）

### Playwright - E2Eテストツール

#### 役割
**End-to-End（E2E）テスト**: 実際のブラウザを自動操作してテスト

#### 例え
完全自動運転のテストドライバー
- 実際のブラウザを開く
- ユーザーと同じようにクリック、入力、ページ遷移
- 画面全体の動作を確認

#### 他のテストツールとの違い

| テストの種類 | ツール | 対象 | 実行環境 |
|------------|-------|------|---------|
| **ユニットテスト** | Jest | 個別の関数 | Node.js |
| **コンポーネントテスト** | React Testing Library | Reactコンポーネント | jsdom（仮想ブラウザ） |
| **E2Eテスト** | **Playwright** | アプリ全体 | **実際のブラウザ** |

#### できること
```typescript
import { test, expect } from '@playwright/test';

test('ユーザーがログインしてメッセージを送信できる', async ({ page }) => {
  // 1. ログインページにアクセス（実際のブラウザで）
  await page.goto('http://localhost:3000/login');

  // 2. メールアドレスを入力
  await page.fill('input[name="email"]', 'test@example.com');

  // 3. パスワードを入力
  await page.fill('input[name="password"]', 'password123');

  // 4. ログインボタンをクリック
  await page.click('button[type="submit"]');

  // 5. ワークスペースページに遷移したか確認
  await expect(page).toHaveURL('http://localhost:3000/workspace');

  // 6. メッセージを入力
  await page.fill('textarea[name="message"]', 'テストメッセージ');

  // 7. 送信ボタンをクリック
  await page.click('button:has-text("送信")');

  // 8. メッセージが表示されたか確認
  await expect(page.locator('text=テストメッセージ')).toBeVisible();
});
```

#### 特徴

**メリット**:
- 実際のブラウザで動作を確認（Chrome、Firefox、Safari）
- ページ遷移、認証フローなど複雑なシナリオをテスト
- スクリーンショット・動画録画機能
- 並列実行で高速
- デバッグモード（ステップ実行）

**デメリット**:
- テスト実行が遅い（ブラウザ起動に時間がかかる）
- セットアップが複雑
- 初心者には難易度が高い
- 環境依存の問題が出やすい

#### Cypressとの比較

| 項目 | Playwright | Cypress |
|------|-----------|---------|
| **ブラウザサポート** | Chrome, Firefox, Safari, Edge | Chrome, Firefox, Edge |
| **実行速度** | 並列実行で高速 | やや遅い |
| **学習難易度** | やや高い | やや低い |
| **人気** | 急成長中 | 老舗、人気 |
| **公式ドキュメント** | 充実 | 非常に充実 |

#### なぜ今回は含まれていないか

**理由1: 学習の順序**

推奨される学習順序:
```
1. ユニットテスト（簡単）← まずここから
   ↓
2. コンポーネントテスト（中級）
   ↓
3. API統合テスト（中級）
   ↓
4. E2Eテスト（高度）← Playwrightはここ
```

まずは基礎的なテストから始めて、段階的にステップアップするのが効率的です。

**理由2: 時間とコストパフォーマンス**

カバレッジ目標50-60%の内訳:
- ユニットテスト: 30%
- コンポーネントテスト: 20%
- API統合テスト: 10%
- **E2Eテスト: 0-5%**（最後に追加）

E2Eテストは少数でも効果的なので、基礎テストを優先します。

**理由3: 実行時間**

```
ユニットテスト 100個: 1-2秒
コンポーネントテスト 50個: 5-10秒
E2Eテスト 10個: 1-2分
```

E2Eは時間がかかるため、開発中に頻繁に実行するのは現実的ではありません。

#### 追加するタイミング

**Phase 1（今）**: 基本テスト
- Jest + React Testing Library + MSW
- カバレッジ50-60%達成

**Phase 2（基本テスト完了後）**: E2E追加（オプション）
- Playwright導入
- 重要なユーザーフローのみテスト（5-10個）

---

## ツールの選択理由

### なぜこの組み合わせ？

**Jest**: デファクトスタンダード
- JavaScriptテストで最も人気
- Next.js公式サポート
- 豊富なドキュメント・コミュニティ

**React Testing Library**: React公式推奨
- ユーザー視点のテスト
- アクセシビリティ向上
- メンテナンスしやすいテスト

**MSW**: モダンなAPIモック
- ネットワークレベルでモック
- ブラウザでもNode.jsでも動作
- 実際のAPIコールと同じコード

### 他の選択肢との比較

| 項目 | 今回の選択 | 他の選択肢 | 理由 |
|------|-----------|-----------|------|
| テストランナー | **Jest** | Vitest, Mocha | Next.js との親和性、人気 |
| コンポーネントテスト | **React Testing Library** | Enzyme | 公式推奨、ユーザー視点 |
| APIモック | **MSW** | fetch-mock, axios-mock | モダン、リアル |

---

## 実際の使用例

### 例1: ボタンコンポーネントのテスト

```typescript
// src/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  test('ボタンが表示される', () => {
    render(<Button>クリック</Button>);

    const button = screen.getByText('クリック');
    expect(button).toBeInTheDocument();
  });

  test('クリックイベントが発火する', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>クリック</Button>);

    const button = screen.getByText('クリック');
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('無効状態では クリックできない', async () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>クリック</Button>);

    const button = screen.getByText('クリック');
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

### 例2: メッセージフォームのテスト

```typescript
// src/components/channel/messageForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageForm from './messageForm';
import { server } from '@/__mocks__/server';

describe('MessageForm', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test('メッセージを送信できる', async () => {
    render(<MessageForm channelId="test-channel" />);

    // 入力欄を探す
    const input = screen.getByPlaceholderText('メッセージを入力');

    // ユーザーが文字を入力
    await userEvent.type(input, 'テストメッセージ');
    expect(input).toHaveValue('テストメッセージ');

    // 送信ボタンをクリック
    const button = screen.getByText('送信');
    await userEvent.click(button);

    // MSW が API レスポンスを返す
    // 送信成功メッセージが表示される
    expect(await screen.findByText('送信しました')).toBeInTheDocument();

    // 入力欄がクリアされる
    expect(input).toHaveValue('');
  });

  test('空メッセージは送信できない', async () => {
    render(<MessageForm channelId="test-channel" />);

    const button = screen.getByText('送信');

    // 空の状態で送信ボタンをクリック
    await userEvent.click(button);

    // エラーメッセージが表示される
    expect(await screen.findByText('メッセージを入力してください')).toBeInTheDocument();
  });
});
```

### 例3: APIテスト

```typescript
// src/__tests__/api/messages.test.ts
import { POST } from '@/app/api/messages/[channelId]/route';
import { server } from '@/__mocks__/server';

describe('POST /api/messages/[channelId]', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test('メッセージを送信できる', async () => {
    const request = new Request('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'テストメッセージ' }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ channelId: 'channel-1' })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message.content).toBe('テストメッセージ');
  });

  test('空メッセージはエラーになる', async () => {
    const request = new Request('http://localhost:3000/api/messages/channel-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ channelId: 'channel-1' })
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
```

---

## まとめ

### 今回インストールするツール（優先度: 高）

1. **Jest** - テストランナー
2. **@types/jest** - TypeScript型定義
3. **jest-environment-jsdom** - ブラウザ環境シミュレーター
4. **@testing-library/react** - Reactコンポーネントテスト
5. **@testing-library/jest-dom** - HTML検証ツール
6. **@testing-library/user-event** - ユーザー操作シミュレーター
7. **MSW** - APIモックサーバー

**これらで50-60%のカバレッジを達成できます**

### Playwright（優先度: 低、オプション）

- E2Eテスト専用ツール
- 基本テストが完了してから追加を検討
- 重要なユーザーフロー（ログイン、メッセージ送信など）のみテスト

### 学習の順序

```
Phase 1: セットアップ
└─ ツールインストール、設定ファイル作成

Phase 2: ユニットテスト
└─ 個別関数のテスト（最も簡単）

Phase 3: コンポーネントテスト
└─ React コンポーネントのテスト

Phase 4: API統合テスト
└─ API エンドポイントのテスト

Phase 5（オプション）: E2Eテスト
└─ Playwright でアプリ全体のテスト
```

---

## 参考リンク

- [Jest 公式ドキュメント](https://jestjs.io/docs/getting-started)
- [React Testing Library 公式ドキュメント](https://testing-library.com/docs/react-testing-library/intro/)
- [jest-dom カスタムマッチャー一覧](https://github.com/testing-library/jest-dom#custom-matchers)
- [user-event 公式ドキュメント](https://testing-library.com/docs/user-event/intro)
- [MSW 公式ドキュメント](https://mswjs.io/docs/)
- [Playwright 公式ドキュメント](https://playwright.dev/docs/intro)
- [Next.js テストガイド](https://nextjs.org/docs/app/building-your-application/testing/jest)

---

Good luck with your testing!
