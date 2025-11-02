/**
 * ChannelHeaderコンポーネントのユニットテスト
 *
 * テスト対象: src/components/channel/channelHeader.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * チャンネルヘッダーコンポーネントの表示を確認します。
 *
 * テストする機能:
 * - チャンネル名の表示
 * - チャンネル説明の表示
 * - メンバー数の表示
 * - 説明とメンバー数の組み合わせ表示
 * - オプショナルなpropsの扱い
 */

// lucide-reactのモック
jest.mock('lucide-react', () => ({
  Hash: () => <div data-testid="hash-icon">Hash</div>,
}))

import { render, screen } from '@testing-library/react'
import ChannelHeader from '@/components/channel/channelHeader'

describe('ChannelHeader - チャンネルヘッダーコンポーネント', () => {
  /**
   * 基本的な表示テスト
   */
  describe('基本的な表示', () => {
    test('チャンネル名が表示される', () => {
      render(<ChannelHeader channelName="一般" />)

      expect(screen.getByText('一般')).toBeInTheDocument()
    })

    test('Hashアイコンが表示される', () => {
      render(<ChannelHeader channelName="テストチャンネル" />)

      expect(screen.getByTestId('hash-icon')).toBeInTheDocument()
    })

    test('headerタグでレンダリングされる', () => {
      const { container } = render(<ChannelHeader channelName="一般" />)

      const header = container.querySelector('header')
      expect(header).toBeInTheDocument()
    })
  })

  /**
   * チャンネル説明の表示テスト
   */
  describe('チャンネル説明の表示', () => {
    test('説明が渡された場合、表示される', () => {
      render(
        <ChannelHeader
          channelName="一般"
          channelDescription="雑談用チャンネル"
        />
      )

      expect(screen.getByText(/雑談用チャンネル/)).toBeInTheDocument()
    })

    test('説明が渡されていない場合、説明欄は表示されない', () => {
      const { container } = render(<ChannelHeader channelName="一般" />)

      // 区切り線が表示されないことを確認
      const divider = container.querySelector('.bg-border')
      expect(divider).not.toBeInTheDocument()
    })
  })

  /**
   * メンバー数の表示テスト
   */
  describe('メンバー数の表示', () => {
    test('メンバー数が渡された場合、表示される', () => {
      render(<ChannelHeader channelName="一般" memberCount={10} />)

      expect(screen.getByText(/10 人のメンバー/)).toBeInTheDocument()
    })

    test('メンバー数が0の場合は表示されない（0はfalsyのため）', () => {
      render(<ChannelHeader channelName="一般" memberCount={0} />)

      // 0はfalsyなので、memberCountの条件判定でfalseになり表示されない
      expect(screen.queryByText(/人のメンバー/)).not.toBeInTheDocument()
    })

    test('メンバー数が1の場合も正しく表示される', () => {
      render(<ChannelHeader channelName="一般" memberCount={1} />)

      expect(screen.getByText(/1 人のメンバー/)).toBeInTheDocument()
    })

    test('メンバー数が渡されていない場合、メンバー数は表示されない', () => {
      render(<ChannelHeader channelName="一般" />)

      expect(screen.queryByText(/人のメンバー/)).not.toBeInTheDocument()
    })
  })

  /**
   * 説明とメンバー数の組み合わせテスト
   */
  describe('説明とメンバー数の組み合わせ', () => {
    test('説明とメンバー数の両方が渡された場合、両方表示される', () => {
      render(
        <ChannelHeader
          channelName="一般"
          channelDescription="雑談用チャンネル"
          memberCount={5}
        />
      )

      expect(screen.getByText(/雑談用チャンネル/)).toBeInTheDocument()
      expect(screen.getByText(/5 人のメンバー/)).toBeInTheDocument()
    })

    test('説明とメンバー数の間にスペースが入る', () => {
      render(
        <ChannelHeader
          channelName="一般"
          channelDescription="雑談用チャンネル"
          memberCount={5}
        />
      )

      // 説明とメンバー数が含まれるテキストを取得
      const detailsText = screen.getByText(/雑談用チャンネル/)
      expect(detailsText.textContent).toContain('雑談用チャンネル')
      expect(detailsText.textContent).toContain('(5 人のメンバー)')
    })

    test('説明のみの場合、区切り線が表示される', () => {
      const { container } = render(
        <ChannelHeader
          channelName="一般"
          channelDescription="雑談用チャンネル"
        />
      )

      const divider = container.querySelector('.bg-border')
      expect(divider).toBeInTheDocument()
    })

    test('メンバー数のみの場合、区切り線が表示される', () => {
      const { container } = render(
        <ChannelHeader channelName="一般" memberCount={10} />
      )

      const divider = container.querySelector('.bg-border')
      expect(divider).toBeInTheDocument()
    })
  })

  /**
   * レスポンシブデザインのテスト
   */
  describe('レスポンシブデザイン', () => {
    test('詳細情報にmd:blockクラスが適用されている（モバイルでは非表示）', () => {
      const { container } = render(
        <ChannelHeader
          channelName="一般"
          channelDescription="雑談用チャンネル"
          memberCount={5}
        />
      )

      // md:blockクラスとhidden クラスを持つ要素を確認
      const detailsElement = container.querySelector('.hidden.md\\:block')
      expect(detailsElement).toBeInTheDocument()
    })
  })

  /**
   * 長いチャンネル名・説明のテスト
   */
  describe('長いテキストの表示', () => {
    test('長いチャンネル名が表示される', () => {
      const longName = 'とても長いチャンネル名テストですがちゃんと表示されるか確認'
      render(<ChannelHeader channelName={longName} />)

      expect(screen.getByText(longName)).toBeInTheDocument()
    })

    test('長い説明文が表示される', () => {
      const longDescription =
        'これは非常に長い説明文です。このチャンネルは様々な話題について自由に議論できる場所です。'
      render(
        <ChannelHeader channelName="一般" channelDescription={longDescription} />
      )

      expect(screen.getByText(new RegExp(longDescription))).toBeInTheDocument()
    })
  })

  /**
   * 特殊文字を含むチャンネル名のテスト
   */
  describe('特殊文字を含むチャンネル名', () => {
    test('記号を含むチャンネル名が正しく表示される', () => {
      render(<ChannelHeader channelName="開発者-チャンネル_01" />)

      expect(screen.getByText('開発者-チャンネル_01')).toBeInTheDocument()
    })

    test('絵文字を含むチャンネル名が正しく表示される', () => {
      render(<ChannelHeader channelName="雑談🎉" />)

      expect(screen.getByText('雑談🎉')).toBeInTheDocument()
    })
  })

  /**
   * スタイリングのテスト
   */
  describe('スタイリング', () => {
    test('ヘッダーにborder-bクラスが適用されている', () => {
      const { container } = render(<ChannelHeader channelName="一般" />)

      const header = container.querySelector('header')
      expect(header).toHaveClass('border-b')
    })

    test('チャンネル名がfont-semiboldクラスを持つ', () => {
      const { container } = render(<ChannelHeader channelName="一般" />)

      const heading = container.querySelector('h1')
      expect(heading).toHaveClass('font-semibold')
    })

    test('詳細情報がtext-smクラスを持つ', () => {
      const { container } = render(
        <ChannelHeader
          channelName="一般"
          channelDescription="説明"
          memberCount={5}
        />
      )

      const details = container.querySelector('.text-sm')
      expect(details).toBeInTheDocument()
    })
  })
})
