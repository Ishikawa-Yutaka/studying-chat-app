/**
 * Presence Context
 *
 * アプリ全体でPresenceの状態を共有するためのContext
 * 複数のコンポーネントで個別にusePresenceを呼び出すと競合が発生するため、
 * 1つのPresence接続を全てのコンポーネントで共有する
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';

interface PresenceContextType {
  onlineUsers: string[];
  isUserOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

interface PresenceProviderProps {
  children: ReactNode;
}

/**
 * PresenceProvider
 *
 * アプリケーションのトップレベル（layout.tsx）で使用
 * Presenceの状態を子コンポーネント全体に配信
 */
export function PresenceProvider({ children }: PresenceProviderProps) {
  const { user } = useAuth();

  // Presenceフックを1度だけ呼び出す
  const { onlineUsers, isUserOnline } = usePresence({
    userId: user?.id || null,
    enabled: !!user,
  });

  return (
    <PresenceContext.Provider value={{ onlineUsers, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}

/**
 * usePresenceContext
 *
 * 各コンポーネントでPresence状態にアクセスするためのフック
 *
 * 使い方:
 * const { isUserOnline } = usePresenceContext();
 * if (isUserOnline('user123')) { ... }
 */
export function usePresenceContext() {
  const context = useContext(PresenceContext);

  if (context === undefined) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }

  return context;
}
