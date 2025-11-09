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
 * キャッシュエントリ（タイムスタンプ付き）
 */
interface CacheEntry {
  user: User;
  timestamp: number; // キャッシュした時刻
  lastAccessed: number; // 最終アクセス時刻（LRU用）
}

/**
 * ユーザー情報のキャッシュストア（Realtime更新対応 + TTL + LRU）
 *
 * 最適化機能:
 * - TTL（Time To Live）: 30分経過したキャッシュは自動削除
 * - LRU（Least Recently Used）: キャッシュサイズが上限を超えたら最も古いものから削除
 * - Realtime更新: ユーザー情報が変更されたら自動的にキャッシュ更新
 */
class UserCache {
  private cache: Map<string, CacheEntry>;
  private fetchPromises: Map<string, Promise<User>>;
  private realtimeChannel: any = null;
  private isInitialized: boolean = false;

  // キャッシュ設定
  private readonly MAX_CACHE_SIZE = 100; // 最大100ユーザーまでキャッシュ
  private readonly TTL = 30 * 60 * 1000; // 30分（ミリ秒）

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

          // キャッシュを更新（Realtime更新時はTTLをリセット）
          const updatedUser = payload.new as any;
          if (updatedUser && updatedUser.id) {
            const cachedUser: User = {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              authId: updatedUser.authId,
              avatarUrl: updatedUser.avatarUrl,
            };

            const now = Date.now();
            this.cache.set(updatedUser.id, {
              user: cachedUser,
              timestamp: now,
              lastAccessed: now,
            });
            console.log('✅ キャッシュを更新（TTLリセット）:', updatedUser.id);
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
   * TTL（Time To Live）チェック:
   * - 30分以上経過したキャッシュは削除して再取得
   *
   * @param userId - ユーザーID（Prismaの内部ID）
   * @returns ユーザー情報
   */
  async get(userId: string): Promise<User> {
    const now = Date.now();

    // キャッシュにあるかチェック
    if (this.cache.has(userId)) {
      const entry = this.cache.get(userId)!;

      // TTLチェック: 30分以上経過していたら削除
      if (now - entry.timestamp > this.TTL) {
        console.log(`⏰ TTL期限切れ（${Math.floor((now - entry.timestamp) / 1000 / 60)}分経過）: ${userId}`);
        this.cache.delete(userId);
      } else {
        // キャッシュヒット: 最終アクセス時刻を更新（LRU用）
        entry.lastAccessed = now;
        console.log(`📦 キャッシュヒット: ${userId}`);
        return entry.user;
      }
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

      // LRUチェック: キャッシュサイズが上限を超えたら最も古いものを削除
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.evictLRU();
      }

      // 新しいエントリをキャッシュに追加
      this.cache.set(userId, {
        user,
        timestamp: now,
        lastAccessed: now,
      });

      return user;
    } finally {
      this.fetchPromises.delete(userId);
    }
  }

  /**
   * LRU（Least Recently Used）アルゴリズム: 最も長くアクセスされていないエントリを削除
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // 最も古い lastAccessed を持つエントリを探す
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    // 最も古いエントリを削除
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ LRU削除（キャッシュサイズ上限）: ${oldestKey}`);
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
   * キャッシュの統計情報を取得（デバッグ用）
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttlMinutes: number;
    entries: Array<{
      userId: string;
      ageMinutes: number;
      lastAccessedMinutes: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([userId, entry]) => ({
      userId,
      ageMinutes: Math.floor((now - entry.timestamp) / 1000 / 60),
      lastAccessedMinutes: Math.floor((now - entry.lastAccessed) / 1000 / 60),
    }));

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttlMinutes: this.TTL / 1000 / 60,
      entries,
    };
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
