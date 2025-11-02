/**
 * UserProfileBarコンポーネントのユニットテスト
 *
 * テスト対象: src/components/workspace/userProfileBar.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * ユーザープロフィールバーコンポーネントの表示を確認します。
 *
 * テストする機能:
 * - ユーザー名の表示
 * - メールアドレスの表示
 * - ユーザーアバター表示
 * - ユーザー情報がnullの場合の処理
 * - emailが未設定の場合の処理
 * - avatarUrlの扱い
 * - 長いテキストのtruncate処理
 */

// 依存コンポーネントのモック
jest.mock('@/components/userAvatar', () => ({
  UserAvatar: ({ name, size, avatarUrl }: any) => (
    <div data-testid="user-avatar" data-name={name} data-size={size}>
      {name}のアバター
    </div>
  ),
}))

import { render, screen } from '@testing-library/react'
import UserProfileBar from '@/components/workspace/userProfileBar'

// テスト用のユーザーデータ
const mockUserComplete = {
  id: 'user-1',
  name: 'テストユーザー',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.png',
}

const mockUserWithoutEmail = {
  id: 'user-2',
  name: 'ユーザー2',
  avatarUrl: 'https://example.com/avatar2.png',
}

const mockUserWithoutAvatar = {
  id: 'user-3',
  name: 'ユーザー3',
  email: 'user3@example.com',
  avatarUrl: null,
}

describe('UserProfileBar - ユーザープロフィールバー', () => {
  /**
   * 基本的な表示テスト
   */
  describe('基本的な表示', () => {
    test('ユーザー名が表示される', () => {
      render(<UserProfileBar user={mockUserComplete} />)

      expect(screen.getByText('テストユーザー')).toBeInTheDocument()
    })

    test('メールアドレスが表示される', () => {
      render(<UserProfileBar user={mockUserComplete} />)

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    test('UserAvatarコンポーネントが表示される', () => {
      render(<UserProfileBar user={mockUserComplete} />)

      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('data-name', 'テストユーザー')
    })

    test('UserAvatarのサイズがsmに設定されている', () => {
      render(<UserProfileBar user={mockUserComplete} />)

      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toHaveAttribute('data-size', 'sm')
    })
  })

  /**
   * ユーザー情報がnullの場合のテスト
   */
  describe('ユーザー情報がnullの場合', () => {
    test('「読み込み中...」と表示される', () => {
      render(<UserProfileBar user={null} />)

      expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    })

    test('UserAvatarは表示されない', () => {
      render(<UserProfileBar user={null} />)

      expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument()
    })

    test('ユーザー名やメールアドレスは表示されない', () => {
      const { container } = render(<UserProfileBar user={null} />)

      // ユーザー情報が含まれていないことを確認
      expect(container.textContent).toBe('読み込み中...')
    })
  })

  /**
   * emailが未設定の場合のテスト
   */
  describe('emailが未設定の場合', () => {
    test('ユーザー名のみ表示される', () => {
      render(<UserProfileBar user={mockUserWithoutEmail} />)

      expect(screen.getByText('ユーザー2')).toBeInTheDocument()
    })

    test('メールアドレスは表示されない', () => {
      const { container } = render(
        <UserProfileBar user={mockUserWithoutEmail} />
      )

      // emailアドレスのtext-xsクラスを持つ要素が存在しない
      const emailElement = container.querySelector('.text-xs')
      expect(emailElement).not.toBeInTheDocument()
    })

    test('UserAvatarは表示される', () => {
      render(<UserProfileBar user={mockUserWithoutEmail} />)

      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    })
  })

  /**
   * avatarUrlの扱いテスト
   */
  describe('avatarUrlの扱い', () => {
    test('avatarUrlがnullでもエラーにならない', () => {
      render(<UserProfileBar user={mockUserWithoutAvatar} />)

      expect(screen.getByText('ユーザー3')).toBeInTheDocument()
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    })

    test('avatarUrlが設定されている場合、UserAvatarに渡される', () => {
      render(<UserProfileBar user={mockUserComplete} />)

      // UserAvatarコンポーネントがレンダリングされている
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    })
  })

  /**
   * 長いテキストの処理テスト
   */
  describe('長いテキストの処理', () => {
    test('長いユーザー名にtruncateクラスが適用される', () => {
      const userWithLongName = {
        ...mockUserComplete,
        name: 'とても長いユーザー名ですがちゃんとtruncateされるか確認するテスト',
      }

      const { container } = render(<UserProfileBar user={userWithLongName} />)

      // ユーザー名のp要素にtruncateクラスがあるか
      const nameElement = container.querySelector('.truncate')
      expect(nameElement).toBeInTheDocument()
      expect(nameElement?.textContent).toContain('とても長い')
    })

    test('長いメールアドレスにtruncateクラスが適用される', () => {
      const userWithLongEmail = {
        ...mockUserComplete,
        email:
          'very.long.email.address.for.testing.truncate.functionality@example.com',
      }

      const { container } = render(<UserProfileBar user={userWithLongEmail} />)

      // メールアドレスのp要素にtruncateクラスがあるか
      const emailElements = container.querySelectorAll('.truncate')
      // 名前とメールアドレスの両方にtruncateがある
      expect(emailElements.length).toBe(2)
    })
  })

  /**
   * 特殊文字を含むユーザー情報のテスト
   */
  describe('特殊文字を含むユーザー情報', () => {
    test('記号を含むユーザー名が正しく表示される', () => {
      const userWithSpecialChars = {
        ...mockUserComplete,
        name: 'ユーザー_123-テスト',
      }

      render(<UserProfileBar user={userWithSpecialChars} />)

      expect(screen.getByText('ユーザー_123-テスト')).toBeInTheDocument()
    })

    test('絵文字を含むユーザー名が正しく表示される', () => {
      const userWithEmoji = {
        ...mockUserComplete,
        name: 'テストユーザー🎉',
      }

      render(<UserProfileBar user={userWithEmoji} />)

      expect(screen.getByText('テストユーザー🎉')).toBeInTheDocument()
    })

    test('特殊文字を含むメールアドレスが正しく表示される', () => {
      const userWithSpecialEmail = {
        ...mockUserComplete,
        email: 'user+tag@example.co.jp',
      }

      render(<UserProfileBar user={userWithSpecialEmail} />)

      expect(screen.getByText('user+tag@example.co.jp')).toBeInTheDocument()
    })
  })

  /**
   * スタイリングのテスト
   */
  describe('スタイリング', () => {
    test('コンテナにflexクラスが適用されている', () => {
      const { container } = render(<UserProfileBar user={mockUserComplete} />)

      const flexContainer = container.querySelector('.flex.items-center')
      expect(flexContainer).toBeInTheDocument()
    })

    test('ユーザー名がfont-mediumクラスを持つ', () => {
      const { container } = render(<UserProfileBar user={mockUserComplete} />)

      const nameElement = container.querySelector('.font-medium')
      expect(nameElement).toBeInTheDocument()
      expect(nameElement?.textContent).toBe('テストユーザー')
    })

    test('メールアドレスがtext-xsクラスを持つ', () => {
      const { container } = render(<UserProfileBar user={mockUserComplete} />)

      const emailElement = container.querySelector('.text-xs')
      expect(emailElement).toBeInTheDocument()
      expect(emailElement?.textContent).toBe('test@example.com')
    })

    test('読み込み中メッセージがtext-smクラスを持つ', () => {
      const { container } = render(<UserProfileBar user={null} />)

      const loadingElement = container.querySelector('.text-sm')
      expect(loadingElement).toBeInTheDocument()
      expect(loadingElement?.textContent).toBe('読み込み中...')
    })
  })

  /**
   * ユーザー情報の更新テスト
   */
  describe('ユーザー情報の更新', () => {
    test('userプロップが変更されると表示が更新される', () => {
      const { rerender } = render(<UserProfileBar user={mockUserComplete} />)

      // 初期表示を確認
      expect(screen.getByText('テストユーザー')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()

      // 別のユーザーに更新
      rerender(<UserProfileBar user={mockUserWithoutEmail} />)

      // 新しいユーザー情報が表示される
      expect(screen.getByText('ユーザー2')).toBeInTheDocument()
      expect(screen.queryByText('テストユーザー')).not.toBeInTheDocument()
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
    })

    test('ユーザー情報がnullに変更されると読み込み中表示になる', () => {
      const { rerender } = render(<UserProfileBar user={mockUserComplete} />)

      // ユーザー情報が表示されている
      expect(screen.getByText('テストユーザー')).toBeInTheDocument()

      // nullに変更
      rerender(<UserProfileBar user={null} />)

      // 読み込み中表示になる
      expect(screen.getByText('読み込み中...')).toBeInTheDocument()
      expect(screen.queryByText('テストユーザー')).not.toBeInTheDocument()
    })
  })

  /**
   * エッジケースのテスト
   */
  describe('エッジケース', () => {
    test('空文字のユーザー名でもエラーにならない', () => {
      const userWithEmptyName = {
        ...mockUserComplete,
        name: '',
      }

      render(<UserProfileBar user={userWithEmptyName} />)

      // エラーが発生しないことを確認
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    })

    test('空文字のメールアドレスは表示されない', () => {
      const userWithEmptyEmail = {
        ...mockUserComplete,
        email: '',
      }

      const { container } = render(
        <UserProfileBar user={userWithEmptyEmail} />
      )

      // 空文字の場合、emailは表示されない（falsyのため）
      const emailElement = container.querySelector('.text-xs')
      expect(emailElement).not.toBeInTheDocument()
    })
  })
})
