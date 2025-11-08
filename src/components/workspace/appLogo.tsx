/**
 * アプリロゴコンポーネント
 *
 * ワークスペースのサイドバーやヘッダーに表示するロゴ
 */

import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function AppLogo() {
  return (
    <Link href="/workspace" className="flex items-center gap-2 font-semibold">
      <MessageSquare className="h-6 w-6" />
      <span className="text-lg font-bold">Chat App</span>
    </Link>
  );
}
