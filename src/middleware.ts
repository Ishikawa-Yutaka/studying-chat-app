/**
 * Next.js ミドルウェア
 * 
 * 「入口の警備員」の役割：
 * - すべてのページアクセス前に実行される
 * - ログイン状態をチェックし、必要に応じてリダイレクト
 * - セッション情報を最新の状態に保つ
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Supabaseのセッション管理を実行
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