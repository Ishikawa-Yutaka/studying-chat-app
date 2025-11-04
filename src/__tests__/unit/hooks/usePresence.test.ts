/**
 * usePresence フックのユニットテスト
 *
 * テスト対象: src/hooks/usePresence.ts
 *
 * このテストでは、Supabase Presence を使った
 * オンライン状態管理機能を確認します。
 *
 * テストする機能:
 * - Presenceチャンネル接続
 * - オンラインユーザー一覧取得
 * - ユーザーのオンライン/オフライン検知
 * - チャンネルクリーンアップ
 *
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePresence } from '@/hooks/usePresence';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// モック設定
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('usePresence（オンライン状態管理フック）', () => {
  // モックチャンネル
  let mockChannel: Partial<RealtimeChannel>;
  let mockOn: jest.Mock;
  let mockSubscribe: jest.Mock;
  let mockTrack: jest.Mock;
  let mockUnsubscribe: jest.Mock;
  let mockPresenceState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Presenceチャンネルのモック
    mockOn = jest.fn().mockReturnThis();
    mockSubscribe = jest.fn();
    mockTrack = jest.fn().mockResolvedValue({});
    mockUnsubscribe = jest.fn();
    mockPresenceState = jest.fn().mockReturnValue({});

    mockChannel = {
      on: mockOn,
      subscribe: mockSubscribe,
      track: mockTrack,
      unsubscribe: mockUnsubscribe,
      presenceState: mockPresenceState,
    };

    // Supabaseクライアントのモック
    const mockSupabase = {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    };

    mockCreateClient.mockReturnValue(mockSupabase as any);
  });

  /**
   * 基本動作
   */
  describe('基本動作', () => {
    test('初期状態でonlineUsersは空配列', () => {
      const { result } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      expect(result.current.onlineUsers).toEqual([]);
    });

    test('isUserOnline関数が提供される', () => {
      const { result } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      expect(typeof result.current.isUserOnline).toBe('function');
    });

    test('userIdがnullの場合、Presenceチャンネルに接続しない', () => {
      const mockSupabase = mockCreateClient();

      renderHook(() => usePresence({ userId: null, enabled: true }));

      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    test('enabledがfalseの場合、Presenceチャンネルに接続しない', () => {
      const mockSupabase = mockCreateClient();

      renderHook(() => usePresence({ userId: 'user-123', enabled: false }));

      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });
  });

  /**
   * Presenceチャンネル接続
   */
  describe('Presenceチャンネル接続', () => {
    test('正しいチャンネル名でPresenceチャンネルを作成する', () => {
      const mockSupabase = mockCreateClient();

      renderHook(() => usePresence({ userId: 'user-123', enabled: true }));

      expect(mockSupabase.channel).toHaveBeenCalledWith('online-users', {
        config: {
          presence: {
            key: 'user-123',
          },
        },
      });
    });

    test('presence sync イベントリスナーが登録される', () => {
      renderHook(() => usePresence({ userId: 'user-123', enabled: true }));

      expect(mockOn).toHaveBeenCalledWith(
        'presence',
        { event: 'sync' },
        expect.any(Function)
      );
    });

    test('presence join イベントリスナーが登録される', () => {
      renderHook(() => usePresence({ userId: 'user-123', enabled: true }));

      expect(mockOn).toHaveBeenCalledWith(
        'presence',
        { event: 'join' },
        expect.any(Function)
      );
    });

    test('presence leave イベントリスナーが登録される', () => {
      renderHook(() => usePresence({ userId: 'user-123', enabled: true }));

      expect(mockOn).toHaveBeenCalledWith(
        'presence',
        { event: 'leave' },
        expect.any(Function)
      );
    });

    test('チャンネルにsubscribeする', () => {
      renderHook(() => usePresence({ userId: 'user-123', enabled: true }));

      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  /**
   * オンライン状態のトラッキング
   */
  describe('オンライン状態のトラッキング', () => {
    test('SUBSCRIBED状態になったら、自分の状態をtrackする', async () => {
      // subscribeコールバックを即座に実行
      mockSubscribe.mockImplementation((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
      });

      renderHook(() => usePresence({ userId: 'user-123', enabled: true }));

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith({
          user_id: 'user-123',
          online_at: expect.any(String),
        });
      });
    });

    test('trackで送信されるonline_atは正しいISO形式の日時', async () => {
      mockSubscribe.mockImplementation((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
      });

      renderHook(() => usePresence({ userId: 'user-123', enabled: true }));

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalled();
      });

      const trackCall = mockTrack.mock.calls[0][0];
      const onlineAt = trackCall.online_at;

      // ISO 8601形式の日時文字列かチェック
      expect(new Date(onlineAt).toISOString()).toBe(onlineAt);
    });
  });

  /**
   * オンラインユーザー一覧の更新
   */
  describe('オンラインユーザー一覧の更新', () => {
    test('sync イベントでオンラインユーザー一覧が更新される', async () => {
      let syncCallback: () => void;

      mockOn.mockImplementation((event: string, opts: any, callback: any) => {
        if (event === 'presence' && opts.event === 'sync') {
          syncCallback = callback;
        }
        return mockChannel;
      });

      mockPresenceState.mockReturnValue({
        'user-123': [{ user_id: 'user-123', online_at: '2025-01-01T00:00:00Z' }],
        'user-456': [{ user_id: 'user-456', online_at: '2025-01-01T00:00:00Z' }],
      });

      const { result } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      // sync イベントを発火
      await waitFor(() => {
        syncCallback!();
      });

      await waitFor(() => {
        expect(result.current.onlineUsers).toContain('user-123');
        expect(result.current.onlineUsers).toContain('user-456');
      });
    });

    test('重複するユーザーIDは除去される', async () => {
      let syncCallback: () => void;

      mockOn.mockImplementation((event: string, opts: any, callback: any) => {
        if (event === 'presence' && opts.event === 'sync') {
          syncCallback = callback;
        }
        return mockChannel;
      });

      // 同じユーザーが複数のPresenceを持っている場合
      mockPresenceState.mockReturnValue({
        'user-123-session-1': [{ user_id: 'user-123', online_at: '2025-01-01T00:00:00Z' }],
        'user-123-session-2': [{ user_id: 'user-123', online_at: '2025-01-01T00:01:00Z' }],
      });

      const { result } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      await waitFor(() => {
        syncCallback!();
      });

      await waitFor(() => {
        expect(result.current.onlineUsers).toEqual(['user-123']);
      });
    });

    test('Presenceステートが空の場合、onlineUsersは空配列', async () => {
      let syncCallback: () => void;

      mockOn.mockImplementation((event: string, opts: any, callback: any) => {
        if (event === 'presence' && opts.event === 'sync') {
          syncCallback = callback;
        }
        return mockChannel;
      });

      mockPresenceState.mockReturnValue({});

      const { result } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      await waitFor(() => {
        syncCallback!();
      });

      await waitFor(() => {
        expect(result.current.onlineUsers).toEqual([]);
      });
    });
  });

  /**
   * isUserOnline関数
   */
  describe('isUserOnline関数', () => {
    test('オンラインユーザーに対してtrueを返す', async () => {
      let syncCallback: () => void;

      mockOn.mockImplementation((event: string, opts: any, callback: any) => {
        if (event === 'presence' && opts.event === 'sync') {
          syncCallback = callback;
        }
        return mockChannel;
      });

      mockPresenceState.mockReturnValue({
        'user-online': [{ user_id: 'user-online', online_at: '2025-01-01T00:00:00Z' }],
      });

      const { result } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      await waitFor(() => {
        syncCallback!();
      });

      await waitFor(() => {
        expect(result.current.isUserOnline('user-online')).toBe(true);
      });
    });

    test('オフラインユーザーに対してfalseを返す', async () => {
      let syncCallback: () => void;

      mockOn.mockImplementation((event: string, opts: any, callback: any) => {
        if (event === 'presence' && opts.event === 'sync') {
          syncCallback = callback;
        }
        return mockChannel;
      });

      mockPresenceState.mockReturnValue({
        'user-online': [{ user_id: 'user-online', online_at: '2025-01-01T00:00:00Z' }],
      });

      const { result } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      await waitFor(() => {
        syncCallback!();
      });

      await waitFor(() => {
        expect(result.current.isUserOnline('user-offline')).toBe(false);
      });
    });

    test('onlineUsersが空の場合、常にfalseを返す', () => {
      const { result } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      expect(result.current.isUserOnline('any-user')).toBe(false);
    });
  });

  /**
   * クリーンアップ
   */
  describe('クリーンアップ', () => {
    test('アンマウント時にチャンネルをunsubscribeする', () => {
      const { unmount } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    test('アンマウント時にチャンネルを削除する', () => {
      const mockSupabase = mockCreateClient();

      const { unmount } = renderHook(() =>
        usePresence({ userId: 'user-123', enabled: true })
      );

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    test('userIdが変更されたら、古いチャンネルをクリーンアップして新しいチャンネルを作成', () => {
      const mockSupabase = mockCreateClient();

      const { rerender } = renderHook(
        ({ userId }) => usePresence({ userId, enabled: true }),
        { initialProps: { userId: 'user-123' } }
      );

      // userIdを変更
      rerender({ userId: 'user-456' });

      // 古いチャンネルがクリーンアップされる
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSupabase.removeChannel).toHaveBeenCalled();

      // 新しいチャンネルが作成される
      expect(mockSupabase.channel).toHaveBeenCalledWith('online-users', {
        config: {
          presence: {
            key: 'user-456',
          },
        },
      });
    });
  });

  /**
   * enabled フラグの動作
   */
  describe('enabled フラグ', () => {
    test('enabledがtrueからfalseに変わったら、チャンネルをクリーンアップ', () => {
      const mockSupabase = mockCreateClient();

      const { rerender } = renderHook(
        ({ enabled }) => usePresence({ userId: 'user-123', enabled }),
        { initialProps: { enabled: true } }
      );

      // enabledをfalseに変更
      rerender({ enabled: false });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });

    test('enabledがfalseからtrueに変わったら、チャンネルを作成', () => {
      const mockSupabase = mockCreateClient();

      const { rerender } = renderHook(
        ({ enabled }) => usePresence({ userId: 'user-123', enabled }),
        { initialProps: { enabled: false } }
      );

      // 最初はチャンネルが作成されない
      expect(mockSupabase.channel).not.toHaveBeenCalled();

      // enabledをtrueに変更
      rerender({ enabled: true });

      // チャンネルが作成される
      expect(mockSupabase.channel).toHaveBeenCalledWith('online-users', {
        config: {
          presence: {
            key: 'user-123',
          },
        },
      });
    });
  });
});
