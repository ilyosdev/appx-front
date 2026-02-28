import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

type ProgressVariant = 'bar' | 'circle';

interface ProgressProps {
  value: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  size?: number;
  strokeWidth?: number;
  gradient?: boolean;
  className?: string;
}

export function Progress({
  value,
  variant = 'bar',
  showLabel = false,
  size = 64,
  strokeWidth = 6,
  gradient = true,
  className,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  if (variant === 'circle') {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clampedValue / 100) * circumference;

    return (
      <div
        className={cn('relative inline-flex items-center justify-center', className)}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-surface-700"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={gradient ? '' : 'text-primary-500'}
            stroke={gradient ? 'url(#progressGradient)' : 'currentColor'}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
          {gradient && (
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          )}
        </svg>

        {showLabel && (
          <span className="absolute text-sm font-semibold text-white">
            {Math.round(clampedValue)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('w-full', className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {showLabel && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-400">Progress</span>
          <span className="font-medium text-white">{Math.round(clampedValue)}%</span>
        </div>
      )}

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-700">
        <motion.div
          className={cn(
            'h-full rounded-full',
            gradient
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-500'
              : 'bg-primary-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
