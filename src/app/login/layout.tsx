/**
 * ログインページ専用のレイアウト
 *
 * このファイルは、ログインページのmetadata（タイトルなど）を設定するために作成されました。
 * E2Eテストで「ログイン」というタイトルを期待しているため、ここで上書きします。
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン - チャットアプリ",
  description: "チャットアプリへのログインページ",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
