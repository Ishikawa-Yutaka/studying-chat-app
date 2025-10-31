# プロジェクトドキュメント

このフォルダには、チャットアプリ制作の際に学んだの設計・実装に関する内容のファイルを保存しています。

## 📋 ドキュメント一覧

### 🔒 セキュリティ・認証

#### 1. [API_SECURITY_AUTHENTICATION.md](./API_SECURITY_AUTHENTICATION.md)

**API セキュリティ：認証トークンベースの実装**

- **内容**: 共通認証関数によるセキュリティ強化の実装ガイド
- **対象**: 全 API エンドポイントの認証統一化
- **学習ポイント**: Supabase Auth 連携、トークンベース認証、共通関数パターン

#### 2. [SECURITY_AND_VALIDATION.md](./SECURITY_AND_VALIDATION.md)

**バリデーションとセキュリティ対策ガイド**

- **内容**: 入力検証、XSS 対策、SQL インジェクション対策などの実装方法
- **対象**: フォーム入力、メッセージ送信、ファイルアップロードのバリデーション
- **学習ポイント**: React Hook Form + Zod、サニタイゼーション、セキュリティベストプラクティス

#### 3. [SECURITY_FIXES_SUMMARY.md](./SECURITY_FIXES_SUMMARY.md)

**セキュリティ修正サマリー**

- **内容**: プロジェクトで発見された脆弱性と修正内容のまとめ
- **対象**: スレッド API、チャンネル削除 API、DM 作成 API のセキュリティ修正
- **学習ポイント**: 認証チェックの重要性、権限管理、脆弱性の発見と対処

### 🗄️ データベース・データ管理

#### 4. [DATABASE_ACCESS_PATTERNS.md](./DATABASE_ACCESS_PATTERNS.md)

**データベースアクセスパターン：Prisma vs Supabase SDK**

- **内容**: Prisma と Supabase SDK の使い分け方法
- **対象**: データベースアクセスの設計パターン
- **学習ポイント**: ORM の役割、Realtime 機能の使い分け、適切なアクセス方法の選択

#### 5. [PRISMA_RELATION_GUIDE.md](./PRISMA_RELATION_GUIDE.md)

**Prisma リレーション（@relation）初心者ガイド**

- **内容**: Prisma のリレーション設定の基礎から応用まで
- **対象**: テーブル間のリレーション定義、外部キー設定
- **学習ポイント**: 1 対多、多対多のリレーション、参照整合性、Cascade 削除

#### 6. [SIGNUP_DATA_FLOW.md](./SIGNUP_DATA_FLOW.md)

**サインアップ時のデータフロー完全ガイド**

- **内容**: ユーザー登録からデータベース保存までの完全な流れ
- **対象**: Supabase Auth ↔ Prisma Database の連携
- **学習ポイント**: 2 段階認証、メール確認フロー、Auth ID と Prisma ID の管理

### 🎨 UI/UX・フロントエンド

#### 7. [OPTIMISTIC_UPDATE_IMPLEMENTATION.md](./OPTIMISTIC_UPDATE_IMPLEMENTATION.md)

**楽観的更新（Optimistic Update）実装ガイド**

- **内容**: チャンネル参加・退出時の即座の UI 更新実装
- **対象**: サイドバーのチャンネル一覧、リアルタイム UI 更新
- **学習ポイント**: 楽観的更新パターン、状態管理、UX 向上テクニック

#### 8. [RADIX_UI_ANIMATION_ISSUE.md](./RADIX_UI_ANIMATION_ISSUE.md)

**RadixUI でモバイルサイドバーのアニメーションが動かなかった理由と解決法**

- **内容**: shadcn/ui Sheet コンポーネントのアニメーション問題と解決方法
- **対象**: モバイルサイドバーの開閉アニメーション
- **学習ポイント**: RadixUI 仕組み、CSS Modules、アニメーション制御

### ⚡ リアルタイム機能

#### 9. [REALTIME_ONLINE_STATUS_GUIDE.md](./REALTIME_ONLINE_STATUS_GUIDE.md)

**リアルタイムオンライン状態表示機能 - 実装ガイド**

- **内容**: Supabase Presence を使ったオンライン状態追跡機能
- **対象**: ユーザーのオンライン/オフライン状態のリアルタイム表示
- **学習ポイント**: Supabase Presence、React Context、WebSocket ベースのリアルタイム通信

### 🔧 設定・セットアップ

#### 10. [SUPABASE_EMAIL_CONFIRMATION_SETUP.md](./SUPABASE_EMAIL_CONFIRMATION_SETUP.md)

**Supabase メール確認設定ガイド**

- **内容**: メール確認機能の設定手順とトラブルシューティング
- **対象**: Supabase Auth のメール確認フロー設定
- **学習ポイント**: リダイレクト URL 設定、メールテンプレート、認証コールバック

#### 11. [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md)

**Supabase Storage セットアップガイド**

- **内容**: ファイルアップロード機能のための Storage 設定手順
- **対象**: 画像・ファイルのアップロード・ダウンロード機能
- **学習ポイント**: バケット作成、セキュリティポリシー、パブリック/プライベートストレージ

#### 12. [SOCIAL_AUTH_SETUP.md](./SOCIAL_AUTH_SETUP.md)

**ソーシャル認証セットアップガイド**

- **内容**: Google、GitHub、Twitter、Facebook でのソーシャルログイン実装
- **対象**: OAuth2.0 ベースのソーシャル認証
- **学習ポイント**: OAuth 設定、プロバイダー連携、認証フロー

### 📝 開発履歴・コンテキスト

#### 13. [CONTEXT_HANDOVER_20251027.md](./CONTEXT_HANDOVER_20251027.md)

**コンテキスト引き継ぎ - 2025 年 10 月 27 日**

- **内容**: メール確認フローと Prisma Client 問題解決の開発履歴
- **対象**: セッションごとの作業内容と次回タスク
- **学習ポイント**: 開発プロセスの記録、知識の引き継ぎ

## 🎯 活用方法

### 開発者向け

- **実装リファレンス**: 各機能の実装方法を詳細に記載
- **ベストプラクティス学習**: 初心者向けの解説付き
- **トラブルシューティング**: よくある問題の解決方法

### プロジェクト管理

- **設計ドキュメント**: アーキテクチャと設計思想の記録
- **セキュリティチェック**: セキュリティ対策の確認
- **新メンバー向けオンボーディング**: プロジェクトの理解を促進

## 🔍 関連技術

- **認証・セキュリティ**: Supabase Auth, JWT, OAuth2.0, Zod, バリデーション
- **データベース**: Prisma ORM, PostgreSQL, リレーション管理
- **リアルタイム**: Supabase Realtime, Presence, WebSocket
- **フロントエンド**: React, Next.js, React Hook Form, 楽観的更新
- **UI/UX**: shadcn/ui, RadixUI, TailwindCSS, アニメーション
- **ストレージ**: Supabase Storage, ファイルアップロード

## 📚 参考リンク

- [Supabase 公式ドキュメント](https://supabase.com/docs)
- [Prisma 公式ドキュメント](https://www.prisma.io/docs)
- [Next.js 公式ドキュメント](https://nextjs.org/docs)
- [shadcn/ui 公式サイト](https://ui.shadcn.com/)
- [Radix UI 公式ドキュメント](https://www.radix-ui.com/)
- [React Hook Form 公式ドキュメント](https://react-hook-form.com/)
- [Zod 公式ドキュメント](https://zod.dev/)

## 📖 ドキュメントの読み方

### 初心者の方へ

1. **まずはこれから**: [SIGNUP_DATA_FLOW.md](./SIGNUP_DATA_FLOW.md) - アプリ全体の仕組みを理解
2. **セキュリティの基礎**: [SECURITY_AND_VALIDATION.md](./SECURITY_AND_VALIDATION.md) - 安全な開発の基本
3. **データベースの基礎**: [PRISMA_RELATION_GUIDE.md](./PRISMA_RELATION_GUIDE.md) - データベース設計の理解

### 機能実装時

1. **認証が必要**: [API_SECURITY_AUTHENTICATION.md](./API_SECURITY_AUTHENTICATION.md)
2. **リアルタイム機能**: [REALTIME_ONLINE_STATUS_GUIDE.md](./REALTIME_ONLINE_STATUS_GUIDE.md)
3. **ファイルアップロード**: [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md)

### トラブル発生時

1. **セキュリティ問題**: [SECURITY_FIXES_SUMMARY.md](./SECURITY_FIXES_SUMMARY.md)
2. **アニメーション問題**: [RADIX_UI_ANIMATION_ISSUE.md](./RADIX_UI_ANIMATION_ISSUE.md)
3. **メール確認エラー**: [SUPABASE_EMAIL_CONFIRMATION_SETUP.md](./SUPABASE_EMAIL_CONFIRMATION_SETUP.md)

---

これらのドキュメントは実際の開発中に作成されたものであり、実践的な知識が詰まっています。プロジェクトの理解を深め、より良いコードを書くために活用してください。
