/**
 * 認証ミドルウェア設定
 * 
 * 「警備員」の役割：
 * - ユーザーがページにアクセスする前にログイン状態をチェック
 * - ログインが必要なページには認証済みユーザーのみアクセス許可
 * - ログイン状態を最新に保つ
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // リクエストからクッキーを取得
        getAll() {
          return request.cookies.getAll();
        },
        // レスポンスにクッキーを設定
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ログイン状態を確認し、認証情報を更新
  // これにより、ユーザーのセッションが最新の状態に保たれる
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ログインが必要なページ（/workspace配下）へのアクセス制御
  if (request.nextUrl.pathname.startsWith('/workspace') && !user) {
    // ログインしていない場合はログインページにリダイレクト
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}