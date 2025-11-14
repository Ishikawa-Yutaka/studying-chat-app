# E2Eテストで発見されたuseEffect無限ループ問題

発生日: 2025-01-05
解決日: 2025-01-05

## 問題の概要

**症状**: ログイン後、`/workspace`ページが正常に読み込まれず、JSONParseErrorが発生

**エラーメッセージ**:
```
SyntaxError: Unexpected end of JSON input
  at JSON.parse (<anonymous>) {
page: '/workspace'
}
GET /workspace 500
```

**影響範囲**:
- ログイン後のダッシュボードが表示されない
- E2Eテストが全てタイムアウトで失敗
- ページが「ログイン中...」で停止

---

## 根本原因

### 1. useEffectの依存配列の問題

3つのカスタムフックで、`createClient()`が毎回新しいSupabaseインスタンスを作成し、それがuseEffectの依存配列に含まれていたため、**無限ループ**が発生していました。

**問題のあったファイル**:
1. `src/hooks/useAuth.ts`
2. `src/hooks/useRealtimeDashboard.ts`
3. `src/hooks/useRealtimeMessages.ts`

### 2. 無限ループの仕組み

```typescript
// ❌ バグのあるコード
export function useAuth() {
  const supabase = createClient(); // ← 毎回新しいインスタンス

  useEffect(() => {
    // 認証処理...
  }, [supabase]); // ← supabaseが変わるたびに再実行
}
```

**無限ループの流れ**:
1. コンポーネントがレンダリング
2. `createClient()`が新しいインスタンスAを作成
3. useEffectが実行される
4. 何らかの理由でコンポーネントが再レンダリング
5. `createClient()`が新しいインスタンスBを作成
6. `A !== B` なので、useEffectが再実行される
7. → 3に戻る（無限ループ）

---

## なぜ単体テスト・統合テストで発見できなかったか

### 決定的な理由: **モックの仕組み**

#### 単体テストのコード（useAuth.test.ts）

```typescript
// Supabaseクライアントをモック化
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// テスト内でモックの戻り値を設定
mockCreateClient.mockReturnValue({
  auth: {
    getUser: mockGetUser,
    onAuthStateChange: mockOnAuthStateChange,
  },
} as any)
```

#### モックと本番環境の違い

| 環境 | createClient()の挙動 | オブジェクトの同一性 | 無限ループ |
|------|---------------------|-------------------|----------|
| **テスト環境** | 常に同じモックオブジェクトを返す | `supabase1 === supabase2` → **true** | ❌ 発生しない |
| **本番環境** | 毎回新しいインスタンスを作成 | `supabase1 === supabase2` → **false** | ✅ 発生する |

#### なぜテストで検出できないか

**テスト環境**:
```typescript
const supabase1 = createClient(); // → モックオブジェクトA
const supabase2 = createClient(); // → 同じモックオブジェクトA

// useEffectの依存配列の比較
oldSupabase === newSupabase // → true
// useEffectは再実行されない → 無限ループ発生しない ✅
```

**本番環境（ブラウザ）**:
```typescript
const supabase1 = createClient(); // → 新しいインスタンスA
const supabase2 = createClient(); // → 新しいインスタンスB

// useEffectの依存配列の比較
oldSupabase === newSupabase // → false
// useEffectが再実行される → 無限ループ発生 ❌
```

---

## E2Eテストで発見できた理由

### E2Eテストの特徴

1. **実際のブラウザで実行**
   - モックを使わない
   - 本物のSupabaseクライアントを使用

2. **本番環境に近い**
   - `createClient()`が実際に新しいインスタンスを作成
   - 無限ループが再現される

3. **タイムアウトで顕在化**
   - ページが読み込まれない
   - JSONParseError（リクエストが完了しない）
   - テストがタイムアウト

### E2Eテストの実行結果（エラー発生時）

```
✓ ログインページが表示される (2秒)
✓ 未ログイン状態で /workspace にアクセスすると /login にリダイレクトされる (1秒)
✗ 正しい認証情報でログインできる (30秒 - タイムアウト)
✗ ログアウトできる (30秒 - タイムアウト)
✗ 間違ったパスワードでログインできない (30秒 - タイムアウト)
```

**サーバーログ**:
```
⨯ SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>) {
  page: '/workspace'
}
GET /workspace 500
```

---

## 解決方法

### 修正内容

3つのカスタムフックで、`useMemo`を使ってSupabaseインスタンスを安定化し、依存配列から削除しました。

#### 1. useAuth.ts の修正

**Before（バグあり）**:
```typescript
export function useAuth() {
  const supabase = createClient(); // ← 毎回新しいインスタンス

  useEffect(() => {
    // ...
  }, [supabase]); // ← 問題
}
```

**After（修正後）**:
```typescript
import { useMemo } from 'react';

export function useAuth() {
  // useMemoでsupabaseインスタンスを安定化（無限ループ防止）
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // ...
  }, [supabase]); // ← supabaseは常に同じオブジェクトなので問題なし
}
```

#### 2. useRealtimeDashboard.ts の修正

**Before**:
```typescript
export function useRealtimeDashboard(...) {
  const supabase = createClient();

  useEffect(() => {
    // ...
  }, [supabase, refreshDashboardData]);
}
```

**After**:
```typescript
export function useRealtimeDashboard(...) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // ...
    // supabaseはuseMemoで安定化されているため、依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshDashboardData]);
}
```

#### 3. useRealtimeMessages.ts の修正

同様に `useMemo` で修正しました。

---

## 他のファイルは問題なかった

以下のファイルは、useEffectの**内部**で`createClient()`を呼んでいるため、依存配列に含まれず、問題ありませんでした：

- `src/hooks/usePresence.ts`
- `src/components/workspace/directMessageList.tsx`

**正しいパターン**:
```typescript
useEffect(() => {
  const supabase = createClient(); // ← useEffect内で定義
  // ...
}, [userId]); // ← supabaseは依存配列に含まれない
```

---

## テストの種類ごとの検出能力

| テストの種類 | 無限ループ検出 | 理由 |
|------------|------------|------|
| **単体テスト** | ❌ 検出できない | モックが同じオブジェクトを返す |
| **統合テスト** | ❌ 検出できない | モックが同じオブジェクトを返す |
| **E2Eテスト** | ✅ **検出できる** | 本物のSupabaseクライアントを使用 |

---

## 今後の予防策

### 1. React Strict Modeの活用

開発環境で`<React.StrictMode>`を有効にすると、useEffectが2回実行されて問題が顕在化する場合があります。

```tsx
// src/app/layout.tsx
<React.StrictMode>
  <App />
</React.StrictMode>
```

### 2. ESLintルールの活用

既に設定されていますが、以下のルールを厳守：

```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 3. 無限ループ検出テストの追加

カスタムテストを書いて検出する：

```typescript
test('useAuthが無限ループしない', async () => {
  let renderCount = 0;

  const TestComponent = () => {
    useAuth();
    renderCount++;
    return null;
  };

  render(<TestComponent />);

  await waitFor(() => {
    // 10回以上レンダリングされたら無限ループと判定
    expect(renderCount).toBeLessThan(10);
  }, { timeout: 5000 });
});
```

### 4. E2Eテストを早期に実行

- 単体テスト・統合テストだけでなく、**E2Eテストも早期に実行**
- E2Eテストは時間がかかるが、本番環境に近いバグを検出できる
- **今回の最大の教訓**: E2Eテストは「最後の砦」ではなく、開発の早い段階で実行すべき

---

## 学んだこと

### 1. モックの限界

単体テスト・統合テストは非常に重要ですが、**モックではパフォーマンス問題や無限ループを検出できない場合がある**ことを理解する必要があります。

### 2. React hooksの依存配列の重要性

- useEffectの依存配列は、**オブジェクトの同一性**（参照の比較）で判断される
- プリミティブ型（string, number, boolean）は値で比較されるが、オブジェクトは参照で比較される
- `useMemo`や`useCallback`を使って、オブジェクトや関数を安定化することが重要

### 3. E2Eテストの価値

E2Eテストは実行時間が長く、セットアップも大変ですが、**本番環境に近い問題を発見できる唯一の手段**です。

**テストピラミッド**の考え方：
```
       /\
      /E2E\       ← 少数だが重要（本番に近い）
     /------\
    / 統合   \    ← 中程度（複数モジュールの連携）
   /----------\
  /  単体テスト \  ← 大量（個別機能の検証）
 /--------------\
```

今回の問題は、**E2Eテストだけが検出できた**という事実が、E2Eテストの重要性を証明しています。

---

## 参考資料

- React公式ドキュメント: [useEffect依存配列](https://react.dev/reference/react/useEffect#dependencies)
- React公式ドキュメント: [useMemo](https://react.dev/reference/react/useMemo)
- `troubleshooting/INFINITE_LOOP_TROUBLESHOOTING.md` - 無限ループ全般のトラブルシューティング

---

最終更新日: 2025-01-05
