/**
 * E2Eテスト用Seedヘルパー
 *
 * 目的: テスト実行前にデータベースにテストデータを投入する
 *
 * 使用方法:
 * ```typescript
 * test.beforeAll(async () => {
 *   await seedTestData();
 * });
 * ```
 */

/**
 * Seed APIを呼び出してテストデータを投入する
 *
 * 処理の流れ:
 * 1. /api/seed エンドポイントにPOSTリクエストを送信
 * 2. テストユーザー、チャンネル、メッセージを一括作成
 * 3. 成功したらログ出力、失敗したらエラーをスロー
 *
 * @throws {Error} Seed APIの呼び出しに失敗した場合
 */
export async function seedTestData() {
  console.log('🌱 テストデータを投入中...');

  try {
    const response = await fetch('http://localhost:3000/api/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Seed API failed: ${errorData.error || 'Unknown error'}`
      );
    }

    const data = await response.json();
    console.log('✅ テストデータの投入が完了しました:', {
      ユーザー数: data.data.totalUserCount,
      チャンネル数: data.data.channelCount,
      メッセージ数: data.data.messageCount,
    });

    return data;
  } catch (error) {
    console.error('❌ テストデータの投入に失敗しました:', error);
    throw error;
  }
}
