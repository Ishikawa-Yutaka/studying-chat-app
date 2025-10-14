/**
 * 認証状態を管理するカスタムフック
 * 
 * Supabase Authとの連携でログイン状態とユーザー情報を管理
 */

'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  const supabase = createClient();

  useEffect(() => {
    let mounted = true; // コンポーネントがマウント状態か確認

    // 初回ユーザー情報取得
    const getInitialUser = async () => {
      try {
        console.log('🔄 認証状態確認開始...');
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mounted) return; // アンマウント済みなら何もしない
        
        if (error) {
          console.error('❌ ユーザー情報取得エラー:', error);
          setAuthState({
            user: null,
            loading: false,
            error: error.message
          });
          return;
        }

        setAuthState({
          user,
          loading: false,
          error: null
        });

        console.log('👤 認証状態確認完了:', user ? `${user.email} (ID: ${user.id})` : 'ログインしていません');
        
      } catch (error) {
        console.error('❌ 認証状態確認エラー:', error);
        if (mounted) {
          setAuthState({
            user: null,
            loading: false,
            error: '認証状態の確認に失敗しました'
          });
        }
      }
    };

    getInitialUser();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔐 認証状態変更:', event, session?.user?.email || 'ログアウト');
        
        setAuthState({
          user: session?.user ?? null,
          loading: false,
          error: null
        });
      }
    );

    // クリーンアップ
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // ログアウト関数
  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      console.log('👋 ログアウト成功');
      
    } catch (error: any) {
      console.error('❌ ログアウトエラー:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    signOut
  };
}