/**
 * 閉じるボタンコンポーネント
 *
 * モーダルやパネルの閉じるボタンを統一的に表示
 */

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CloseButtonProps {
  /**
   * クリック時のハンドラー
   */
  onClick: () => void;

  /**
   * ボタンのサイズ（デフォルト: 'md'）
   * - 'sm': 40px x 40px
   * - 'md': 48px x 48px
   * - 'lg': 56px x 56px
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * 追加のクラス名
   */
  className?: string;

  /**
   * aria-label（デフォルト: '閉じる'）
   */
  ariaLabel?: string;
}

export function CloseButton({
  onClick,
  size = 'md',
  className,
  ariaLabel = '閉じる',
}: CloseButtonProps) {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-md transition-colors',
        'hover:bg-gray-200 dark:hover:bg-gray-700',
        sizeClasses[size],
        className
      )}
      aria-label={ariaLabel}
    >
      <X
        style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
        className="text-current"
      />
    </button>
  );
}
