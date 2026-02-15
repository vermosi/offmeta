/**
 * Shared Logo SVG component used in Header and Footer.
 */

import { cn } from '@/lib/core/utils';

interface LogoProps {
  className?: string;
  /** Use gradient fill (Header) vs currentColor (Footer) */
  variant?: 'gradient' | 'mono';
}

export function Logo({ className, variant = 'gradient' }: LogoProps) {
  const id = variant === 'gradient' ? 'logoGradientShared' : undefined;

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-7 w-7', className)}
      aria-hidden="true"
    >
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(300, 90%, 60%)" />
            <stop offset="100%" stopColor="hsl(195, 95%, 55%)" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M16 2L30 16L16 30L2 16L16 2Z"
        fill={variant === 'gradient' ? `url(#${id})` : 'currentColor'}
        opacity="0.15"
      />
      <path
        d="M16 2L30 16L16 30L2 16L16 2Z"
        stroke={variant === 'gradient' ? `url(#${id})` : 'currentColor'}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z"
        stroke={variant === 'gradient' ? `url(#${id})` : 'currentColor'}
        strokeWidth="1.25"
        fill="none"
      />
      <circle
        cx="16"
        cy="16"
        r="2"
        fill={variant === 'gradient' ? `url(#${id})` : 'currentColor'}
      />
    </svg>
  );
}
