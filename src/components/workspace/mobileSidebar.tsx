/**
 * モバイルサイドバーコンポーネント
 *
 * Radix UIを使わず、独自実装でアニメーションを完全制御
 */

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export default function MobileSidebar({ open, onOpenChange, children }: MobileSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // openが変更されたときの処理
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
    } else if (isVisible) {
      // 閉じるアニメーション開始
      setIsClosing(true);
      // アニメーション完了後に非表示
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 500); // 閉じるアニメーションの時間
      return () => clearTimeout(timer);
    }
  }, [open, isVisible]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onOpenChange]);

  // スクロールを防ぐ
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!isVisible) return null;

  return (
    <>
      {/* オーバーレイ（背景） */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* サイドバーコンテンツ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 h-full w-3/4 max-w-sm shadow-lg ${isClosing ? 'animate-slide-out-left' : 'animate-slide-in-left'}`}
        style={{ backgroundColor: 'hsl(var(--background))' }}
        role="dialog"
        aria-modal="true"
        aria-label="ナビゲーションメニュー"
      >
        {/* コンテンツ */}
        {children}

        {/* 閉じるボタン */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-[60]"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">閉じる</span>
        </Button>
      </div>
    </>
  );
}
