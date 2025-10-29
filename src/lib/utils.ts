/**
 * ユーティリティ関数
 * 
 * よく使う便利な機能をまとめたファイル
 * CSSクラス名の結合など
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * CSSクラス名を効率的に結合する関数
 *
 * TailwindCSSのクラス名を重複なく結合し、
 * 条件付きでクラスを適用できる
 *
 * @param inputs クラス名の配列
 * @returns 結合されたクラス名文字列
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 日付を相対的な時間表示に変換する関数
 *
 * 例:
 * - たった今
 * - 5分前
 * - 2時間前
 * - 3日前
 * - 2025/10/29
 *
 * @param date 変換する日付（Dateオブジェクトまたはnull）
 * @returns 相対的な時間表示文字列
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;

  // 無効な日付の場合
  if (isNaN(targetDate.getTime())) return '';

  const diffMs = now.getTime() - targetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // たった今（1分未満）
  if (diffMinutes < 1) {
    return 'たった今';
  }

  // 〜分前（60分未満）
  if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  }

  // 〜時間前（24時間未満）
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }

  // 〜日前（7日未満）
  if (diffDays < 7) {
    return `${diffDays}日前`;
  }

  // 7日以上前は日付を表示
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}