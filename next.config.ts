import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compiler: {
    // 本番ビルド時にconsole.logを自動削除
    // 開発環境ではデバッグのためconsole.logは残る
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // errorとwarnは残す
    } : false,
  },
};

export default nextConfig;
