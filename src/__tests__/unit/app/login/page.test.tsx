/**
 * ログインページのユニットテスト
 *
 * テスト対象: src/app/login/page.tsx
 *
 * このテストでは、ログインページの
 * 動作を確認します。
 *
 * テストする機能:
 * - ページの基本レンダリング
 * - フォーム入力
 * - パスワード表示/非表示切り替え
 * - ソーシャルログインボタン
 * - ナビゲーションリンク
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '@/app/login/page';
import { signInWithSocial } from '@/lib/social-auth';

// モック設定
jest.mock('@/lib/social-auth', () => ({
  signInWithSocial: jest.fn(),
  SOCIAL_PROVIDERS: {
    google: { color: 'text-gray-700' },
    github: { color: 'text-gray-700' },
    twitter: { color: 'text-blue-400' },
    facebook: { color: 'text-blue-600' },
  },
}));

jest.mock('@/app/login/actions', () => ({
  login: jest.fn(),
  signup: jest.fn(),
}));

const mockSignInWithSocial = signInWithSocial as jest.MockedFunction<typeof signInWithSocial>;

describe('LoginPage（ログインページ）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 基本的なレンダリング
   */
  describe('基本レンダリング', () => {
    test('ページタイトルが表示される', () => {
      render(<LoginPage />);

      expect(screen.getByText('チャットアプリにログイン')).toBeInTheDocument();
    });

    test('新規登録リンクが表示される', () => {
      render(<LoginPage />);

      const signupLinks = screen.getAllByText(/新規登録はこちら/);
      expect(signupLinks.length).toBeGreaterThan(0);
      expect(signupLinks[0]).toBeInTheDocument();
    });

    test('カードタイトル「ログイン」が表示される', () => {
      render(<LoginPage />);

      const loginTexts = screen.getAllByText('ログイン');
      expect(loginTexts.length).toBeGreaterThan(0);
      expect(loginTexts[0]).toBeInTheDocument();
    });

    test('カード説明文が表示される', () => {
      render(<LoginPage />);

      expect(
        screen.getByText(/メールアドレスとパスワード、またはソーシャルアカウントでログインできます/)
      ).toBeInTheDocument();
    });

    test('メールアドレス入力欄が表示される', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText('メールアドレス');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    test('パスワード入力欄が表示される', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('パスワード');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
    });

    test('ログインボタンが表示される', () => {
      render(<LoginPage />);

      const loginButtons = screen.getAllByRole('button', { name: /ログイン/i });
      expect(loginButtons.length).toBeGreaterThan(0);
    });
  });

  /**
   * ソーシャルログインボタン
   */
  describe('ソーシャルログインボタン', () => {
    test('Googleログインボタンが表示される', () => {
      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
    });

    test('GitHubログインボタンが表示される', () => {
      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /GitHub/i })).toBeInTheDocument();
    });

    test('Googleログインボタンをクリックすると、signInWithSocialが呼ばれる', async () => {
      mockSignInWithSocial.mockResolvedValue(undefined);

      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithSocial).toHaveBeenCalledWith('google');
      });
    });

    test('GitHubログインボタンをクリックすると、signInWithSocialが呼ばれる', async () => {
      mockSignInWithSocial.mockResolvedValue(undefined);

      render(<LoginPage />);

      const githubButton = screen.getByRole('button', { name: /GitHub/i });
      fireEvent.click(githubButton);

      await waitFor(() => {
        expect(mockSignInWithSocial).toHaveBeenCalledWith('github');
      });
    });

    test('ソーシャルログインでエラーが発生した場合、アラートが表示される', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockSignInWithSocial.mockRejectedValue(new Error('Social login failed'));

      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('ログインに失敗しました。もう一度お試しください。');
      });

      alertSpy.mockRestore();
    });
  });

  /**
   * フォーム入力
   */
  describe('フォーム入力', () => {
    test('メールアドレスを入力できる', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    test('パスワードを入力できる', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput.value).toBe('password123');
    });

    test('メールアドレス入力欄に正しいプレースホルダーが設定されている', () => {
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('your-email@example.com');
      expect(emailInput).toBeInTheDocument();
    });

    test('パスワード入力欄に正しいプレースホルダーが設定されている', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByPlaceholderText('パスワードを入力');
      expect(passwordInput).toBeInTheDocument();
    });
  });

  /**
   * パスワード表示/非表示切り替え
   */
  describe('パスワード表示/非表示切り替え', () => {
    test('初期状態ではパスワードが非表示（type="password"）', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('パスワード');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('目のアイコンをクリックすると、パスワードが表示される（type="text"）', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('パスワード');
      const toggleButton = screen.getByRole('button', { name: /パスワードを表示/i });

      fireEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('目のアイコンを2回クリックすると、パスワードが再び非表示になる', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('パスワード');
      const toggleButton = screen.getByRole('button', { name: /パスワードを表示/i });

      // 1回目のクリック: 表示
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // 2回目のクリック: 非表示
      const hideButton = screen.getByRole('button', { name: /パスワードを非表示/i });
      fireEvent.click(hideButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  /**
   * ナビゲーションリンク
   */
  describe('ナビゲーションリンク', () => {
    test('「新規登録はこちら」リンクが /signup にリンクしている', () => {
      render(<LoginPage />);

      const signupLinks = screen.getAllByText(/新規登録はこちら/);
      // テキスト内のリンクを取得
      const link = signupLinks[0].closest('a');
      expect(link).toHaveAttribute('href', '/signup');
    });

    test('フォーム下部の新規登録ボタンが /signup にリンクしている', () => {
      render(<LoginPage />);

      const signupLinks = screen.getAllByRole('link', { name: /新規登録はこちら/i });
      expect(signupLinks[signupLinks.length - 1]).toHaveAttribute('href', '/signup');
    });
  });

  /**
   * バリデーション
   */
  describe('バリデーション', () => {
    test('メールアドレス入力欄にmaxLengthが設定されている', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText('メールアドレス');
      expect(emailInput).toHaveAttribute('maxLength', '255');
    });

    test('パスワード入力欄にminLengthが設定されている', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('パスワード');
      expect(passwordInput).toHaveAttribute('minLength', '8');
    });

    test('パスワード入力欄にmaxLengthが設定されている', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('パスワード');
      expect(passwordInput).toHaveAttribute('maxLength', '128');
    });
  });

  /**
   * 区切り線
   */
  describe('UI要素', () => {
    test('「または」という区切り線が表示される', () => {
      render(<LoginPage />);

      expect(screen.getByText('または')).toBeInTheDocument();
    });
  });
});
