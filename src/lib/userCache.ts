/**
 * ユーザー情報キャッシュ（Realtime更新対応）
 *
 * リアルタイムメッセージ受信時に、同じユーザー情報を何度もAPIで取得するのを防ぎます。
 * Supabase Realtimeでユーザー情報の変更を監視し、キャッシュを自動更新します。
 *
 * 使い方:
 * ```typescript
 * import { userCache } from '@/lib/userCache';
 *
 * // 初期化（アプリ起動時に1回だけ）
 * userCache.initialize();
 *
 * // ユーザー情報取得
 * const user = await userCache.get(senderId);
 *
 * // ログアウト時
 * userCache.cleanup();
 * ```
 */

import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  name: string;
  email?: string;
  authId?: string;
  avatarUrl?: string | null;
}

/**
 * ユーザー情報のキャッシュストア（Realtime更新対応）
 */
class UserCache {
  private cache: Map<string, User>;
  private fetchPromises: Map<string, Promise<User>>;
  private realtimeChannel: any = null;
  private isInitialized: boolean = false;

  constructor() {
    this.cache = new Map();
    this.fetchPromises = new Map();
  }

  /**
   * Realtime監視を開始
   * ユーザー情報の変更を検知してキャッシュを更新
   */
  initialize() {
    if (this.isInitialized) {
      console.log('⚠️ ユーザーキャッシュは既に初期化されています');
      return;
    }

    const supabase = createClient();

    // Userテーブルの変更を監視
    this.realtimeChannel = supabase
      .channel('user-cache-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'User'
        },
        (payload) => {
          console.log('🔄 ユーザー情報が更新されました:', payload);

          // キャッシュを更新
          const updatedUser = payload.new as any;
          if (updatedUser && updatedUser.id) {
            const cachedUser: User = {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              authId: updatedUser.authId,
              avatarUrl: updatedUser.avatarUrl,
            };

            this.cache.set(updatedUser.id, cachedUser);
            console.log('✅ キャッシュを更新:', updatedUser.id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ ユーザーキャッシュのRealtime監視を開始しました');
        }
      });

    this.isInitialized = true;
  }

  /**
   * ユーザー情報を取得（キャッシュがあればそれを返す）
   *
   * @param userId - ユーザーID（Prismaの内部ID）
   * @returns ユーザー情報
   */
  async get(userId: string): Promise<User> {
    // キャッシュにあればそれを返す
    if (this.cache.has(userId)) {
      console.log(`📦 キャッシュヒット: ${userId}`);
      return this.cache.get(userId)!;
    }

    // 既に同じユーザーのフェッチ中なら、その Promise を返す（重複リクエスト防止）
    if (this.fetchPromises.has(userId)) {
      console.log(`⏳ フェッチ待機中: ${userId}`);
      return this.fetchPromises.get(userId)!;
    }

    // API から取得
    console.log(`🌐 API呼び出し: ${userId}`);
    const fetchPromise = this.fetchFromApi(userId);
    this.fetchPromises.set(userId, fetchPromise);

    try {
      const user = await fetchPromise;
      this.cache.set(userId, user);
      return user;
    } finally {
      this.fetchPromises.delete(userId);
    }
  }

  /**
   * API からユーザー情報を取得
   */
  private async fetchFromApi(userId: string): Promise<User> {
    try {
      const response = await fetch(`/api/user/${userId}`);
      const data = await response.json();

      if (data.success && data.user) {
        return data.user;
      }

      // ユーザーが見つからない場合のデフォルト値
      return this.getDefaultUser(userId);
    } catch (error) {
      console.error('❌ ユーザー情報取得エラー:', error);
      return this.getDefaultUser(userId);
    }
  }

  /**
   * デフォルトユーザー情報（削除済みユーザー用）
   */
  private getDefaultUser(userId: string): User {
    return {
      id: userId,
      name: '削除済みユーザー',
      email: undefined,
      authId: undefined,
      avatarUrl: null,
    };
  }

  /**
   * キャッシュをクリアしてRealtime監視を停止（ログアウト時などに使用）
   */
  cleanup(): void {
    this.cache.clear();
    this.fetchPromises.clear();

    if (this.realtimeChannel) {
      const supabase = createClient();
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      console.log('🗑️ ユーザーキャッシュをクリアし、Realtime監視を停止しました');
    }

    this.isInitialized = false;
  }

  /**
   * 特定のユーザーをキャッシュから削除
   */
  remove(userId: string): void {
    this.cache.delete(userId);
    console.log(`🗑️ ユーザーキャッシュを削除: ${userId}`);
  }

  /**
   * キャッシュサイズを取得
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 初期化状態を取得
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// シングルトンインスタンス（アプリ全体で1つだけ）
export const userCache = new UserCache();
