/**
 * useRealtimeDashboard フックのユニットテスト
 *
 * テスト対象: src/hooks/useRealtimeDashboard.ts
 *
 * このテストでは、ダッシュボード統計情報の
 * リアルタイム更新機能を確認します。
 *
 * テストする機能:
 * - 初期データの設定
 * - Realtime サブスクリプション
 * - データベース変更の監視
 * - ダッシュボードデータの自動更新
 * - クリーンアップ処理
 *
 * @jest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { createClient } from '@/lib/supabase/client';

// モック設定
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// fetchのモック
global.fetch = jest.fn();

describe('useRealtimeDashboard（ダッシュボードリアルタイム更新フック）', () => {
  // テスト用データ
  const mockInitialStats = {
    channelCount: 3,
    dmPartnerCount: 2,
    totalUserCount: 10,
  };

  const mockInitialChannels = [
    { id: 'channel-1', name: 'general', description: 'General chat', memberCount: 5 },
    { id: 'channel-2', name: 'random', description: 'Random chat', memberCount: 3 },
  ];

  const mockInitialDirectMessages = [
    {
      id: 'dm-1',
      partnerId: 'user-456',
      partnerName: 'Alice',
      partnerEmail: 'alice@example.com',
    },
  ];

  const mockCurrentUserId = 'user-123';

  // モックチャンネル
  let mockChannel: any;
  let mockOn: jest.Mock;
  let mockSubscribe: jest.Mock;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Realtimeチャンネルのモック
    mockOn = jest.fn().mockReturnThis();
    mockSubscribe = jest.fn().mockReturnThis();

    mockChannel = {
      on: mockOn,
      subscribe: mockSubscribe,
    };

    // Supabaseクライアントのモック
    mockSupabase = {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    // fetchのモック（デフォルトは成功レスポンス）
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        stats: {
          channelCount: 4,
          dmPartnerCount: 3,
          totalUserCount: 12,
        },
        channels: [
          ...mockInitialChannels,
          { id: 'channel-3', name: 'dev', description: 'Dev chat', memberCount: 4 },
        ],
        directMessages: [
          ...mockInitialDirectMessages,
          {
            id: 'dm-2',
            partnerId: 'user-789',
            partnerName: 'Bob',
            partnerEmail: 'bob@example.com',
          },
        ],
      }),
    });
  });

  /**
   * 基本動作
   */
  describe('基本動作', () => {
    test('初期状態で統計情報が正しく設定される', () => {
      const { result } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(result.current.stats).toEqual(mockInitialStats);
    });

    test('初期状態でチャンネル一覧が正しく設定される', () => {
      const { result } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(result.current.channels).toEqual(mockInitialChannels);
    });

    test('初期状態でDM一覧が正しく設定される', () => {
      const { result } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(result.current.directMessages).toEqual(mockInitialDirectMessages);
    });

    test('refreshDashboardData関数が提供される', () => {
      const { result } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(typeof result.current.refreshDashboardData).toBe('function');
    });
  });

  /**
   * Realtime サブスクリプション
   */
  describe('Realtime サブスクリプション', () => {
    test('4つのRealtimeチャンネルが作成される', () => {
      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(mockSupabase.channel).toHaveBeenCalledWith('dashboard_messages');
      expect(mockSupabase.channel).toHaveBeenCalledWith('dashboard_channels');
      expect(mockSupabase.channel).toHaveBeenCalledWith('dashboard_users');
      expect(mockSupabase.channel).toHaveBeenCalledWith('dashboard_members');
    });

    test('Messageテーブルの INSERT イベントを監視する', () => {
      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
        },
        expect.any(Function)
      );
    });

    test('Channelテーブルの全イベント（*）を監視する', () => {
      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Channel',
        },
        expect.any(Function)
      );
    });

    test('Userテーブルの全イベント（*）を監視する', () => {
      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'User',
        },
        expect.any(Function)
      );
    });

    test('ChannelMemberテーブルの全イベント（*）を監視する', () => {
      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ChannelMember',
        },
        expect.any(Function)
      );
    });

    test('各チャンネルが subscribe される', () => {
      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      // 4つのチャンネル × 1回 subscribe = 4回
      expect(mockSubscribe).toHaveBeenCalledTimes(4);
    });
  });

  /**
   * データ更新処理
   */
  describe('データ更新処理', () => {
    test('refreshDashboardData を呼ぶとAPIからデータを取得する', async () => {
      const { result } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      await result.current.refreshDashboardData();

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/dashboard?userId=${mockCurrentUserId}`
      );
    });

    test('refreshDashboardData 成功時、fetchが正しいデータで呼ばれる', async () => {
      const { result } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      await act(async () => {
        await result.current.refreshDashboardData();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/dashboard?userId=${mockCurrentUserId}`
      );
    });

    test('API エラー時、データは更新されない', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: false }),
      });

      const { result } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      const beforeStats = { ...result.current.stats };
      await result.current.refreshDashboardData();

      // データが変わっていないことを確認
      expect(result.current.stats).toEqual(beforeStats);
    });

    test('fetch がエラーをスローしても、アプリがクラッシュしない', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      // エラーがスローされないことを確認
      await expect(
        result.current.refreshDashboardData()
      ).resolves.not.toThrow();
    });
  });

  /**
   * Realtime イベントハンドラー
   */
  describe('Realtime イベントハンドラー', () => {
    test('Message INSERT イベント発生時、ダッシュボードデータが更新される', async () => {
      let messageInsertCallback: (payload: any) => void;

      mockOn.mockImplementation((event, opts, callback) => {
        if (opts.table === 'Message' && opts.event === 'INSERT') {
          messageInsertCallback = callback;
        }
        return mockChannel;
      });

      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      // Message INSERT イベントを発火
      await messageInsertCallback!({ new: { id: 'msg-1' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/dashboard?userId=${mockCurrentUserId}`
        );
      });
    });

    test('Channel 変更イベント発生時、ダッシュボードデータが更新される', async () => {
      let channelChangeCallback: (payload: any) => void;

      mockOn.mockImplementation((event, opts, callback) => {
        if (opts.table === 'Channel') {
          channelChangeCallback = callback;
        }
        return mockChannel;
      });

      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      // Channel 変更イベントを発火
      await channelChangeCallback!({ new: { id: 'channel-3' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/dashboard?userId=${mockCurrentUserId}`
        );
      });
    });

    test('User 変更イベント発生時、ダッシュボードデータが更新される', async () => {
      let userChangeCallback: (payload: any) => void;

      mockOn.mockImplementation((event, opts, callback) => {
        if (opts.table === 'User') {
          userChangeCallback = callback;
        }
        return mockChannel;
      });

      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      // User 変更イベントを発火
      await userChangeCallback!({ new: { id: 'user-new' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/dashboard?userId=${mockCurrentUserId}`
        );
      });
    });

    test('ChannelMember 変更イベント発生時、ダッシュボードデータが更新される', async () => {
      let memberChangeCallback: (payload: any) => void;

      mockOn.mockImplementation((event, opts, callback) => {
        if (opts.table === 'ChannelMember') {
          memberChangeCallback = callback;
        }
        return mockChannel;
      });

      renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      // ChannelMember 変更イベントを発火
      await memberChangeCallback!({ new: { id: 'member-1' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/dashboard?userId=${mockCurrentUserId}`
        );
      });
    });
  });

  /**
   * クリーンアップ
   */
  describe('クリーンアップ', () => {
    test('アンマウント時に全てのチャンネルが削除される', () => {
      const { unmount } = renderHook(() =>
        useRealtimeDashboard({
          initialStats: mockInitialStats,
          initialChannels: mockInitialChannels,
          initialDirectMessages: mockInitialDirectMessages,
          currentUserId: mockCurrentUserId,
        })
      );

      unmount();

      // 4つのチャンネルが全て削除される
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(4);
    });
  });

  /**
   * 初期データ変更時の動作
   */
  describe('初期データ変更時の動作', () => {
    test('initialStats が変更されたら、stats が更新される', () => {
      const { result, rerender } = renderHook(
        ({ initialStats }) =>
          useRealtimeDashboard({
            initialStats,
            initialChannels: mockInitialChannels,
            initialDirectMessages: mockInitialDirectMessages,
            currentUserId: mockCurrentUserId,
          }),
        { initialProps: { initialStats: mockInitialStats } }
      );

      // 初期値を確認
      expect(result.current.stats.channelCount).toBe(3);

      // 新しい初期データでリレンダー
      const newStats = { channelCount: 5, dmPartnerCount: 4, totalUserCount: 15 };
      rerender({ initialStats: newStats });

      // 更新されることを確認
      expect(result.current.stats.channelCount).toBe(5);
    });

    test('initialChannels が変更されたら、channels が更新される', () => {
      const { result, rerender } = renderHook(
        ({ initialChannels }) =>
          useRealtimeDashboard({
            initialStats: mockInitialStats,
            initialChannels,
            initialDirectMessages: mockInitialDirectMessages,
            currentUserId: mockCurrentUserId,
          }),
        { initialProps: { initialChannels: mockInitialChannels } }
      );

      expect(result.current.channels.length).toBe(2);

      const newChannels = [
        ...mockInitialChannels,
        { id: 'channel-3', name: 'new-channel', memberCount: 2 },
      ];
      rerender({ initialChannels: newChannels });

      expect(result.current.channels.length).toBe(3);
    });
  });
});
