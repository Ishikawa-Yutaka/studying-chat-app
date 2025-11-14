# トラブルシューティング ドキュメント

このフォルダには、チャットアプリ開発中に発生した問題とその解決方法をまとめたドキュメントが含まれています。

## 📋 ドキュメント一覧

### 1. [REALTIME_TROUBLESHOOTING.md](./REALTIME_TROUBLESHOOTING.md)
**Supabase Realtime機能の実装トラブルシューティング**

- **対象**: Supabase Realtimeが動作しない問題
- **主な原因**: PostgreSQL Publicationの設定不備
- **解決策**: `ALTER PUBLICATION supabase_realtime ADD TABLE "Message";`
- **学習ポイント**: PostgreSQL Publication、WebSocket接続、リアルタイム配信の仕組み

### 2. [INFINITE_LOOP_TROUBLESHOOTING.md](./INFINITE_LOOP_TROUBLESHOOTING.md)
**React useEffect無限ループの解決方法**

- **対象**: "Maximum update depth exceeded" エラー
- **主な原因**: useEffect依存関係でのオブジェクト参照問題
- **解決策**: プリミティブ値のみを依存関係に使用
- **学習ポイント**: React依存関係の仕組み、useCallback/useMemo活用法

### 3. [SUPABASE_AUTH_INTEGRATION.md](./SUPABASE_AUTH_INTEGRATION.md)
**Supabase認証システム統合トラブルシューティング**

- **対象**: 認証統合後にチャンネル・データが表示されない問題
- **主な原因**: Supabase AuthIDとPrisma内部IDの不整合
- **解決策**: `authId`フィールドによるID変換処理実装
- **学習ポイント**: マイクロサービス連携、ORMとAuth統合、ユーザーID管理

### 4. [PRISMA_MIGRATION_DRIFT_ERROR.md](./PRISMA_MIGRATION_DRIFT_ERROR.md)
**Prismaマイグレーション管理の構築**

- **対象**: "Drift detected" エラー、マイグレーションが実行できない問題
- **主な原因**: マイグレーション履歴テーブル（`_prisma_migrations`）が存在しない
- **解決策**: ベースラインマイグレーション作成、既存DBへのマイグレーション管理導入
- **学習ポイント**: Prismaマイグレーション管理、データベーススキーマ同期、本番デプロイ準備

### 5. [BUILD_CACHE_ERROR.md](./BUILD_CACHE_ERROR.md) ⭐ **NEW**
**Next.jsビルドキャッシュエラーの解決方法**

- **対象**: "Cannot read properties of undefined (reading 'call')" エラー、API 500エラー
- **主な原因**: 大規模な型定義変更後のビルドキャッシュ不整合
- **解決策**: `.next` ディレクトリを削除して再ビルド（`rm -rf .next && npm run dev`）
- **学習ポイント**: Next.jsビルドキャッシュの仕組み、Webpack依存関係管理、型定義変更時のベストプラクティス

### 6. [DATABASE_CONNECTION_IPV4_ERROR.md](./DATABASE_CONNECTION_IPV4_ERROR.md)
**データベース接続エラー: IPv4/IPv6互換性問題**

- **対象**: "Can't reach database server" エラー、Prismaデータベース接続エラー
- **主な原因**: IPv6環境でIPv4アドレスへの接続失敗
- **解決策**: Supabase接続プールURL使用、IPv6トンネリング設定
- **学習ポイント**: IPv4/IPv6互換性、Prisma接続設定、Supabase接続プール

### 7. [DM_CREATION_ERROR.md](./DM_CREATION_ERROR.md)
**DM作成エラーの解決方法**

- **対象**: "DMの作成に失敗しました" エラー、Prismaクエリエラー
- **主な原因**: Prismaクエリの誤った引数使用（存在しないフィールド指定）
- **解決策**: Prismaスキーマに存在するフィールドのみ使用、適切なクエリ構文
- **学習ポイント**: Prismaクエリ構文、スキーマ定義確認、エラーメッセージ解読

### 8. [SIGNUP_EMAIL_CONFIRMATION_ERROR.md](./SIGNUP_EMAIL_CONFIRMATION_ERROR.md)
**サインアップ・メール確認フローのエラー解決ガイド**

- **対象**: 新規ユーザーログイン失敗、メール確認後のエラー
- **主な原因**: メール確認フローのUI未実装、Prismaデータベース未連携
- **解決策**: メール確認画面実装、認証コールバックでPrismaユーザー作成
- **学習ポイント**: Supabase Auth認証フロー、メール確認UI/UX、Auth↔Prisma連携

### 9. [E2E_DISCOVERED_USEEFFECT_LOOP.md](./E2E_DISCOVERED_USEEFFECT_LOOP.md) ⭐ **NEW**
**E2Eテストで発見されたuseEffect無限ループ問題**

- **対象**: ログイン後の /workspace ページが読み込まれない、JSONParseError
- **主な原因**: useEffect依存配列でSupabaseインスタンスが毎回新しく作成される
- **解決策**: `useMemo(() => createClient(), [])` でインスタンスを安定化
- **学習ポイント**: E2Eテストの重要性、モックの限界、React hooksの依存配列、オブジェクト参照の比較
- **重要な発見**: 単体テスト・統合テストでは検出できない問題をE2Eテストが発見した事例

### 10. [E2E_REALTIME_TEST_SKIP.md](./E2E_REALTIME_TEST_SKIP.md) ⭐ **NEW**
**E2Eテスト: リアルタイムテストのスキップについて**

- **対象**: リアルタイムテスト（複数ユーザー同時ログイン）が失敗
- **主な原因**: Supabaseのデータベース接続数制限、E2E環境での瞬間的な高負荷
- **解決策**: `test.skip()` で意図的にスキップ、理由をコメントで明記
- **学習ポイント**: E2Eテストの限界、環境依存性の理解、テストスキップの正当性、手動テストとの使い分け
- **重要な発見**: すべてのテストを自動化する必要はない。コストパフォーマンスと目的を考慮する

## 🎯 活用方法

### 開発者向け
- 同様の問題に遭遇した際の参考資料
- React/Supabaseのベストプラクティス学習
- コードレビュー時のチェックポイント

### プロジェクト管理
- 技術的課題の記録と共有
- 開発チーム間での知識共有
- 将来のプロジェクトでの予防策

## 🔍 関連技術

- **React**: useEffect, useState, useCallback, useMemo, 依存配列, オブジェクト参照比較
- **Next.js**: App Router, ビルドキャッシュ, Webpack設定
- **Supabase**: Realtime, Auth, PostgreSQL Publication, メール確認フロー, クライアントインスタンス管理
- **Prisma**: ORM, マイグレーション管理, リレーション管理, ユーザーID管理, クエリ構文
- **PostgreSQL**: 論理レプリケーション, システムカタログ, スキーマ同期, 接続プール
- **TypeScript**: 型安全性, インターフェース定義, 型定義管理
- **Webpack**: モジュール解決, 依存関係管理, ビルドキャッシュ
- **認証システム**: JWT, セッション管理, マイクロサービス連携, メール確認フロー, Auth↔DB連携
- **ネットワーク**: IPv4/IPv6互換性, データベース接続設定, トンネリング
- **データベースマイグレーション**: スキーマバージョン管理, ベースライン作成, 本番デプロイ
- **テスト**: E2Eテスト, 単体テスト, 統合テスト, モックの限界, Playwright, テストスキップ, 環境依存性
- **データベース接続管理**: 接続プーリング, 接続数制限, PgBouncer, Supabase制限, レート制限

## 📚 参考リンク

- [React公式ドキュメント - useEffect](https://react.dev/reference/react/useEffect)
- [React公式ドキュメント - useMemo](https://react.dev/reference/react/useMemo)
- [Next.js公式ドキュメント - Building Your Application](https://nextjs.org/docs/app/building-your-application)
- [Supabase Realtime公式ドキュメント](https://supabase.com/docs/guides/realtime)
- [Supabase Auth公式ドキュメント](https://supabase.com/docs/guides/auth)
- [Prisma公式ドキュメント](https://www.prisma.io/docs)
- [PostgreSQL Publication公式ドキュメント](https://www.postgresql.org/docs/current/sql-createpublication.html)
- [Webpack公式ドキュメント - Caching](https://webpack.js.org/guides/caching/)
- [Playwright公式ドキュメント](https://playwright.dev/)

---

これらのドキュメントが今後の開発に役立つことを願っています。問題が解決しない場合は、具体的なエラーメッセージとコードを添えてお問い合わせください。