/**
 * Reusable bento tile wrapper for the redesigned CardModal.
 * Provides a frosted glass card surface with optional title, icon, and accent.
 * @module components/CardModal/CardModalBentoTile
 */

import { cn } from '@/lib/core/utils';
import type { LucideIcon } from 'lucide-react';

export interface CardModalBentoTileProps {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  accent?: 'default' | 'primary' | 'accent' | 'warning' | 'success';
}

export function CardModalBentoTile({
  title,
  icon: Icon,
  children,
  className,
  contentClassName,
  accent = 'default',
}: CardModalBentoTileProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl shadow-sm',
        'overflow-hidden flex flex-col',
        className,
      )}
    >
      {title && (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/30',
            accent === 'primary' && 'border-primary/20 bg-primary/5',
            accent === 'accent' && 'border-accent/20 bg-accent/5',
            accent === 'warning' && 'border-warning/20 bg-warning/5',
            accent === 'success' && 'border-success/20 bg-success/5',
          )}
        >
          {Icon && (
            <Icon
              className={cn(
                'h-4 w-4 text-muted-foreground',
                accent === 'primary' && 'text-primary',
                accent === 'accent' && 'text-accent',
                accent === 'warning' && 'text-warning',
                accent === 'success' && 'text-success',
              )}
            />
          )}
          <h3
            className={cn(
              'text-xs font-semibold uppercase tracking-wider font-display',
              accent === 'primary' && 'text-primary',
              accent === 'accent' && 'text-accent',
              accent === 'warning' && 'text-warning',
              accent === 'success' && 'text-success',
            )}
          >
            {title}
          </h3>
        </div>
      )}
      <div className={cn('p-4 flex-1 min-h-0', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
