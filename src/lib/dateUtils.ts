/**
 * 日付・時刻関連のユーティリティ関数
 */

/**
 * メッセージの日時を表示用にフォーマット
 *
 * ルール:
 * - 今日のメッセージ: 時刻のみ（例: 10:20）
 * - それ以前のメッセージ: 日付のみ（例: 2025/01/05）
 *
 * @param createdAt - メッセージの作成日時（Date型またはISO文字列）
 * @returns フォーマットされた日時文字列
 */
export function formatMessageTime(createdAt: Date | string): string {
  // Date型に変換
  const messageDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;

  // 無効な日付の場合は空文字を返す
  if (!(messageDate instanceof Date) || isNaN(messageDate.getTime())) {
    return '';
  }

  const now = new Date();
  // 今日の0時0分0秒を取得
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 今日のメッセージかどうか判定
  if (messageDate >= todayStart) {
    // 今日のメッセージ: 時刻のみ（秒なし）
    return messageDate.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    // それ以前: 日付のみ
    return messageDate.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}
