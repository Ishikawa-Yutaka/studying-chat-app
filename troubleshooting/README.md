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

- **React**: useEffect, useState, useCallback, useMemo
- **Supabase**: Realtime, PostgreSQL Publication
- **PostgreSQL**: 論理レプリケーション, システムカタログ
- **TypeScript**: 型安全性, インターフェース定義

## 📚 参考リンク

- [React公式ドキュメント - useEffect](https://react.dev/reference/react/useEffect)
- [Supabase Realtime公式ドキュメント](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Publication公式ドキュメント](https://www.postgresql.org/docs/current/sql-createpublication.html)

---

これらのドキュメントが今後の開発に役立つことを願っています。問題が解決しない場合は、具体的なエラーメッセージとコードを添えてお問い合わせください。