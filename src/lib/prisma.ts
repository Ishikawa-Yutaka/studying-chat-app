/**
 * Prismaクライアントの設定
 * 
 * データベースへの接続とクエリ実行を管理します
 * 開発環境でのホットリロード時にコネクションが重複しないよう
 * グローバル変数を使用しています
 */

import { PrismaClient } from '@prisma/client';

// グローバル変数の型定義（開発環境用）
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prismaクライアントのインスタンスを作成
// 開発環境では既存のインスタンスを再利用し、本番環境では新しく作成
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 本番環境ではエラーのみログ出力（パフォーマンス改善）
    // 開発環境では全てのクエリをログ出力（デバッグ用）
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });

// 開発環境でのみグローバル変数に保存
// 本番環境ではNext.jsのホットリロードがないため不要
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;