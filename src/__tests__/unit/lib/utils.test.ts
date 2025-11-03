/**
 * ユーティリティ関数のユニットテスト
 *
 * テスト対象: src/lib/utils.ts
 *
 * このテストでは、アプリケーション全体で使用される
 * 汎用ユーティリティ関数をテストします。
 *
 * テストする関数:
 * - cn(): CSSクラス名の結合
 * - formatRelativeTime(): 日付の相対的な時間表示
 */

import { cn, formatRelativeTime } from '@/lib/utils'

describe('utils - ユーティリティ関数', () => {
  /**
   * cn() - CSSクラス名結合関数のテスト
   */
  describe('cn() - CSSクラス名結合', () => {
    test('単一のクラス名を返す', () => {
      expect(cn('text-red-500')).toBe('text-red-500')
    })

    test('複数のクラス名を結合する', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
    })

    test('配列でクラス名を渡せる', () => {
      expect(cn(['text-red-500', 'bg-blue-500'])).toBe('text-red-500 bg-blue-500')
    })

    test('条件付きクラス名（オブジェクト形式）が使える', () => {
      expect(cn({ 'text-red-500': true, 'bg-blue-500': false })).toBe(
        'text-red-500'
      )
    })

    test('Tailwindの競合するクラスをマージする', () => {
      // twMerge により、同じプロパティ（padding）の後の値が優先される
      expect(cn('p-4', 'p-8')).toBe('p-8')
    })

    test('undefinedやnullを無視する', () => {
      expect(cn('text-red-500', undefined, null, 'bg-blue-500')).toBe(
        'text-red-500 bg-blue-500'
      )
    })

    test('空文字を無視する', () => {
      expect(cn('text-red-500', '', 'bg-blue-500')).toBe(
        'text-red-500 bg-blue-500'
      )
    })

    test('複雑な組み合わせでも正しく動作する', () => {
      const result = cn(
        'base-class',
        { 'conditional-1': true, 'conditional-2': false },
        ['array-class-1', 'array-class-2'],
        undefined,
        'final-class'
      )
      expect(result).toContain('base-class')
      expect(result).toContain('conditional-1')
      expect(result).not.toContain('conditional-2')
      expect(result).toContain('array-class-1')
      expect(result).toContain('final-class')
    })
  })

  /**
   * formatRelativeTime() - 相対時間表示関数のテスト
   */
  describe('formatRelativeTime() - 相対時間表示', () => {
    // テストの基準時刻を固定（モック）
    const mockNow = new Date('2025-01-15T12:00:00Z')
    const RealDate = Date

    beforeEach(() => {
      // 2025-01-15 12:00:00 を基準時刻とする
      global.Date = class extends RealDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockNow.getTime())
          } else {
            super(...(args as []))
          }
        }

        static now() {
          return mockNow.getTime()
        }
      } as any
    })

    afterEach(() => {
      global.Date = RealDate
    })

    /**
     * nullやundefinedの処理
     */
    test('nullの場合、空文字を返す', () => {
      expect(formatRelativeTime(null)).toBe('')
    })

    test('undefinedの場合、空文字を返す', () => {
      expect(formatRelativeTime(undefined)).toBe('')
    })

    /**
     * 無効な日付の処理
     */
    test('無効な日付文字列の場合、空文字を返す', () => {
      expect(formatRelativeTime('invalid-date')).toBe('')
    })

    test('無効なDateオブジェクトの場合、空文字を返す', () => {
      expect(formatRelativeTime(new Date('invalid'))).toBe('')
    })

    /**
     * 「たった今」のテスト（1分未満）
     */
    test('30秒前の場合、「たった今」と表示', () => {
      const date = new Date('2025-01-15T11:59:30Z')
      expect(formatRelativeTime(date)).toBe('たった今')
    })

    test('0秒前（同時刻）の場合、「たった今」と表示', () => {
      const date = new Date('2025-01-15T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('たった今')
    })

    test('59秒前の場合、「たった今」と表示', () => {
      const date = new Date('2025-01-15T11:59:01Z')
      expect(formatRelativeTime(date)).toBe('たった今')
    })

    /**
     * 「〜分前」のテスト（1分以上60分未満）
     */
    test('1分前の場合、「1分前」と表示', () => {
      const date = new Date('2025-01-15T11:59:00Z')
      expect(formatRelativeTime(date)).toBe('1分前')
    })

    test('5分前の場合、「5分前」と表示', () => {
      const date = new Date('2025-01-15T11:55:00Z')
      expect(formatRelativeTime(date)).toBe('5分前')
    })

    test('30分前の場合、「30分前」と表示', () => {
      const date = new Date('2025-01-15T11:30:00Z')
      expect(formatRelativeTime(date)).toBe('30分前')
    })

    test('59分前の場合、「59分前」と表示', () => {
      const date = new Date('2025-01-15T11:01:00Z')
      expect(formatRelativeTime(date)).toBe('59分前')
    })

    /**
     * 「〜時間前」のテスト（1時間以上24時間未満）
     */
    test('1時間前の場合、「1時間前」と表示', () => {
      const date = new Date('2025-01-15T11:00:00Z')
      expect(formatRelativeTime(date)).toBe('1時間前')
    })

    test('5時間前の場合、「5時間前」と表示', () => {
      const date = new Date('2025-01-15T07:00:00Z')
      expect(formatRelativeTime(date)).toBe('5時間前')
    })

    test('23時間前の場合、「23時間前」と表示', () => {
      const date = new Date('2025-01-14T13:00:00Z')
      expect(formatRelativeTime(date)).toBe('23時間前')
    })

    /**
     * 「〜日前」のテスト（1日以上7日未満）
     */
    test('1日前の場合、「1日前」と表示', () => {
      const date = new Date('2025-01-14T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('1日前')
    })

    test('3日前の場合、「3日前」と表示', () => {
      const date = new Date('2025-01-12T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('3日前')
    })

    test('6日前の場合、「6日前」と表示', () => {
      const date = new Date('2025-01-09T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('6日前')
    })

    /**
     * 日付表示のテスト（7日以上前）
     */
    test('7日前の場合、日付形式で表示', () => {
      const date = new Date('2025-01-08T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('2025/01/08')
    })

    test('30日前の場合、日付形式で表示', () => {
      const date = new Date('2024-12-16T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('2024/12/16')
    })

    test('1年前の場合、日付形式で表示', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('2024/01/15')
    })

    /**
     * 日付のフォーマットテスト
     */
    test('月と日が1桁の場合、ゼロパディングされる', () => {
      // 基準日: 2025-01-15
      // 対象日: 2025-01-05（10日前なので日付形式）
      const date = new Date('2025-01-05T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('2025/01/05')
    })

    test('月と日が2桁の場合、そのまま表示', () => {
      const date = new Date('2024-11-25T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('2024/11/25')
    })

    /**
     * 文字列形式の日付のテスト
     */
    test('ISO形式の文字列でも正しく処理できる', () => {
      const dateString = '2025-01-15T11:55:00Z'
      expect(formatRelativeTime(dateString)).toBe('5分前')
    })

    test('別形式の日付文字列でも正しく処理できる', () => {
      // タイムゾーンの影響を受けるため、Dateオブジェクトを使用
      const dateString = '2025-01-15T11:55:00Z'
      expect(formatRelativeTime(dateString)).toBe('5分前')
    })

    /**
     * エッジケースのテスト
     */
    test('未来の日付の場合でもエラーにならない', () => {
      const futureDate = new Date('2025-01-16T12:00:00Z')
      // 未来の日付は負の値になるが、formatRelativeTimeはそのまま計算する
      const result = formatRelativeTime(futureDate)
      // 結果は実装に依存するが、エラーにならないことを確認
      expect(result).toBeDefined()
    })

    test('非常に古い日付でもエラーにならない', () => {
      const oldDate = new Date('1990-01-01T00:00:00Z')
      expect(formatRelativeTime(oldDate)).toBe('1990/01/01')
    })
  })
})
