/**
 * PresenceContext のユニットテスト
 *
 * テスト対象: src/contexts/PresenceContext.tsx
 *
 * このテストでは、Presenceコンテキストの
 * 動作を確認します。
 *
 * テストする機能:
 * - PresenceProvider のレンダリング
 * - usePresenceContext フックの動作
 * - Provider 外でのエラーハンドリング
 * - オンラインユーザー状態の提供
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PresenceProvider, usePresenceContext } from '@/contexts/PresenceContext';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';

// モック設定
jest.mock('@/hooks/usePresence');
jest.mock('@/hooks/useAuth');

const mockUsePresence = usePresence as jest.MockedFunction<typeof usePresence>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('PresenceContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * PresenceProvider の基本動作
   */
  describe('PresenceProvider', () => {
    test('子コンポーネントを正常にレンダリングできる', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        error: null,
      });

      mockUsePresence.mockReturnValue({
        onlineUsers: [],
        isUserOnline: jest.fn(() => false),
      });

      render(
        <PresenceProvider>
          <div>Test Child</div>
        </PresenceProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    test('ログインユーザーが存在する場合、usePresenceが有効化される', () => {
      const mockUser = {
        id: 'user-123',
        authId: 'auth-123',
        name: 'テストユーザー',
        email: 'test@example.com',
        avatarUrl: null,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        error: null,
      });

      mockUsePresence.mockReturnValue({
        onlineUsers: ['user-123'],
        isUserOnline: jest.fn(() => true),
      });

      render(
        <PresenceProvider>
          <div>Test</div>
        </PresenceProvider>
      );

      // usePresenceが正しいパラメータで呼ばれているか確認
      expect(mockUsePresence).toHaveBeenCalledWith({
        userId: 'user-123',
        enabled: true,
      });
    });

    test('ログインユーザーが存在しない場合、usePresenceが無効化される', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        error: null,
      });

      mockUsePresence.mockReturnValue({
        onlineUsers: [],
        isUserOnline: jest.fn(() => false),
      });

      render(
        <PresenceProvider>
          <div>Test</div>
        </PresenceProvider>
      );

      // enabled: false で呼ばれることを確認
      expect(mockUsePresence).toHaveBeenCalledWith({
        userId: null,
        enabled: false,
      });
    });

    test('複数の子コンポーネントをレンダリングできる', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        error: null,
      });

      mockUsePresence.mockReturnValue({
        onlineUsers: [],
        isUserOnline: jest.fn(() => false),
      });

      render(
        <PresenceProvider>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </PresenceProvider>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });
  });

  /**
   * usePresenceContext フックのテスト
   */
  describe('usePresenceContext', () => {
    test('Provider内で使用すると、Presence状態を取得できる', () => {
      const mockIsUserOnline = jest.fn((userId: string) => userId === 'user-online');

      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          authId: 'auth-123',
          name: 'テストユーザー',
          email: 'test@example.com',
          avatarUrl: null,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      mockUsePresence.mockReturnValue({
        onlineUsers: ['user-online', 'user-456'],
        isUserOnline: mockIsUserOnline,
      });

      // テスト用コンポーネント
      function TestComponent() {
        const { onlineUsers, isUserOnline } = usePresenceContext();

        return (
          <div>
            <div data-testid="online-count">{onlineUsers.length}</div>
            <div data-testid="user-online-status">
              {isUserOnline('user-online') ? 'Online' : 'Offline'}
            </div>
            <div data-testid="user-offline-status">
              {isUserOnline('user-offline') ? 'Online' : 'Offline'}
            </div>
          </div>
        );
      }

      render(
        <PresenceProvider>
          <TestComponent />
        </PresenceProvider>
      );

      expect(screen.getByTestId('online-count')).toHaveTextContent('2');
      expect(screen.getByTestId('user-online-status')).toHaveTextContent('Online');
      expect(screen.getByTestId('user-offline-status')).toHaveTextContent('Offline');
    });

    test('Provider外で使用するとエラーをスローする', () => {
      // コンソールエラーを抑制
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      function TestComponent() {
        usePresenceContext();
        return <div>Test</div>;
      }

      // Provider外で使用するとエラー
      expect(() => {
        render(<TestComponent />);
      }).toThrow('usePresenceContext must be used within a PresenceProvider');

      consoleErrorSpy.mockRestore();
    });

    test('onlineUsersが空配列の場合も正常に動作する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        error: null,
      });

      mockUsePresence.mockReturnValue({
        onlineUsers: [],
        isUserOnline: jest.fn(() => false),
      });

      function TestComponent() {
        const { onlineUsers } = usePresenceContext();
        return <div data-testid="online-count">{onlineUsers.length}</div>;
      }

      render(
        <PresenceProvider>
          <TestComponent />
        </PresenceProvider>
      );

      expect(screen.getByTestId('online-count')).toHaveTextContent('0');
    });

    test('複数のコンポーネントで同じPresence状態を共有できる', () => {
      const mockIsUserOnline = jest.fn((userId: string) => userId === 'user-online');

      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          authId: 'auth-123',
          name: 'テストユーザー',
          email: 'test@example.com',
          avatarUrl: null,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      mockUsePresence.mockReturnValue({
        onlineUsers: ['user-online', 'user-456', 'user-789'],
        isUserOnline: mockIsUserOnline,
      });

      function ComponentA() {
        const { onlineUsers } = usePresenceContext();
        return <div data-testid="component-a-count">{onlineUsers.length}</div>;
      }

      function ComponentB() {
        const { onlineUsers } = usePresenceContext();
        return <div data-testid="component-b-count">{onlineUsers.length}</div>;
      }

      function ComponentC() {
        const { isUserOnline } = usePresenceContext();
        return (
          <div data-testid="component-c-status">
            {isUserOnline('user-online') ? 'Online' : 'Offline'}
          </div>
        );
      }

      render(
        <PresenceProvider>
          <ComponentA />
          <ComponentB />
          <ComponentC />
        </PresenceProvider>
      );

      // 全てのコンポーネントが同じ状態を参照
      expect(screen.getByTestId('component-a-count')).toHaveTextContent('3');
      expect(screen.getByTestId('component-b-count')).toHaveTextContent('3');
      expect(screen.getByTestId('component-c-status')).toHaveTextContent('Online');
    });
  });

  /**
   * Presence状態の変化テスト
   */
  describe('Presence状態の提供', () => {
    test('オンラインユーザーリストを正しく提供する', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          authId: 'auth-123',
          name: 'テストユーザー',
          email: 'test@example.com',
          avatarUrl: null,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const onlineUsersList = ['user-123', 'user-456', 'user-789'];
      mockUsePresence.mockReturnValue({
        onlineUsers: onlineUsersList,
        isUserOnline: jest.fn((userId) => onlineUsersList.includes(userId)),
      });

      function TestComponent() {
        const { onlineUsers, isUserOnline } = usePresenceContext();

        return (
          <div>
            <div data-testid="total">{onlineUsers.length}</div>
            {onlineUsers.map((userId) => (
              <div key={userId} data-testid={`user-${userId}`}>
                {userId}: {isUserOnline(userId) ? 'Online' : 'Offline'}
              </div>
            ))}
          </div>
        );
      }

      render(
        <PresenceProvider>
          <TestComponent />
        </PresenceProvider>
      );

      expect(screen.getByTestId('total')).toHaveTextContent('3');
      expect(screen.getByTestId('user-user-123')).toHaveTextContent('user-123: Online');
      expect(screen.getByTestId('user-user-456')).toHaveTextContent('user-456: Online');
      expect(screen.getByTestId('user-user-789')).toHaveTextContent('user-789: Online');
    });

    test('isUserOnline関数が正しく動作する', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          authId: 'auth-123',
          name: 'テストユーザー',
          email: 'test@example.com',
          avatarUrl: null,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const onlineUsersList = ['user-online-1', 'user-online-2'];
      mockUsePresence.mockReturnValue({
        onlineUsers: onlineUsersList,
        isUserOnline: jest.fn((userId) => onlineUsersList.includes(userId)),
      });

      function TestComponent() {
        const { isUserOnline } = usePresenceContext();

        return (
          <div>
            <div data-testid="online-1">
              {isUserOnline('user-online-1') ? 'Online' : 'Offline'}
            </div>
            <div data-testid="online-2">
              {isUserOnline('user-online-2') ? 'Online' : 'Offline'}
            </div>
            <div data-testid="offline-1">
              {isUserOnline('user-offline') ? 'Online' : 'Offline'}
            </div>
          </div>
        );
      }

      render(
        <PresenceProvider>
          <TestComponent />
        </PresenceProvider>
      );

      expect(screen.getByTestId('online-1')).toHaveTextContent('Online');
      expect(screen.getByTestId('online-2')).toHaveTextContent('Online');
      expect(screen.getByTestId('offline-1')).toHaveTextContent('Offline');
    });
  });
});
