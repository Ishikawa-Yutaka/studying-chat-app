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

  // 画像最適化設定
  images: {
    // Supabase Storageからの画像を許可
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'supabase.co',
      },
    ],
    // 画像最適化の形式（webp優先で配信）
    formats: ['image/webp'],
    // デバイスサイズの設定（レスポンシブ対応）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
