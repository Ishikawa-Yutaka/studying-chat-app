# act() 関数の使い方（学習用）

## act() とは？

**`act()`は、Reactのテストで「状態が更新される処理」を囲むための関数です。**

Reactコンポーネントは、状態（state）が変わると**自動的に再レンダリング**されます。

テストでは、この再レンダリングが完了するまで待つ必要があります。そのために`act()`を使います。

---

## なぜ act() が必要なのか？

### 問題: 状態更新は非同期

```typescript
function useCounter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
    // ← ここで即座にcountが1になるわけではない！
    // Reactが「後で」再レンダリングをスケジュールする
  };

  return { count, increment };
}
```

**重要**: `setState()`を呼んでも、状態は**すぐには更新されません**。

Reactは内部で「あとで更新する」という予約をするだけです。

---

### ❌ act() を使わない場合（警告が出る）

```typescript
test('ボタンをクリックするとカウントが増える', () => {
  const { result } = renderHook(() => useCounter());

  // ボタンをクリック → 状態が変わる
  result.current.increment();

  // ⚠️ 警告: "An update to TestComponent was not wrapped in act(...)"
  expect(result.current.count).toBe(1);
  // ← 実際には0のまま！（更新が間に合っていない）
});
```

**問題**:
1. `increment()`を呼ぶ → `setCount(1)`が実行される
2. でも、Reactの再レンダリングはまだ実行されていない
3. `expect()`が実行される → `count`はまだ0
4. **テスト失敗！**

---

### ✅ act() を使う場合（正しい）

```typescript
test('ボタンをクリックするとカウントが増える', () => {
  const { result } = renderHook(() => useCounter());

  // act() で囲む → 状態更新が完了するまで待つ
  act(() => {
    result.current.increment();
  });

  // ✅ 正しく動く
  expect(result.current.count).toBe(1);
});
```

**動作の流れ**:
1. `act()`の開始
2. `increment()`を実行 → `setCount(1)`
3. `act()`が再レンダリングを待つ
4. 再レンダリング完了 → `count`が1になる
5. `act()`の終了
6. `expect()`が実行される → `count`は1 ✅

---

## act() の基本的な使い方

### 1. 同期的な状態更新

```typescript
import { act } from '@testing-library/react';

test('名前を設定できる', () => {
  const { result } = renderHook(() => useUserState());

  act(() => {
    result.current.setName('Alice');
  });

  expect(result.current.name).toBe('Alice');
});
```

---

### 2. 非同期な状態更新（async/await）

```typescript
test('データを取得できる', async () => {
  const { result } = renderHook(() => useDataFetch());

  // 非同期処理は async () => {...} にして await をつける
  await act(async () => {
    await result.current.fetchData();
  });

  expect(result.current.data).toBeDefined();
});
```

---

### 3. イベントハンドラー

```typescript
test('ボタンをクリックすると表示が変わる', () => {
  render(<MyButton />);

  const button = screen.getByRole('button');

  act(() => {
    fireEvent.click(button);
  });

  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

**注意**: `fireEvent`は内部で自動的に`act()`で囲まれるので、手動で囲まなくても動くことが多いです。

---

## act() が必要なケース一覧

| 状況 | `act()`が必要？ | 例 |
|------|--------------|-----|
| `setState()`を直接呼ぶ | ✅ 必要 | `result.current.setName('Alice')` |
| `fetch()`などの非同期処理 | ✅ 必要 | `await result.current.fetchData()` |
| `useEffect`が実行される | ✅ 必要 | 初回レンダリング後の副作用 |
| `fireEvent.click()`などのイベント | △ 推奨（自動で囲まれることもある） | `fireEvent.click(button)` |
| データを読むだけ | ❌ 不要 | `expect(result.current.name).toBe('Alice')` |
| コンポーネントをレンダリングするだけ | ❌ 不要 | `render(<MyComponent />)` |

---

## 実際のプロジェクトでの例

### 今回修正したコード

#### ❌ 修正前（エラーが出る）

```typescript
test('refreshDashboardData を呼び出すと API が呼ばれる', async () => {
  const { result } = renderHook(() =>
    useRealtimeDashboard({
      initialStats: mockInitialStats,
      initialChannels: mockInitialChannels,
      initialDirectMessages: mockInitialDirectMessages,
      currentUserId: mockCurrentUserId,
    })
  );

  // ❌ act() がないので警告が出る
  await result.current.refreshDashboardData();

  expect(global.fetch).toHaveBeenCalledWith(
    `/api/dashboard?userId=${mockCurrentUserId}`
  );
});
```

**警告メッセージ**:
```
Warning: An update to TestComponent inside a test was not wrapped in act(...)
```

---

#### ✅ 修正後（正しく動く）

```typescript
test('refreshDashboardData 成功時、fetchが正しいデータで呼ばれる', async () => {
  const { result } = renderHook(() =>
    useRealtimeDashboard({
      initialStats: mockInitialStats,
      initialChannels: mockInitialChannels,
      initialDirectMessages: mockInitialDirectMessages,
      currentUserId: mockCurrentUserId,
    })
  );

  // ✅ act() で囲む → 状態更新が完了するまで待つ
  await act(async () => {
    await result.current.refreshDashboardData();
  });

  // fetchが正しいパラメータで呼ばれたことを確認
  expect(global.fetch).toHaveBeenCalledWith(
    `/api/dashboard?userId=${mockCurrentUserId}`
  );
});
```

**ポイント**: 状態を更新する処理（`setStats`など）を含む関数は、必ず`act()`で囲む必要があります。

---

### refreshDashboardData の内部処理

```typescript
const refreshDashboardData = useCallback(async () => {
  try {
    console.log('🔄 ダッシュボードデータを再取得中...');

    const response = await fetch(`/api/dashboard?userId=${currentUserId}`);
    const data = await response.json();

    if (data.success) {
      // ← ここで状態を更新している！
      setStats(data.stats);              // ← act() で囲む必要がある
      setChannels(data.channels);        // ← act() で囲む必要がある
      setDirectMessages(data.directMessages); // ← act() で囲む必要がある
      console.log('✅ ダッシュボードデータを更新しました');
    }
  } catch (error) {
    console.error('❌ ダッシュボードデータの更新に失敗:', error);
  }
}, [currentUserId]);
```

**重要**: `setStats()`, `setChannels()`, `setDirectMessages()`が呼ばれるので、`act()`が必要。

---

## act() の仕組み（内部動作）

```
1. act() の開始
   ↓
2. 中の処理を実行（例: setStats(newStats)）
   ↓
3. Reactが再レンダリングをスケジュール
   ↓
4. act() が「再レンダリングが完了するまで待つ」
   ↓
5. 再レンダリング完了
   ↓
6. act() の終了
   ↓
7. テストが次に進む
```

**重要**: `act()`がないと、「4. 再レンダリング完了を待つ」がスキップされてしまいます。

---

## よくある間違い

### ❌ 間違い1: async を忘れる

```typescript
// ❌ ダメ: async がない
await act(() => {
  await result.current.fetchData(); // エラー！
});
```

```typescript
// ✅ 正しい: async をつける
await act(async () => {
  await result.current.fetchData();
});
```

---

### ❌ 間違い2: await を忘れる

```typescript
// ❌ ダメ: await がない
act(async () => {
  await result.current.fetchData();
}); // ← Promise が返るのに await していない

expect(result.current.data).toBeDefined(); // まだ取得できていない
```

```typescript
// ✅ 正しい: await をつける
await act(async () => {
  await result.current.fetchData();
});

expect(result.current.data).toBeDefined(); // 正しく取得できている
```

---

### ❌ 間違い3: 読み取りだけなのに act() を使う

```typescript
// ❌ 不要: 状態を変更していない
act(() => {
  const name = result.current.name; // 読み取りだけ
});
```

```typescript
// ✅ 正しい: act() は不要
const name = result.current.name;
expect(name).toBe('Alice');
```

---

## まとめ

### act() を使う基本ルール

1. **状態を変更する処理は`act()`で囲む**
2. **非同期処理の場合は`await act(async () => {...})`**
3. **状態を読むだけなら不要**

### チェックリスト

テストを書くときは、以下をチェック：

- [ ] `setState()`や`setXxx()`を呼んでいる？ → `act()`で囲む
- [ ] `fetch()`や`async`関数を呼んでいる？ → `await act(async () => {...})`
- [ ] イベントハンドラーを実行している？ → `act()`で囲む（または`fireEvent`に任せる）
- [ ] データを読んでいるだけ？ → `act()`は不要

### エラーが出たら

```
Warning: An update to TestComponent was not wrapped in act(...)
```

このエラーが出たら：
1. どこで状態が更新されているか確認
2. その部分を`act(() => {...})`で囲む
3. 非同期処理なら`await act(async () => {...})`に変更

---

## 参考リンク

- [React 公式ドキュメント - act()](https://react.dev/reference/react/act)
- [Testing Library - Async Utilities](https://testing-library.com/docs/dom-testing-library/api-async/)

---

## 練習問題

### 問題1: 以下のコードを修正してください

```typescript
test('ユーザー名を設定できる', () => {
  const { result } = renderHook(() => useUser());

  result.current.setName('Bob');

  expect(result.current.name).toBe('Bob');
});
```

<details>
<summary>答え</summary>

```typescript
test('ユーザー名を設定できる', () => {
  const { result } = renderHook(() => useUser());

  act(() => {
    result.current.setName('Bob');
  });

  expect(result.current.name).toBe('Bob');
});
```

</details>

---

### 問題2: 以下のコードを修正してください

```typescript
test('データを取得できる', async () => {
  const { result } = renderHook(() => useDataFetch());

  await result.current.loadData();

  expect(result.current.data).toBeDefined();
});
```

<details>
<summary>答え</summary>

```typescript
test('データを取得できる', async () => {
  const { result } = renderHook(() => useDataFetch());

  await act(async () => {
    await result.current.loadData();
  });

  expect(result.current.data).toBeDefined();
});
```

</details>

---

以上です！テストを書くときは、この学習ファイルを参考にしてください。
