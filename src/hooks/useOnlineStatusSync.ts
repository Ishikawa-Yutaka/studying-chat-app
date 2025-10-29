/**
 * 最終オンライン時刻を自動同期するカスタムフック
 *
 * 処理の流れ:
 * 1. マウント時: 何もしない（Presenceが自動的にオンラインとして登録）
 * 2. ページ離脱時: lastSeen を現在時刻に更新
 * 3. タブの切り替え時: 非表示→lastSeen更新、表示→何もしない
 *
 * オンライン状態の管理:
 * - Presence: リアルタイムオンライン状態追跡（自動）
 * - Database lastSeen: オフライン時刻を記録（このフックで更新）
 *
 * 使用例:
 * - Workspaceレイアウトで呼び出して、ログイン中常に動作させる
 */

'use client';

import { useEffect } from 'react';

interface UseOnlineStatusSyncOptions {
  /**
   * lastSeen同期を有効にするか
   * 認証されている時のみtrueにする
   */
  enabled: boolean;
}

export function useOnlineStatusSync({ enabled }: UseOnlineStatusSyncOptions) {
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!enabled) {
      console.log('⏸️ lastSeen同期フック: 無効（認証されていません）');
      return;
    }

    console.log('🔄 lastSeen同期フック開始');

    /**
     * lastSeen を現在時刻に更新する関数
     *
     * @param useBeacon - navigator.sendBeacon を使用するか（ページ離脱時に必要）
     */
    const updateLastSeen = async (useBeacon: boolean = false) => {
      try {
        const url = '/api/user/update-online-status';

        if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
          // ページ離脱時は sendBeacon を使用（より確実にリクエストが完了する）
          const blob = new Blob([], { type: 'application/json' });
          const success = navigator.sendBeacon(url, blob);
          console.log(`${success ? '✅' : '⚠️'} sendBeacon で lastSeen 更新`);
        } else {
          // 通常時は fetch を使用
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            keepalive: true, // フォールバック用
          });
          console.log(`✅ fetch で lastSeen 更新`);
        }
      } catch (error) {
        console.error('❌ lastSeen 更新エラー:', error);
      }
    };

    // マウント時は何もしない（Presenceが自動的にオンラインとして登録）

    /**
     * ページ離脱時の処理（beforeunload）
     *
     * ユーザーがタブを閉じる、別のページに移動する、ブラウザを閉じる時に発火
     * 注意: 非同期処理が完了しない可能性があるため、sendBeaconを使用
     */
    const handleBeforeUnload = () => {
      console.log('🔄 ページ離脱検知 - lastSeen 更新');
      updateLastSeen(true);
    };

    /**
     * タブの表示/非表示切り替え時の処理（visibilitychange）
     *
     * ユーザーが別のタブに移動したり、戻ってきたりした時に発火
     * - hidden → lastSeen 更新
     * - visible → 何もしない（Presenceが自動的にオンラインに）
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ タブが非表示 - lastSeen 更新');
        updateLastSeen(true);
      }
      // タブが表示された時は何もしない（Presenceが自動的にオンラインとして登録）
    };

    // イベントリスナー登録
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // クリーンアップ: コンポーネントアンマウント時
    return () => {
      console.log('🔄 lastSeen同期フック終了 - lastSeen 更新');
      // アンマウント時も lastSeen を更新
      updateLastSeen(true);

      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]); // enabledが変わった時に再実行
}
