/**
 * E2Eテスト用セットアップヘルパー
 *
 * 目的: テスト実行前後のデータベース準備・クリーンアップ
 */

/**
 * テストデータをセットアップする
 *
 * E2Eテスト実行前に、Seed APIを呼び出してテストデータを投入します。
 *
 * @param baseURL - アプリケーションのベースURL
 *
 * 処理の流れ:
 * 1. Seed APIにPOSTリクエスト
 * 2. テストユーザー、チャンネル、メッセージを作成
 *
 * 注意: Seed APIは開発環境でのみ有効です
 */
export async function setupTestData(baseURL: string) {
  const response = await fetch(`${baseURL}/api/seed`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Seed API failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('テストデータを投入しました:', data);
  return data;
}

/**
 * テストデータをクリアする
 *
 * E2Eテスト実行後に、データベースをクリーンな状態に戻します。
 *
 * @param baseURL - アプリケーションのベースURL
 *
 * 注意: 現在は手動でデータベースをクリアする必要があります。
 * 将来的には専用のクリアAPIを実装する予定です。
 */
export async function cleanupTestData(baseURL: string) {
  // TODO: データベースクリア用のAPIを実装する
  console.log('テストデータのクリーンアップをスキップします');
}
