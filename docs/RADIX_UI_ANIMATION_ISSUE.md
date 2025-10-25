# RadixUIでモバイルサイドバーのアニメーションが動かなかった理由と解決法

## 概要

モバイルサイドバーの開閉アニメーションを実装する際、shadcn/uiの`Sheet`コンポーネントを使用したところ、**閉じるアニメーションが動作しない**という問題が発生しました。

このドキュメントでは、なぜアニメーションが動かなかったのか、shadcn/uiとRadixUIの関係、どのような試行錯誤をしたのか、最終的にどう解決したのかを初心者向けに説明します。

## shadcn/uiとRadixUIの関係（重要）

### shadcn/uiとは

shadcn/uiは、**コピー＆ペーストで使えるReactコンポーネント集**です。

特徴：
- NPMパッケージではなく、コードをプロジェクトにコピーする形式
- 見た目（スタイル）を提供するもの
- TailwindCSSでスタイリングされている

インストール例：
```bash
npx shadcn@latest add sheet
# → src/components/ui/sheet.tsx にコードがコピーされる
```

### RadixUIとは

RadixUIは、**アクセシビリティに優れたヘッドレスUI ライブラリ**です。

特徴：
- コンポーネントの**動作（機能）**を提供する
- スタイルは含まれていない（見た目は自分で作る）
- キーボード操作、スクリーンリーダー対応などが組み込み済み

### shadcn/ui と RadixUI の関係

**重要なポイント**：

```
shadcn/ui の多くのコンポーネントは、内部で RadixUI を使っています。

shadcn/ui (見た目) = TailwindCSS + RadixUI (動作)
```

具体例：
```tsx
// src/components/ui/sheet.tsx (shadcn/ui)
import * as SheetPrimitive from "@radix-ui/react-dialog"  // ← RadixUIを使用

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetContent = SheetPrimitive.Content
// ...
```

つまり、**shadcn/ui の Sheet = RadixUI の Dialog に TailwindCSS のスタイルを追加したもの**です。

### 今回の問題の流れ

```
1. モバイルサイドバーに shadcn/ui の Sheet を使用
   ↓
2. Sheet の内部で Radix UI の Dialog が動作している
   ↓
3. Radix UI の Dialog は閉じる時に即座に DOM から削除する仕様
   ↓
4. 閉じるアニメーションが再生される前に要素が削除される
   ↓
5. 結果：閉じるアニメーションが動かない
```

**つまり**：
- 表面上は「shadcn/uiのSheetを使った」
- しかし実際は「RadixUIのDialogの仕組み」が原因でアニメーションが動かなかった

## 問題の発生状況

### やりたかったこと

- モバイルサイドバーを左からスライドインさせる（開く時）
- モバイルサイドバーを左にスライドアウトさせる（閉じる時）
- 背景のオーバーレイもフェードイン・フェードアウトさせる

### 実際に起きたこと

- **開くアニメーション**：正常に動作（左からスライドイン）
- **閉じるアニメーション**：動かない（瞬間的に消える）
- アニメーションの`duration`（再生時間）を変更しても効果なし

## 原因：RadixUIの仕組み

### RadixUI Dialog/Sheetの動作原理

RadixUIの`Dialog`（および`Sheet`）コンポーネントは、内部的に以下のように動作します：

```
1. ユーザーが閉じるボタンをクリック
   ↓
2. Reactのステートがfalseになる（open={false}）
   ↓
3. RadixUIが即座にDOMから要素を削除
   ↓
4. 画面から要素が消える
```

**問題点**：
- ステップ3で**即座に削除**されるため、CSSアニメーションが再生される時間がない
- 開くアニメーションは動く（DOM追加→アニメーション再生）
- 閉じるアニメーションは動かない（アニメーション再生前にDOM削除）

### 具体例で説明

通常のCSSアニメーションでは、以下のような流れでアニメーションが再生されます：

```css
/* 閉じるアニメーション: 0.5秒かけて左に移動 */
@keyframes slide-out-left {
  from { transform: translateX(0); }    /* 現在の位置 */
  to { transform: translateX(-100%); }  /* 画面外に移動 */
}

.animate-slide-out {
  animation: slide-out-left 0.5s ease-in;
}
```

**期待される動作**：
```
1. 閉じるボタンをクリック
2. .animate-slide-outクラスが適用される
3. 0.5秒かけてスライドアウト
4. アニメーション終了後に要素を削除
```

**RadixUIでの実際の動作**：
```
1. 閉じるボタンをクリック
2. 即座にDOM削除（0.0秒）← アニメーションが再生される前に削除！
3. 画面から瞬間的に消える
```

### なぜRadixUIはこのような仕組みなのか？

RadixUIは**アクセシビリティを最優先**に設計されています。

- モーダルが閉じた瞬間に、スクリーンリーダーに「閉じた」ことを即座に通知する必要がある
- フォーカス管理（モーダルを閉じたら元の場所にフォーカスを戻す）を確実に行うため
- DOM上に残っている要素があると、キーボード操作で意図せず触れてしまう可能性がある

つまり、**アクセシビリティのために、アニメーションよりも即座の削除を優先している**のです。

## 試した解決策（すべて失敗）

### 1. アニメーションdurationの調整

**試したこと**：
```tsx
// globals.cssで再生時間を長くしてみた
.animate-slide-out-left {
  animation: slide-out-left 0.7s ease-in;  // 0.5秒 → 0.7秒に変更
}
```

**結果**：効果なし
- RadixUIがDOM削除するタイミングには影響しない

### 2. Tailwind Configでアニメーション設定

**試したこと**：
```ts
// tailwind.config.ts
keyframes: {
  "slide-out-to-left": {
    "from": { transform: "translateX(0)" },
    "to": { transform: "translateX(-100%)" },
  },
},
animation: {
  "slide-out-to-left": "slide-out-to-left 0.7s ease-in",
}
```

**結果**：効果なし
- TailwindとRadixUIは独立して動作している
- RadixUIのDOM削除タイミングには影響しない

### 3. data属性を使ったアニメーション制御

**試したこと**：
```tsx
// sheet.tsx (shadcn/ui)
<SheetOverlay
  className="data-[state=open]:animate-in data-[state=closed]:animate-out"
/>
```

**結果**：効果なし
- `data-[state=closed]`が適用される前にDOMが削除される
- RadixUIの仕組み上、回避不可能

### 4. forceMount プロパティの使用

**試したこと**：
```tsx
<SheetContent forceMount>
  {/* ... */}
</SheetContent>
```

**目的**：
- `forceMount`を使うとRadixUIがDOMを削除しないように強制できる
- しかし、完全に動作を制御するのは困難

**結果**：部分的に改善したが完全な解決には至らず
- アクセシビリティの問題が発生する可能性
- フォーカス管理が正しく動作しない場合がある

## 解決策：カスタムコンポーネントの作成

### 最終的な判断

shadcn/ui（内部でRadixUI）の仕組み上の制限により、閉じるアニメーションを完全に制御することは困難だと判断しました。

そこで、shadcn/uiもRadixUIも使わず、**独自のモバイルサイドバーコンポーネント**を作成することにしました。

### カスタムコンポーネントの仕組み

新しく作成した`MobileSidebar.tsx`では、Reactの`useState`と`useEffect`を使ってアニメーションを完全に制御しています。

#### 1. 状態管理

```tsx
const [isVisible, setIsVisible] = useState(false);  // DOMに存在するか
const [isClosing, setIsClosing] = useState(false);  // 閉じるアニメーション中か
```

**なぜ2つの状態が必要？**

- `isVisible`: DOM自体の表示/非表示を制御
- `isClosing`: 閉じるアニメーションの再生を制御

この2つを組み合わせることで、「アニメーション再生後にDOM削除」を実現します。

#### 2. 開くアニメーション

```tsx
useEffect(() => {
  if (open) {
    setIsVisible(true);   // DOMに追加
    setIsClosing(false);  // 閉じるアニメーションをリセット
  }
}, [open]);
```

**動作の流れ**：
```
1. open={true}になる
2. setIsVisible(true) → DOMに要素が追加される
3. CSSアニメーション（slide-in-left）が自動的に再生される
4. 左からスライドイン
```

#### 3. 閉じるアニメーション（重要）

```tsx
useEffect(() => {
  if (!open && isVisible) {
    // 閉じる処理開始
    setIsClosing(true);  // 閉じるアニメーション開始

    // 0.5秒後にDOMから削除（アニメーション再生時間と同じ）
    const timer = setTimeout(() => {
      setIsVisible(false);  // DOMから削除
      setIsClosing(false);  // 状態をリセット
    }, 500);  // アニメーションの再生時間

    return () => clearTimeout(timer);  // クリーンアップ
  }
}, [open, isVisible]);
```

**動作の流れ**：
```
1. open={false}になる（ユーザーが閉じるボタンをクリック）
2. setIsClosing(true) → 閉じるアニメーションクラスが適用される
3. CSSアニメーション（slide-out-left）が0.5秒間再生される
4. 500ミリ秒後にsetTimeout実行
5. setIsVisible(false) → DOMから削除
```

**ポイント**：
- `setTimeout`の時間（500ms）とCSSアニメーションの時間（0.5s）を**必ず一致させる**
- これにより、アニメーションが完全に再生された後にDOMから削除される

#### 4. レンダリング

```tsx
if (!isVisible) return null;  // DOM自体を削除

return (
  <>
    {/* オーバーレイ */}
    <div
      className={`fixed inset-0 z-50 bg-black/[0.92] ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={() => onOpenChange(false)}
    />

    {/* サイドバー */}
    <div
      className={`fixed inset-y-0 left-0 z-50 h-full w-3/4 max-w-sm bg-background ${
        isClosing ? 'animate-slide-out-left' : 'animate-slide-in-left'
      }`}
    >
      {children}

      {/* 閉じるボタン */}
      <Button onClick={() => onOpenChange(false)}>
        <X className="h-5 w-5" />
      </Button>
    </div>
  </>
);
```

**ポイント**：
- `isClosing`が`true`の時は閉じるアニメーションクラス
- `isClosing`が`false`の時は開くアニメーションクラス
- アニメーション再生中もDOMは存在し続ける

#### 5. その他の機能

```tsx
// ESCキーで閉じる
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      onOpenChange(false);
    }
  };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, [open, onOpenChange]);

// 背景スクロールを防ぐ
useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [open]);
```

### CSSアニメーション定義

```css
/* globals.css */

/* 左からスライドイン（開く） */
@keyframes slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

/* 左にスライドアウト（閉じる） */
@keyframes slide-out-left {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

/* フェードイン */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* フェードアウト */
@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* アニメーションクラス */
.animate-slide-in-left {
  animation: slide-in-left 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-slide-out-left {
  animation: slide-out-left 0.5s ease-in;  /* ← setTimeout と同じ時間 */
}

.animate-fade-in {
  animation: fade-in 0.7s ease-out;
}

.animate-fade-out {
  animation: fade-out 0.5s ease-in;  /* ← setTimeout と同じ時間 */
}
```

## まとめ

### アニメーションが動かなかった理由

1. **shadcn/ui の Sheet コンポーネントを使用**
2. **Sheet の内部で RadixUI の Dialog が動作している**
3. **RadixUIの仕組み**：閉じる時に即座にDOMから要素を削除する
4. **CSS アニメーションの仕組み**：DOM上に要素が存在しないとアニメーションが再生されない
5. **結果**：閉じるアニメーションが再生される前に要素が削除され、瞬間的に消える

### カスタムコンポーネントで解決できた理由

1. **タイミングを完全制御**：`setTimeout`を使ってアニメーション再生後にDOM削除
2. **状態を明示的に管理**：`isVisible`と`isClosing`の2つの状態で開閉を制御
3. **CSSと同期**：`setTimeout`の時間とCSSアニメーションの時間を一致させる
4. **shadcn/ui・RadixUIに依存しない**：完全に自分で制御できる

### shadcn/ui と RadixUI について学んだこと

**shadcn/ui のメリット**：
- 美しいデザインがすぐに使える
- アクセシビリティが標準で組み込まれている
- コピー＆ペーストなので自由にカスタマイズ可能

**shadcn/ui のデメリット**：
- 内部でRadixUIを使っているため、RadixUIの仕様に縛られる
- 細かいアニメーション制御が難しい場合がある
- どこまでshadcn/uiの仕様で、どこからRadixUIの仕様なのか分かりにくい

**判断基準**：
- **シンプルなUI** → shadcn/ui を使う（速く、簡単）
- **複雑なアニメーション制御が必要** → カスタムコンポーネントを作る

### 初心者へのアドバイス

**ライブラリを使う時の注意点**：
- ライブラリ（shadcn/ui、RadixUIなど）は便利だが、内部の仕組みを理解することが重要
- 自分が実現したいことがライブラリの仕組みと合わない場合は、無理に使わない
- 必要に応じて自分でコンポーネントを作成する方が、シンプルで理解しやすい場合もある

**アニメーション実装のポイント**：
- アニメーション時間（duration）を統一する
- DOM削除のタイミングを慎重に制御する
- `setTimeout`とCSSアニメーションの時間を必ず一致させる

**デバッグのヒント**：
- 問題が起きたら、「どのライブラリのどの部分が原因か」を特定する
- shadcn/uiの問題 → スタイルの問題
- RadixUIの問題 → 動作（機能）の問題
- この区別ができると解決が早くなる

## 参考ファイル

- **カスタムコンポーネント**：`src/components/workspace/mobileSidebar.tsx`
- **アニメーション定義**：`src/app/globals.css`（70-121行目）
- **使用例**：`src/app/workspace/layout.tsx`（154-188行目）
- **削除したファイル**：`src/components/ui/sheet.tsx`（shadcn/ui の Sheet、もう使用していない）

## 関連ドキュメント

- [shadcn/ui Sheet Component](https://ui.shadcn.com/docs/components/sheet)
- [RadixUI Dialog Documentation](https://www.radix-ui.com/primitives/docs/components/dialog)
- [CSS Animations MDN](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_Animations)
- [React useEffect Hook](https://react.dev/reference/react/useEffect)
