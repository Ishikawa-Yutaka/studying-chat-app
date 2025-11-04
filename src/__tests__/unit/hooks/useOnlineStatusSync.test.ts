/**
 * useOnlineStatusSync フックのユニットテスト
 *
 * テスト対象: src/hooks/useOnlineStatusSync.ts
 *
 * このテストでは、最終オンライン時刻（lastSeen）の
 * 自動同期機能を確認します。
 *
 * テストする機能:
 * - イベントリスナー登録
 * - ページ離脱時のlastSeen更新
 * - タブ切り替え時のlastSeen更新
 * - クリーンアップ処理
 *
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { useOnlineStatusSync } from '@/hooks/useOnlineStatusSync';

// fetchのモック
global.fetch = jest.fn();

// navigator.sendBeaconのモック
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: jest.fn(),
});

describe('useOnlineStatusSync（オンライン状態同期フック）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    (navigator.sendBeacon as jest.Mock).mockReturnValue(true);
  });

  /**
   * 基本動作
   */
  describe('基本動作', () => {
    test('enabled が true の場合、イベントリスナーが登録される', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const docAddEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useOnlineStatusSync({ enabled: true }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
      expect(docAddEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      docAddEventListenerSpy.mockRestore();
    });

    test('enabled が false の場合、イベントリスナーが登録されない', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const docAddEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useOnlineStatusSync({ enabled: false }));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
      expect(docAddEventListenerSpy).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
      docAddEventListenerSpy.mockRestore();
    });
  });

  /**
   * ページ離脱時の処理
   */
  describe('ページ離脱時の処理（beforeunload）', () => {
    test('beforeunload イベント発生時、sendBeacon で lastSeen を更新する', () => {
      renderHook(() => useOnlineStatusSync({ enabled: true }));

      // beforeunload イベントを発火
      window.dispatchEvent(new Event('beforeunload'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        '/api/user/update-online-status',
        expect.any(Blob)
      );
    });

    test('sendBeacon が成功する', () => {
      (navigator.sendBeacon as jest.Mock).mockReturnValue(true);

      renderHook(() => useOnlineStatusSync({ enabled: true }));

      window.dispatchEvent(new Event('beforeunload'));

      expect(navigator.sendBeacon).toHaveBeenCalled();
    });

    test('sendBeacon が利用できない場合、fetch で更新する', async () => {
      // sendBeacon を undefined にする
      Object.defineProperty(navigator, 'sendBeacon', {
        writable: true,
        value: undefined,
      });

      renderHook(() => useOnlineStatusSync({ enabled: true }));

      window.dispatchEvent(new Event('beforeunload'));

      // fetchが呼ばれることを確認（非同期なので少し待つ）
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/update-online-status',
        expect.objectContaining({
          method: 'POST',
          keepalive: true,
        })
      );

      // sendBeacon を元に戻す
      Object.defineProperty(navigator, 'sendBeacon', {
        writable: true,
        value: jest.fn().mockReturnValue(true),
      });
    });
  });

  /**
   * タブ切り替え時の処理
   */
  describe('タブ切り替え時の処理（visibilitychange）', () => {
    test('タブが非表示になった時、sendBeacon で lastSeen を更新する', () => {
      renderHook(() => useOnlineStatusSync({ enabled: true }));

      // タブを非表示にする
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden',
      });

      document.dispatchEvent(new Event('visibilitychange'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        '/api/user/update-online-status',
        expect.any(Blob)
      );
    });

    test('タブが表示された時、何もしない', () => {
      renderHook(() => useOnlineStatusSync({ enabled: true }));

      // タブを表示にする
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });

      jest.clearAllMocks();

      document.dispatchEvent(new Event('visibilitychange'));

      // sendBeacon が呼ばれないことを確認
      expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });

    test('hidden → visible → hidden と切り替えると、2回更新される', () => {
      renderHook(() => useOnlineStatusSync({ enabled: true }));

      // 1回目: hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);

      // 2回目: visible（呼ばれない）
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);

      // 3回目: hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(navigator.sendBeacon).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * クリーンアップ処理
   */
  describe('クリーンアップ処理', () => {
    test('アンマウント時にイベントリスナーが削除される', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const docRemoveEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useOnlineStatusSync({ enabled: true }));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
      expect(docRemoveEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
      docRemoveEventListenerSpy.mockRestore();
    });

    test('アンマウント時に lastSeen を更新する', () => {
      const { unmount } = renderHook(() => useOnlineStatusSync({ enabled: true }));

      jest.clearAllMocks();

      unmount();

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        '/api/user/update-online-status',
        expect.any(Blob)
      );
    });
  });

  /**
   * enabled フラグの動作
   */
  describe('enabled フラグの動作', () => {
    test('enabled が false から true に変わると、イベントリスナーが登録される', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      const { rerender } = renderHook(
        ({ enabled }) => useOnlineStatusSync({ enabled }),
        { initialProps: { enabled: false } }
      );

      expect(addEventListenerSpy).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    test('enabled が true から false に変わると、イベントリスナーが削除される', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { rerender } = renderHook(
        ({ enabled }) => useOnlineStatusSync({ enabled }),
        { initialProps: { enabled: true } }
      );

      rerender({ enabled: false });

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  /**
   * エラーハンドリング
   */
  describe('エラーハンドリング', () => {
    test('fetch がエラーをスローしても、アプリがクラッシュしない', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // sendBeacon を無効化して fetch を使わせる
      Object.defineProperty(navigator, 'sendBeacon', {
        writable: true,
        value: undefined,
      });

      renderHook(() => useOnlineStatusSync({ enabled: true }));

      // エラーがスローされないことを確認
      expect(() => {
        window.dispatchEvent(new Event('beforeunload'));
      }).not.toThrow();

      // sendBeacon を元に戻す
      Object.defineProperty(navigator, 'sendBeacon', {
        writable: true,
        value: jest.fn().mockReturnValue(true),
      });
    });

    test('sendBeacon が false を返しても、エラーにならない', () => {
      (navigator.sendBeacon as jest.Mock).mockReturnValue(false);

      renderHook(() => useOnlineStatusSync({ enabled: true }));

      expect(() => {
        window.dispatchEvent(new Event('beforeunload'));
      }).not.toThrow();
    });
  });

  /**
   * API エンドポイント
   */
  describe('API エンドポイント', () => {
    test('正しい URL にリクエストを送信する', () => {
      renderHook(() => useOnlineStatusSync({ enabled: true }));

      window.dispatchEvent(new Event('beforeunload'));

      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        '/api/user/update-online-status',
        expect.any(Blob)
      );
    });

    test('fetch 使用時、正しいヘッダーが設定される', async () => {
      Object.defineProperty(navigator, 'sendBeacon', {
        writable: true,
        value: undefined,
      });

      renderHook(() => useOnlineStatusSync({ enabled: true }));

      window.dispatchEvent(new Event('beforeunload'));

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/update-online-status',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          keepalive: true,
        })
      );

      Object.defineProperty(navigator, 'sendBeacon', {
        writable: true,
        value: jest.fn().mockReturnValue(true),
      });
    });
  });
});
