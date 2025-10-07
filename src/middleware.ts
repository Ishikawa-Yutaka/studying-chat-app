/**
 * Next.js ミドルウェア (一時的に無効化)
 * 
 * デバッグ用：ミドルウェアを無効化してサーバー起動問題を調査
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 一時的にミドルウェアを無効化
  // 単純にリクエストをそのまま通す
  return NextResponse.next();
}

// このミドルウェアが実行されるパスを指定
export const config = {
  matcher: [
    /*
     * 以下のパス以外のすべてのリクエストにマッチ:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - 拡張子付きのファイル (.png, .jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};