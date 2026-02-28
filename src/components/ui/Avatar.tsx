import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, alt = '', fallback, size = 'md', className, ...props }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src);

  const showFallback = !src || imageError;
  const initials = fallback ? getInitials(fallback) : alt ? getInitials(alt) : '?';

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-cyan-500',
        sizeStyles[size],
        className
      )}
    >
      {isLoading && !imageError && (
        <div className="absolute inset-0 animate-pulse bg-surface-700" />
      )}

      {!showFallback && (
        <img
          src={src}
          alt={alt}
          className={cn(
            'h-full w-full object-cover',
            isLoading && 'opacity-0'
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setImageError(true);
            setIsLoading(false);
          }}
          {...props}
        />
      )}

      {showFallback && (
        <span className="font-medium text-white">{initials}</span>
      )}
    </div>
  );
}
