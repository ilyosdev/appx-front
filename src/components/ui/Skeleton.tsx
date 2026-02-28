import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type SkeletonVariant = 'text' | 'circular' | 'rectangular';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-lg',
};

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-700',
        variantStyles[variant],
        variant === 'text' && 'h-4',
        variant === 'circular' && 'h-10 w-10',
        variant === 'rectangular' && 'h-24',
        className
      )}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-surface-600/50 to-transparent"
        style={{
          animation: 'shimmer 2s infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}
