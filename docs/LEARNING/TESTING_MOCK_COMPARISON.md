# テストにおけるモック手法の比較: jest.fn() vs MSW

## 目次

1. [概要](#概要)
2. [jest.fn() によるモック](#jestfn-によるモック)
3. [MSW (Mock Service Worker) によるモック](#msw-mock-service-worker-によるモック)
4. [遭遇した問題と対処方法](#遭遇した問題と対処方法)
5. [MSW関連ファイルを残す理由](#msw関連ファイルを残す理由)
6. [プロジェクトでの選択基準](#プロジェクトでの選択基準)

---

## 概要

このドキュメントは、テストにおける2つの主要なモック手法を比較し、プロジェクトで遭遇した問題と解決方法を記録したものです。

### モックとは？

**モック（Mock）**: テスト時に、実際の機能（API、データベースなど）の代わりに使う「偽物」のこと。

**なぜ必要？**
- 実際のサーバーやデータベースがなくてもテストできる
- テストが高速（ネットワーク通信がない）
- エラーケースを簡単に再現できる

---

## jest.fn() によるモック

### 仕組み

**関数レベルのモック**。特定の関数を「偽物の関数」に置き換える。

```
実際のコード → テストコード
  ↓              ↓
fetch()    →  jest.fn() (偽物のfetch)
```

### 使用例

#### 例1: 単純な関数のモック

```typescript
// __tests__/unit/utils.test.ts

test('足し算関数のテスト', () => {
  // モック関数を作成
  const mockAdd = jest.fn((a, b) => a + b)

  // 実行
  const result = mockAdd(1, 2)

  // 検証
  expect(result).toBe(3)
  expect(mockAdd).toHaveBeenCalledWith(1, 2) // 正しい引数で呼ばれたか
  expect(mockAdd).toHaveBeenCalledTimes(1)   // 1回だけ呼ばれたか
})
```

#### 例2: fetch APIのモック

```typescript
// __tests__/api/messages.test.ts

test('メッセージ一覧を取得できる', async () => {
  // グローバルなfetch関数をモック化
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      messages: [
        { id: '1', content: 'テストメッセージ' }
      ]
    })
  })

  // 実際のコードを実行
  const response = await fetch('/api/messages/channel-1')
  const data = await response.json()

  // 検証
  expect(data.messages).toHaveLength(1)
  expect(global.fetch).toHaveBeenCalledWith('/api/messages/channel-1')
})
```

#### 例3: Supabase Clientのモック

```typescript
// __tests__/unit/email-auth.test.ts

// Supabase clientをモジュールごと置き換え
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })
    }
  })
}))

test('メールアドレスでログインできる', async () => {
  const { signInWithEmail } = require('@/utils/email-auth')

  const result = await signInWithEmail('test@example.com', 'password')

  expect(result.user.email).toBe('test@example.com')
})
```

### メリット

- ✅ **シンプル**: 追加パッケージ不要
- ✅ **柔軟**: テストごとに簡単に挙動を変更できる
- ✅ **学習コストが低い**: 基本的なJavaScriptの知識で理解できる
- ✅ **細かい制御**: 関数が何回呼ばれたか、どんな引数で呼ばれたかを詳細に検証できる

### デメリット

- ❌ **手動設定が多い**: レスポンス構造を自分で作る必要がある
- ❌ **再利用性が低い**: テストごとにモックを設定し直す必要がある
- ❌ **実際のHTTPリクエストと異なる**: URL、ヘッダー、ステータスコードの扱いが抽象的

### 適したケース

- ユーティリティ関数のテスト
- カスタムフックのテスト
- 単体機能のテスト
- 初心者の学習

---

## MSW (Mock Service Worker) によるモック

### 仕組み

**ネットワークレベルのモック**。実際のHTTPリクエストをインターセプトし、偽のサーバーのように振る舞う。

```
テストコード → fetch('/api/messages') → MSW → モックレスポンス
                                         ↓
                                    実サーバーには届かない
```

### 使用例

#### ハンドラーの定義（1回だけ）

```typescript
// src/__mocks__/handlers.ts

import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET /api/messages/:channelId
  http.get('/api/messages/:channelId', ({ params }) => {
    const { channelId } = params

    return HttpResponse.json({
      success: true,
      messages: [
        { id: '1', content: 'テストメッセージ', channelId }
      ]
    })
  }),

  // POST /api/messages/:channelId
  http.post('/api/messages/:channelId', async ({ params, request }) => {
    const { channelId } = params
    const body = await request.json()

    return HttpResponse.json({
      success: true,
      message: { id: '2', content: body.content, channelId }
    })
  }),

  // エラーケース
  http.get('/api/error', () => {
    return HttpResponse.json(
      { success: false, error: 'サーバーエラー' },
      { status: 500 }
    )
  })
]
```

#### サーバーのセットアップ

```typescript
// src/__mocks__/server.ts

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// テスト開始前にサーバー起動
beforeAll(() => server.listen())

// 各テスト後にハンドラーをリセット
afterEach(() => server.resetHandlers())

// テスト終了後にサーバー停止
afterAll(() => server.close())
```

#### テストコード

```typescript
// __tests__/api/messages.test.ts

test('メッセージ一覧を取得できる', async () => {
  // handlers.tsで定義したモックが自動的に動く
  const response = await fetch('/api/messages/channel-1')
  const data = await response.json()

  expect(response.ok).toBe(true)
  expect(data.messages).toHaveLength(1)
})

test('エラーレスポンスを処理できる', async () => {
  // このテストだけ特別なハンドラーを使う
  server.use(
    http.get('/api/messages/:channelId', () => {
      return HttpResponse.json(
        { success: false, error: 'データベースエラー' },
        { status: 500 }
      )
    })
  )

  const response = await fetch('/api/messages/channel-1')
  const data = await response.json()

  expect(response.status).toBe(500)
  expect(data.success).toBe(false)
})
```

### メリット

- ✅ **実際のHTTPリクエストに近い**: URL、メソッド、ヘッダー、ステータスコードを自然に扱える
- ✅ **再利用性が高い**: 1回定義すれば全テストで使える
- ✅ **開発環境でも使える**: テスト以外（開発中のブラウザ）でも動作可能
- ✅ **RESTful APIのテストに最適**: APIエンドポイントのテストが簡潔に書ける

### デメリット

- ❌ **セットアップが複雑**: 追加パッケージ + 設定ファイルが必要
- ❌ **学習コストが高い**: HTTPリクエスト・レスポンスの知識が必要
- ❌ **Node.js環境で多くのpolyfillが必要**: 特にMSW v2では複雑

### 適したケース

- APIエンドポイントのテスト
- 複数のテストで同じモックを使う場合
- 実際のHTTPリクエストに近い形でテストしたい場合
- プロジェクトが成熟してから導入

---

## 遭遇した問題と対処方法

### 問題の経緯

このプロジェクトでMSW v2をセットアップしようとした際、以下の問題に遭遇しました。

### 問題1: `jest.config.js` の構文エラー

#### エラー内容

```
SyntaxError: Unexpected token '.'
    at jest.config.js:63
```

#### 原因

JSDocコメント内の特殊文字（日本語の全角文字）がNode.jsのパーサーでエラーになった。

**問題のコード**:
```javascript
/**
 * カバレッジ計測対象ファイル
 *
 * include（計測する）:
 * - src/**/*.{js,jsx,ts,tsx} - すべてのソースコード  ← 日本語がエラー
 */
```

#### 対処方法

JSDocコメントを単一行コメント（`//`）に変更。

**修正後**:
```javascript
// カバレッジ計測対象ファイルの設定
collectCoverageFrom: [
  'src/**/*.{js,jsx,ts,tsx}', // すべてのソースコード
  '!src/**/*.d.ts', // TypeScript型定義ファイルは除外
]
```

**学び**: 設定ファイルではシンプルなコメントを使う方が安全。

---

### 問題2: `Response is not defined`

#### エラー内容

```
ReferenceError: Response is not defined
```

#### 原因

MSWが`fetch` APIの`Response`オブジェクトを使用するが、Node.js環境にはブラウザAPIが存在しない。

#### 対処方法

`whatwg-fetch` polyfillをインストールして、グローバルに追加。

```bash
npm install --save-dev whatwg-fetch
```

**jest.setup.js**:
```javascript
import 'whatwg-fetch'
```

**学び**: MSWを使う場合、ブラウザAPIのpolyfillが必要。

---

### 問題3: `TextEncoder is not defined`

#### エラー内容

```
ReferenceError: TextEncoder is not defined
```

#### 原因

MSWが`TextEncoder`を使用するが、Node.js v11未満またはjsdom環境では存在しない。

#### 対処方法

Node.jsの`util`モジュールから`TextEncoder`をインポートしてグローバルに追加。

**jest.setup.js**:
```javascript
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
```

**学び**: MSW v2は多くのWeb APIに依存している。

---

### 問題4: `TransformStream is not defined`

#### エラー内容

```
ReferenceError: TransformStream is not defined
```

#### 原因

MSW v2が`TransformStream`（Web Streams API）を使用するが、Node.js 18未満では存在しない。

#### 対処方法

`web-streams-polyfill`をインストール。

```bash
npm install --save-dev web-streams-polyfill
```

**jest.setup.js**:
```javascript
import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill'
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream
```

**学び**: MSW v2はモダンなWeb APIを多用するため、古いNode.js環境では多くのpolyfillが必要。

---

### 問題5: ES Modulesのトランスパイルエラー

#### エラー内容

```
SyntaxError: Unexpected token 'export'
    at /node_modules/until-async/lib/index.js:23
```

#### 原因

MSWが依存する一部のパッケージ（`until-async`など）がES Modules形式で配布されているが、Jestはデフォルトで`node_modules`をトランスパイルしない。

#### 対処方法（試みたが複雑すぎたため中断）

**jest.config.js** に以下を追加する必要がある:

```javascript
transformIgnorePatterns: [
  'node_modules/(?!(msw|@mswjs|@bundled-es-modules|until-async)/)'
]
```

さらに、`@swc/jest`や`babel-jest`などのトランスパイラーが必要。

**学び**: MSW v2は最新のJavaScript仕様を使用しており、レガシー環境での動作には追加設定が必要。

---

### 問題の総括

MSW v2をNode.js環境（Jest）で動作させるには、以下が必要：

1. ✅ `whatwg-fetch` - fetch API polyfill
2. ✅ `TextEncoder` / `TextDecoder` polyfill
3. ✅ `web-streams-polyfill` - TransformStream polyfill
4. ❌ `transformIgnorePatterns` の設定（ES Modules対応）
5. ❌ トランスパイラーの設定（@swc/jest または babel-jest）

**結論**: 初心者向けプロジェクトとしては複雑すぎるため、`jest.fn()`を使用する方針に変更。

---

## MSW関連ファイルを残す理由

### 残すファイル一覧

```
src/
├── __mocks__/
│   ├── handlers.ts      # MSWハンドラー定義（コメント付き）
│   └── server.ts        # MSWサーバー設定（コメント付き）
│
jest.setup.js            # MSW関連をコメントアウト
```

### 理由1: 将来の学習リソース

**いつ役立つ？**
- プロジェクトが成熟し、より高度なテストが必要になった時
- Node.js v18以降にアップグレードした時
- より実践的なAPIテストを学びたくなった時

**何が学べる？**
- HTTPリクエストのモック方法
- RESTful APIのテストパターン
- ネットワークレベルのモック概念

---

### 理由2: 実装パターンの参考

**handlers.ts** には以下のパターンが含まれている:

```typescript
// URLパラメータの扱い方
http.get('/api/messages/:channelId', ({ params }) => {
  const { channelId } = params
})

// リクエストボディの扱い方
http.post('/api/messages/:channelId', async ({ request }) => {
  const body = await request.json()
})

// エラーレスポンスの返し方
http.get('/api/error', () => {
  return HttpResponse.json(
    { error: 'エラーメッセージ' },
    { status: 500 }
  )
})
```

これらは実際のAPIを設計する際の参考にもなる。

---

### 理由3: 問題解決の記録

このドキュメントと合わせて、以下を記録している:

- どんな問題に遭遇したか
- どう対処しようとしたか
- なぜ最終的に別の方法を選んだか

**プログラミング学習において、失敗の記録は成功の記録と同じくらい価値がある。**

---

### 理由4: 簡単に有効化できる

将来MSWを使いたくなった時、以下の手順で有効化できる:

1. `jest.setup.js` のMSW部分のコメントを外す
2. 不足しているpolyfillを追加
3. `transformIgnorePatterns` を設定
4. テスト実行

ファイルを削除してしまうと、一から作り直す必要がある。

---

### 理由5: 他のメンバーへの知識共有

**チーム開発の場合**:
- 他のメンバーがMSWを知っている可能性がある
- プロジェクトの選択理由を説明できる
- 将来的な技術選定の参考になる

**ドキュメントとして**:
- なぜjest.fn()を選んだのか
- MSWとの比較で何を学んだか
- どちらを選ぶべきかの判断基準

---

## プロジェクトでの選択基準

### このプロジェクトでの決定

**選択**: `jest.fn()` によるモック
**理由**: 初心者向けプロジェクトとしてのシンプルさを優先

### 判断基準

| 項目 | jest.fn() | MSW | 選択 |
|------|-----------|-----|------|
| **セットアップの容易さ** | ⭐⭐⭐⭐⭐ | ⭐⭐ | jest.fn() |
| **学習コスト** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | jest.fn() |
| **実際のHTTPに近い** | ⭐⭐ | ⭐⭐⭐⭐⭐ | MSW |
| **再利用性** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | MSW |
| **初心者向け** | ⭐⭐⭐⭐⭐ | ⭐⭐ | jest.fn() |
| **デバッグのしやすさ** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | jest.fn() |

### 使い分けの推奨

#### jest.fn() を使うべきケース

- ✅ プロジェクト初期段階
- ✅ テストを初めて書く
- ✅ 単体機能のテスト
- ✅ カスタムフックのテスト
- ✅ ユーティリティ関数のテスト

#### MSW を使うべきケース

- ✅ プロジェクトが成熟している
- ✅ APIエンドポイントが多数ある
- ✅ 開発環境でもモックサーバーを使いたい
- ✅ チーム全体がHTTPの知識を持っている
- ✅ E2Eテストに近い統合テストを書きたい

---

## まとめ

### 学んだこと

1. **モックには複数のアプローチがある**
   - 関数レベル（jest.fn()）
   - ネットワークレベル（MSW）

2. **シンプルさは重要な選択基準**
   - 高機能 ≠ 常に正解
   - プロジェクトの成熟度に合わせて選択

3. **失敗も貴重な学習体験**
   - MSWのセットアップで遭遇した問題
   - polyfillの必要性
   - ES Modulesの互換性問題

4. **コードは資産として残す**
   - 将来の学習リソース
   - 問題解決の記録
   - 技術選定の根拠

### 次のステップ

1. ✅ jest.fn() でテストを書き始める
2. ✅ テストの基本パターンを習得
3. ✅ カバレッジ50-60%を目指す
4. 🔄 プロジェクトが成熟したらMSWを再検討

---

## 参考リンク

- [Jest 公式ドキュメント - Mock Functions](https://jestjs.io/ja/docs/mock-functions)
- [MSW 公式ドキュメント](https://mswjs.io/)
- [MSW v2 Migration Guide](https://mswjs.io/docs/migrations/1.x-to-2.x)
- [Testing Library - Best Practices](https://testing-library.com/docs/queries/about#priority)

---

**作成日**: 2025年1月（セッション継続中）
**作成者**: Claude Code
**目的**: テストモック手法の比較と、初心者向けプロジェクトでの技術選定の記録
