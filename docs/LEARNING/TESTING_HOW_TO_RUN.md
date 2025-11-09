# テスト実行方法ガイド（初心者向け）

このドキュメントでは、実装済みのテストを実行する方法を説明します。

## 目次

- [テストの種類](#テストの種類)
- [テスト実行コマンド](#テスト実行コマンド)
- [テスト結果の見方](#テスト結果の見方)
- [よくある問題と解決方法](#よくある問題と解決方法)

---

## テストの種類

### 1. ユニットテスト

**場所**: `src/__tests__/unit/`

**テスト数**: 約30ファイル、800+テスト

**実行時間**: 約30秒〜1分

**テスト対象**:
- カスタムフック (`src/hooks/`)
- 認証関数 (`src/lib/auth-*.ts`)
- Supabaseクライアント
- ミドルウェア
- Reactコンポーネント

**特徴**:
- 速い
- データベースは使わない（モック使用）
- 個別の機能をテスト

---

### 2. 統合テスト

**場所**: `src/__tests__/integration/`

**テスト数**: 3ファイル、35テスト

**実行時間**: 約3分

**テスト対象**:
- メッセージAPI (`/api/messages/[channelId]`)
- チャンネルAPI (`/api/channels`)
- DM API (`/api/dm/[partnerId]`)

**特徴**:
- やや遅い
- 実際のデータベースを使用
- 複数の機能を組み合わせてテスト

---

## テスト実行コマンド

### 基本コマンド

#### すべてのテストを実行

```bash
npm test
```

**注意**: 統合テストが並列実行されてエラーになる可能性があります。
エラーが出た場合は、個別実行コマンドを使ってください。

---

#### ユニットテストのみ実行

```bash
npm run test:unit
```

**推奨**: 日常的な開発ではこれを使う

**実行時間**: 約30秒

---

#### 統合テストのみ実行

```bash
npm run test:integration
```

**実行時間**: 約3分

**注意**: `--runInBand` オプションでテストを順次実行します（並列実行すると失敗するため）

---

#### カバレッジ付きで実行

```bash
npm run test:coverage
```

**カバレッジとは？**
- どれだけのコードがテストされているかを示す指標
- 現在: 約60%

**実行時間**: 約1分

---

### 応用コマンド

#### 特定のファイルだけテスト

```bash
# 例: useAuthフックだけテスト
npm test -- src/__tests__/unit/hooks/useAuth.test.ts

# 例: メッセージAPI統合テストだけ実行
npm test -- src/__tests__/integration/messages.test.ts
```

---

#### 特定のテストケースだけ実行

```bash
# 「正常系」という名前のテストだけ実行
npm test -- -t "正常系"

# 例: メッセージAPIの正常系テストだけ実行
npm test -- src/__tests__/integration/messages.test.ts -t "正常系"
```

---

#### ウォッチモード（ファイル変更時に自動実行）

```bash
npm test -- --watch
```

**使い方**:
1. このコマンドを実行
2. ファイルを編集して保存
3. 自動的にテストが再実行される
4. 終了するには `q` を押す

**便利な場面**:
- コードを書きながらテストが通るか確認したいとき
- バグ修正中

---

## テスト結果の見方

### 成功した場合

```
PASS src/__tests__/unit/hooks/useAuth.test.ts (15.234 s)
  useAuth（認証フック）
    ✓ 正常系: ログイン成功時、ユーザー情報が取得できる (1234 ms)
    ✓ 異常系: ログインエラー時、エラーメッセージが表示される (567 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        15.456 s
```

**見方**:
- `PASS` = ファイル全体が成功
- `✓` = 個別のテストが成功
- `Test Suites: 1 passed` = 1ファイル成功
- `Tests: 2 passed` = 2テスト成功

---

### 失敗した場合

```
FAIL src/__tests__/unit/hooks/useAuth.test.ts
  useAuth（認証フック）
    ✕ 正常系: ログイン成功時、ユーザー情報が取得できる (123 ms)

  ● useAuth（認証フック） › 正常系: ログイン成功時、ユーザー情報が取得できる

    expect(received).toBe(expected) // Object.is equality

    Expected: "test@example.com"
    Received: "wrong@example.com"

      56 |       const result = await login(email, password);
      57 |
    > 58 |       expect(result.user.email).toBe('test@example.com');
         |                                 ^
      59 |     });

      at Object.toBe (src/__tests__/unit/hooks/useAuth.test.ts:58:33)
```

**見方**:
1. `FAIL` = ファイルに失敗したテストがある
2. `✕` = 個別のテストが失敗
3. エラーメッセージに何が問題かが表示される
4. ファイル名と行番号が表示される (`useAuth.test.ts:58`)

---

### カバレッジレポートの見方

```bash
npm run test:coverage
```

実行後、このような表が表示されます：

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   60.38 |    45.83 |   58.33 |   60.38 |
 src/hooks          |   93.83 |    66.66 |     100 |   93.83 |
 src/lib            |   45.45 |    33.33 |   42.85 |   45.45 |
--------------------|---------|----------|---------|---------|-------------------
```

**各列の意味**:
- **% Stmts**: 実行された行の割合
- **% Branch**: 分岐（if文など）がテストされた割合
- **% Funcs**: テストされた関数の割合
- **% Lines**: テストされた行の割合

**目標**:
- 全体で60%以上（達成済み！）

---

## よくある問題と解決方法

### 問題1: 統合テストが並列実行で失敗する

**症状**:
```
FAIL src/__tests__/integration/channels.test.ts
FAIL src/__tests__/integration/messages.test.ts
```

**原因**: 複数の統合テストが同時にデータベースをクリアしようとして競合

**解決方法**:
```bash
# --runInBand オプションで順次実行
npm run test:integration
```

---

### 問題2: 「Cannot find module」エラー

**症状**:
```
Cannot find module '@/lib/prisma' from 'src/__tests__/...'
```

**原因**: パスエイリアス (`@/`) の設定が正しくない

**解決方法**:
`jest.config.js` に以下の設定があるか確認:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

---

### 問題3: データベース接続エラー

**症状**:
```
Error: P1001: Can't reach database server
```

**原因**: データベースに接続できない

**解決方法**:
1. `.env.local` に `DATABASE_URL` が設定されているか確認
2. データベースが起動しているか確認
3. Supabaseダッシュボードで接続文字列を再確認

---

### 問題4: テストが遅い

**症状**: テスト実行に5分以上かかる

**原因**: 統合テストがすべて実行されている

**解決方法**:
```bash
# ユニットテストだけ実行（30秒程度）
npm run test:unit
```

---

### 問題5: タイムアウトエラー

**症状**:
```
thrown: "Exceeded timeout of 5000 ms for a test."
```

**原因**: テストに5秒以上かかっている

**解決方法**:
統合テストは時間がかかるため、すでに15秒のタイムアウトが設定されています。
それでもエラーが出る場合は、データベース接続が遅い可能性があります。

---

## 日常的な使い方

### 開発中

```bash
# コードを書いている時
npm run test:unit

# または、ウォッチモードで自動実行
npm test -- --watch
```

---

### コミット前

```bash
# 全テストを確認
npm test

# もしエラーが出たら
npm run test:unit
npm run test:integration
```

---

### 週1回程度

```bash
# カバレッジ確認
npm run test:coverage
```

---

## package.json に追加されたスクリプト

以下のスクリプトが `package.json` に追加されています：

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest src/__tests__/unit",
    "test:integration": "jest src/__tests__/integration --runInBand",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

---

## まとめ

**よく使うコマンド**:
```bash
# 開発中（高速）
npm run test:unit

# コミット前（全テスト）
npm test

# カバレッジ確認（週1回）
npm run test:coverage
```

**初心者へのアドバイス**:
1. まずは `npm run test:unit` から始める
2. エラーメッセージをよく読む（どこで失敗したか書いてある）
3. わからないことがあれば、似たテストファイルを読んでみる
4. テストが通ったら、わざと失敗させてみる（理解が深まる）

何か質問があれば、気軽に聞いてください！
