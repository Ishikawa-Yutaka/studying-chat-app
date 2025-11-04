/**
 * トップページ（ランディングページ）のユニットテスト
 *
 * テスト対象: src/app/page.tsx
 *
 * このテストでは、トップページの
 * 動作を確認します。
 *
 * テストする機能:
 * - ページの基本レンダリング
 * - ナビゲーションリンク
 * - ダークモード切り替え
 * - 主な機能セクションの表示
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TopPage from '@/app/page';
import { useTheme } from 'next-themes';

// next-themesのモック
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('TopPage（トップページ）', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのテーマモック
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      themes: ['light', 'dark'],
      systemTheme: 'light',
      resolvedTheme: 'light',
    } as any);
  });

  /**
   * 基本的なレンダリング
   */
  describe('基本レンダリング', () => {
    test('ページタイトルが表示される', () => {
      render(<TopPage />);

      // ヘッダーと本文に複数存在するため getAllByText を使用
      const titles = screen.getAllByText('STUDYing Tech Chat');
      expect(titles.length).toBeGreaterThan(0);
      expect(titles[0]).toBeInTheDocument();
    });

    test('ヘッダーにログインボタンが表示される', () => {
      render(<TopPage />);

      const loginButtons = screen.getAllByText('ログイン');
      expect(loginButtons.length).toBeGreaterThan(0);
    });

    test('ヘッダーに新規登録ボタンが表示される', () => {
      render(<TopPage />);

      const signupButtons = screen.getAllByText('新規登録');
      expect(signupButtons.length).toBeGreaterThan(0);
    });

    test('ヒーローセクションのメインメッセージが表示される', () => {
      render(<TopPage />);

      expect(
        screen.getByText(/チームのコミュニケーションを効率化し、円滑なコミュニケーションを実現/)
      ).toBeInTheDocument();
    });

    test('「無料で始める」ボタンが表示される', () => {
      render(<TopPage />);

      expect(screen.getByText('無料で始める')).toBeInTheDocument();
    });

    test('主な機能セクションが表示される', () => {
      render(<TopPage />);

      expect(screen.getByText('主な機能')).toBeInTheDocument();
    });

    test('3つの主要機能が表示される', () => {
      render(<TopPage />);

      expect(screen.getByText('チャンネル機能')).toBeInTheDocument();
      expect(screen.getByText('ダイレクトメッセージ')).toBeInTheDocument();
      expect(screen.getByText('AI機能')).toBeInTheDocument();
    });

    test('フッターが表示される', () => {
      render(<TopPage />);

      expect(screen.getByText(/© 2025 STUDYing Tech Chat/)).toBeInTheDocument();
    });
  });

  /**
   * ナビゲーションリンク
   */
  describe('ナビゲーションリンク', () => {
    test('ヘッダーのログインボタンが /login にリンクしている', () => {
      render(<TopPage />);

      const loginLinks = screen.getAllByRole('link', { name: /ログイン/i });
      expect(loginLinks[0]).toHaveAttribute('href', '/login');
    });

    test('ヘッダーの新規登録ボタンが /signup にリンクしている', () => {
      render(<TopPage />);

      const signupLinks = screen.getAllByRole('link', { name: /新規登録/i });
      expect(signupLinks[0]).toHaveAttribute('href', '/signup');
    });

    test('「無料で始める」ボタンが /signup にリンクしている', () => {
      render(<TopPage />);

      const freeStartButton = screen.getByRole('link', { name: /無料で始める/i });
      expect(freeStartButton).toHaveAttribute('href', '/signup');
    });
  });

  /**
   * ダークモード切り替え
   */
  describe('ダークモード切り替え', () => {
    test('ライトモード時、ダークモードスイッチがオフになっている', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
        themes: ['light', 'dark'],
        systemTheme: 'light',
        resolvedTheme: 'light',
      } as any);

      render(<TopPage />);

      // マウント後にスイッチが表示されるまで待つ
      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        expect(switches[0]).not.toBeChecked();
      });
    });

    test('ダークモード時、ダークモードスイッチがオンになっている', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: jest.fn(),
        themes: ['light', 'dark'],
        systemTheme: 'dark',
        resolvedTheme: 'dark',
      } as any);

      render(<TopPage />);

      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        expect(switches[0]).toBeChecked();
      });
    });

    test('ダークモードスイッチをクリックすると、テーマが切り替わる（light → dark）', async () => {
      const mockSetTheme = jest.fn();

      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        themes: ['light', 'dark'],
        systemTheme: 'light',
        resolvedTheme: 'light',
      } as any);

      render(<TopPage />);

      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        fireEvent.click(switches[0]);
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    test('ダークモードスイッチをクリックすると、テーマが切り替わる（dark → light）', async () => {
      const mockSetTheme = jest.fn();

      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        themes: ['light', 'dark'],
        systemTheme: 'dark',
        resolvedTheme: 'dark',
      } as any);

      render(<TopPage />);

      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        fireEvent.click(switches[0]);
      });

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    test('View Transition APIが利用可能な場合、アニメーション付きでテーマが切り替わる', async () => {
      const mockSetTheme = jest.fn();
      const mockStartViewTransition = jest.fn((callback) => {
        callback();
      });

      // View Transition APIをモック
      (document as any).startViewTransition = mockStartViewTransition;

      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        themes: ['light', 'dark'],
        systemTheme: 'light',
        resolvedTheme: 'light',
      } as any);

      render(<TopPage />);

      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        fireEvent.click(switches[0]);
      });

      expect(mockStartViewTransition).toHaveBeenCalled();
      expect(mockSetTheme).toHaveBeenCalledWith('dark');

      // クリーンアップ
      delete (document as any).startViewTransition;
    });

    test('View Transition APIが利用不可能な場合、通常のテーマ切り替えが動作する', async () => {
      const mockSetTheme = jest.fn();

      // View Transition APIを削除
      delete (document as any).startViewTransition;

      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        themes: ['light', 'dark'],
        systemTheme: 'light',
        resolvedTheme: 'light',
      } as any);

      render(<TopPage />);

      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        fireEvent.click(switches[0]);
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });

  /**
   * 主な機能セクション
   */
  describe('主な機能セクション', () => {
    test('チャンネル機能の説明が表示される', () => {
      render(<TopPage />);

      expect(
        screen.getByText(/トピックごとにチャンネルを作成することができます/)
      ).toBeInTheDocument();
    });

    test('ダイレクトメッセージの説明が表示される', () => {
      render(<TopPage />);

      expect(
        screen.getByText(/プライベートなコミュニケーションをすることができます/)
      ).toBeInTheDocument();
    });

    test('AI機能の説明が表示される', () => {
      render(<TopPage />);

      expect(
        screen.getByText(/AI チャットボットが提供されており、アプリ内で AI との会話ができます/)
      ).toBeInTheDocument();
    });
  });

  /**
   * レスポンシブデザイン
   */
  describe('レスポンシブデザイン', () => {
    test('画像が正しく表示される', () => {
      render(<TopPage />);

      const image = screen.getByAltText('STUDYing Tech Chat Dashboard');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src');
    });
  });
});
