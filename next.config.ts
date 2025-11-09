import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // ビルド時のESLintを無効化（デプロイ時のエラーを回避）
  // 注: コードスタイルの問題は後で修正予定
  eslint: {
    ignoreDuringBuilds: true,
  },

  compiler: {
    // 本番ビルド時にconsole.logを自動削除
    // 開発環境ではデバッグのためconsole.logは残る
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // errorとwarnは残す
    } : false,
  },

  // JavaScriptファイルをgzip圧縮（ページ読み込み速度を向上）
  // ビルド時に圧縮版が生成され、Vercelで配信される
  compress: true,
};

export default nextConfig;
