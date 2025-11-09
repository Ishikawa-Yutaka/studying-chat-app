/**
 * トップページ（ランディングページ）
 *
 * アプリの紹介と新規登録・ログインへの導線を提供
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, Users, Bot, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function TopPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";

    // View Transition APIが使えるかチェック
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() => {
        setTheme(newTheme);
      });
    } else {
      // フォールバック
      setTheme(newTheme);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6">
          {/* PC表示: 1行、スマホ表示: 2段 */}
          <div className="flex flex-col md:flex-row md:h-16 md:items-center md:justify-between">
            {/* 1段目（スマホ）/ 左側（PC）: ロゴとテーマ切り替え */}
            <div className="flex h-14 md:h-16 items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-2xl">
                <span>Chat App</span>
              </div>
              {mounted && (
                <div className="flex items-center gap-2 md:ml-4">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={handleThemeChange}
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* 2段目（スマホ）/ 右側（PC）: ログイン・新規登録ボタン */}
            <div className="flex items-center gap-3 pb-3 md:pb-0 md:gap-4">
              <Link href="/login" className="flex-1 md:flex-none">
                <Button variant="outline" className="w-full">ログイン</Button>
              </Link>
              <Link href="/signup" className="flex-1 md:flex-none">
                <Button className="w-full">新規登録</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1">
        {/* ヒーローセクション */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Chat App
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Chat App
                    は、チームのコミュニケーションを効率化し、円滑なコミュニケーションを実現するためのアプリです。
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/signup">
                    <Button size="lg" className="gap-1.5">
                      無料で始める
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <img
                  alt="STUDYing Tech Chat Dashboard"
                  className="aspect-video overflow-hidden rounded-xl object-cover object-center"
                  src="https://images.unsplash.com/photo-1600267204091-5c1ab8b10c02?q=80&w=1000&auto=format&fit=crop"
                  width={550}
                  height={310}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 主な機能セクション */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  主な機能
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Chat App が提供する主な機能をご紹介します
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              {/* チャンネル機能 */}
              <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-6 shadow-sm">
                <div className="rounded-full bg-primary p-3 text-primary-foreground">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">チャンネル機能</h3>
                <p className="text-center text-muted-foreground">
                  トピックごとにチャンネルを作成することができます
                </p>
              </div>

              {/* ダイレクトメッセージ */}
              <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-6 shadow-sm">
                <div className="rounded-full bg-primary p-3 text-primary-foreground">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">ダイレクトメッセージ</h3>
                <p className="text-center text-muted-foreground">
                  プライベートなコミュニケーションをすることができます
                </p>
              </div>

              {/* AI機能 */}
              <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-6 shadow-sm">
                <div className="rounded-full bg-primary p-3 text-primary-foreground">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">AI機能</h3>
                <p className="text-center text-muted-foreground">
                  AI チャットボットが提供されており、アプリ内で AI
                  との会話ができます
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4 md:px-6">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; 2025 Chat App. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
