/**
 * UserAvatarコンポーネントのユニットテスト
 *
 * テスト対象: src/components/userAvatar.tsx
 *
 * このテストでは、React Testing Libraryを使用して
 * ユーザーアバターコンポーネントの表示を確認します。
 *
 * テストする機能:
 * - イニシャル表示
 * - アバター画像表示
 * - サイズバリエーション（sm, md, lg）
 * - オンライン状態インジケーター
 * - エッジケース（空文字、nullなど）
 */

// Lucide React アイコンのモック
jest.mock('lucide-react', () => ({
  User: () => <div>User Icon</div>,
}))

// UI コンポーネントのモック
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => (
    <div className={className} data-testid="avatar">
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="avatar-image" />
  ),
  AvatarFallback: ({ children, className }: any) => (
    <div className={className} data-testid="avatar-fallback">
      {children}
    </div>
  ),
}))

import { render, screen } from '@testing-library/react'
import { UserAvatar } from '@/components/userAvatar'

describe('UserAvatar - ユーザーアバター', () => {
  /**
   * 基本的な表示テスト
   */
  describe('基本的な表示', () => {
    test('アバターが表示される', () => {
      render(<UserAvatar name="テストユーザー" />)

      expect(screen.getByTestId('avatar')).toBeInTheDocument()
    })

    test('名前からイニシャルが生成される（日本語1文字）', () => {
      render(<UserAvatar name="田中太郎" />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('田')
    })

    test('名前からイニシャルが生成される（英語1文字）', () => {
      render(<UserAvatar name="Ishikawa Yutaka" />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('I')
    })

    test('小文字の名前は大文字に変換される', () => {
      render(<UserAvatar name="uni" />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('U')
    })

    test('空白が含まれる名前は最初の文字を取得', () => {
      render(<UserAvatar name="  石川 裕  " />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('石')
    })
  })

  /**
   * アバター画像の表示テスト
   */
  describe('アバター画像の表示', () => {
    test('avatarUrlが指定されている場合、画像が表示される', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          avatarUrl="https://example.com/avatar.png"
        />
      )

      const image = screen.getByTestId('avatar-image')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', 'https://example.com/avatar.png')
      expect(image).toHaveAttribute('alt', 'テストユーザーのアバター')
    })

    test('avatarUrlがnullの場合、イニシャルのみ表示される', () => {
      render(<UserAvatar name="テストユーザー" avatarUrl={null} />)

      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument()
      expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument()
    })

    test('avatarUrlが未指定の場合、イニシャルのみ表示される', () => {
      render(<UserAvatar name="テストユーザー" />)

      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument()
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('テ')
    })

    test('フォールバックに適切なスタイルクラスが適用される', () => {
      render(<UserAvatar name="テストユーザー" />)

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toHaveClass(
        'bg-gradient-to-br',
        'from-indigo-500',
        'to-purple-600',
        'text-white',
        'font-semibold'
      )
    })
  })

  /**
   * サイズバリエーションのテスト
   */
  describe('サイズバリエーション', () => {
    test('size="sm"の場合、小さいサイズクラスが適用される', () => {
      render(<UserAvatar name="テストユーザー" size="sm" />)

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-8', 'w-8', 'text-xs')
    })

    test('size="md"の場合、中サイズクラスが適用される（デフォルト）', () => {
      render(<UserAvatar name="テストユーザー" size="md" />)

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-10', 'w-10', 'text-sm')
    })

    test('sizeが未指定の場合、デフォルト（md）が適用される', () => {
      render(<UserAvatar name="テストユーザー" />)

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-10', 'w-10', 'text-sm')
    })

    test('size="lg"の場合、大きいサイズクラスが適用される', () => {
      render(<UserAvatar name="テストユーザー" size="lg" />)

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-14', 'w-14', 'text-base')
    })
  })

  /**
   * カスタムクラス名のテスト
   */
  describe('カスタムクラス名', () => {
    test('classNameが指定されている場合、追加のクラスが適用される', () => {
      render(
        <UserAvatar name="テストユーザー" className="custom-class ring-2" />
      )

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('custom-class', 'ring-2')
    })

    test('classNameが未指定の場合、デフォルトクラスのみ適用される', () => {
      render(<UserAvatar name="テストユーザー" />)

      const avatar = screen.getByTestId('avatar')
      // デフォルトサイズクラスが適用されている
      expect(avatar).toHaveClass('h-10', 'w-10', 'text-sm')
    })
  })

  /**
   * オンライン状態インジケーターのテスト
   */
  describe('オンライン状態インジケーター', () => {
    test('showOnlineStatus=true かつ isOnline=true の場合、オンラインドットが表示される', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          showOnlineStatus={true}
          isOnline={true}
        />
      )

      const indicator = screen.getByLabelText('オンライン')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('bg-green-500', 'rounded-full')
    })

    test('showOnlineStatus=true でも isOnline=false の場合、ドットは表示されない', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          showOnlineStatus={true}
          isOnline={false}
        />
      )

      expect(screen.queryByLabelText('オンライン')).not.toBeInTheDocument()
    })

    test('showOnlineStatus=false の場合、isOnlineに関わらずドットは表示されない', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          showOnlineStatus={false}
          isOnline={true}
        />
      )

      expect(screen.queryByLabelText('オンライン')).not.toBeInTheDocument()
    })

    test('showOnlineStatusとisOnlineがどちらも未指定の場合、ドットは表示されない', () => {
      render(<UserAvatar name="テストユーザー" />)

      expect(screen.queryByLabelText('オンライン')).not.toBeInTheDocument()
    })

    test('size="sm"の場合、小さいインジケーターサイズが適用される', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          size="sm"
          showOnlineStatus={true}
          isOnline={true}
        />
      )

      const indicator = screen.getByLabelText('オンライン')
      expect(indicator).toHaveClass('w-2.5', 'h-2.5')
    })

    test('size="md"の場合、中インジケーターサイズが適用される', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          size="md"
          showOnlineStatus={true}
          isOnline={true}
        />
      )

      const indicator = screen.getByLabelText('オンライン')
      expect(indicator).toHaveClass('w-3', 'h-3')
    })

    test('size="lg"の場合、大きいインジケーターサイズが適用される', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          size="lg"
          showOnlineStatus={true}
          isOnline={true}
        />
      )

      const indicator = screen.getByLabelText('オンライン')
      expect(indicator).toHaveClass('w-4', 'h-4')
    })
  })

  /**
   * エッジケースのテスト
   */
  describe('エッジケース', () => {
    test('名前が空文字の場合、「?」が表示される', () => {
      render(<UserAvatar name="" />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('?')
    })

    test('名前が空白のみの場合、「?」が表示される', () => {
      render(<UserAvatar name="   " />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('?')
    })

    test('名前が1文字の場合、その文字が表示される', () => {
      render(<UserAvatar name="A" />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('A')
    })

    test('名前に絵文字が含まれる場合、最初の絵文字が表示される', () => {
      render(<UserAvatar name="🎉 テストユーザー" />)

      const fallback = screen.getByTestId('avatar-fallback')
      // 絵文字の最初の文字（または絵文字そのもの）
      expect(fallback.textContent).toBeTruthy()
    })

    test('名前に特殊文字が含まれる場合でもエラーにならない', () => {
      render(<UserAvatar name="@test-user_123" />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('@')
    })
  })

  /**
   * アバター画像とイニシャルの併存テスト
   */
  describe('アバター画像とイニシャルの併存', () => {
    test('avatarUrlがある場合でも、フォールバックは常に存在する', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          avatarUrl="https://example.com/avatar.png"
        />
      )

      // 画像とフォールバックの両方が存在する（画像が読み込めない場合に備えて）
      expect(screen.getByTestId('avatar-image')).toBeInTheDocument()
      expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument()
    })
  })

  /**
   * 相対配置のテスト
   */
  describe('相対配置', () => {
    test('アバターコンテナが相対配置されている', () => {
      const { container } = render(<UserAvatar name="テストユーザー" />)

      const wrapper = container.querySelector('.relative.inline-block')
      expect(wrapper).toBeInTheDocument()
    })

    test('オンラインインジケーターが絶対配置されている', () => {
      render(
        <UserAvatar
          name="テストユーザー"
          showOnlineStatus={true}
          isOnline={true}
        />
      )

      const indicator = screen.getByLabelText('オンライン')
      expect(indicator).toHaveClass('absolute', '-bottom-0.5', '-right-0.5')
    })
  })

  /**
   * 複数プロップの組み合わせテスト
   */
  describe('複数プロップの組み合わせ', () => {
    test('全てのプロップを組み合わせて使用できる', () => {
      render(
        <UserAvatar
          name="石川 裕"
          avatarUrl="https://example.com/avatar.png"
          size="lg"
          className="border-4 border-blue-500"
          showOnlineStatus={true}
          isOnline={true}
        />
      )

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-14', 'w-14', 'border-4', 'border-blue-500')

      const image = screen.getByTestId('avatar-image')
      expect(image).toHaveAttribute('src', 'https://example.com/avatar.png')

      const indicator = screen.getByLabelText('オンライン')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('w-4', 'h-4')
    })
  })
})
