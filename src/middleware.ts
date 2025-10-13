/**
 * Next.js 認証ミドルウェア
 * 
 * 認証が必要なページへのアクセス制御を行う
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Supabase認証ミドルウェアを実行
  return await updateSession(request);
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