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