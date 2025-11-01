/**
 * メール・パスワード認証のユーティリティ関数
 *
 * 「ツールボックス」の役割：
 * - メールアドレスとパスワードを使ったログイン、ログアウト、サインアップの処理
 * - よく使う認証機能をまとめて、他のファイルから簡単に使えるようにする
 *
 * 注: ソーシャル認証（Google、GitHubなど）は src/lib/social-auth.ts を参照
 */

import { createClient } from './supabase/client';

/**
 * ユーザーサインアップ（新規登録）
 * @param email メールアドレス
 * @param password パスワード
 * @param name ユーザー名
 */
export async function signUp(email: string, password: string, name: string) {
  const supabase = createClient();
  
  // Supabaseでユーザーアカウントを作成
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name, // ユーザー名をメタデータとして保存
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * ユーザーログイン
 * @param email メールアドレス  
 * @param password パスワード
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient();
  
  // メールアドレスとパスワードでログイン
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * ユーザーログアウト
 */
export async function signOut() {
  const supabase = createClient();
  
  // ログイン状態を解除
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 現在ログインしているユーザー情報を取得
 */
export async function getCurrentUser() {
  const supabase = createClient();
  
  // 現在のユーザー情報を取得
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return user;
}

/**
 * ユーザーがログインしているかチェック
 */
export async function isAuthenticated() {
  try {
    const user = await getCurrentUser();
    return !!user; // ユーザーが存在すればtrue、なければfalse
  } catch {
    return false;
  }
}