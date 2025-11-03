# 技術的負債・リファクタリングTODO

このファイルは、将来対応すべき技術的負債やリファクタリング項目を記録します。

## 優先度: 中 - ディレクトリ構成の整理

### 問題
現在、ユーティリティ関数が2つのディレクトリに分散している：
- `/src/lib/utils.ts` - 汎用ユーティリティ（CSSクラス結合、日付フォーマット）
- `/src/utils/email-auth.ts` - 認証関連ユーティリティ

この構成は混乱を招く可能性がある。

### 推奨される対応

#### 案1: すべてを `/src/lib/` に統一（推奨）

```
src/lib/
├── utils.ts              # 汎用ユーティリティ
├── auth/
│   └── email-auth.ts    # /src/utils/email-auth.ts から移動
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   └── middleware.ts
├── validations.ts
└── prisma.ts
```

**移行手順**:
1. `/src/lib/auth/` ディレクトリを作成
2. `/src/utils/email-auth.ts` を `/src/lib/auth/email-auth.ts` に移動
3. すべてのインポートパスを更新:
   ```typescript
   // Before
   import { signIn, signOut } from '@/utils/email-auth'

   // After
   import { signIn, signOut } from '@/lib/auth/email-auth'
   ```
4. `/src/utils/` ディレクトリを削除
5. テストが通ることを確認

**影響範囲**:
- ログイン・サインアップページ (`src/app/login/actions.ts`, `src/app/signup/actions.ts`)
- その他、認証関数をインポートしている箇所

**対応時期**:
- `/src/utils/` に2つ目のファイルを追加する前
- または卒業制作提出後の改善フェーズ

### 理由
- Next.jsの慣習では `/src/lib/` がユーティリティの標準ディレクトリ
- 機能ごとにサブディレクトリで整理すると保守性が向上
- 新しいメンバーがコードベースを理解しやすくなる

### 記録日
2025-11-03

### ステータス
- [ ] 未対応

---

## その他の技術的負債

（今後、リファクタリングが必要な項目をここに追加）

### テンプレート

```markdown
## 優先度: [高/中/低] - [タイトル]

### 問題
[現在の問題点]

### 推奨される対応
[具体的な解決策]

### 理由
[なぜこの対応が必要か]

### 記録日
YYYY-MM-DD

### ステータス
- [ ] 未対応
```
