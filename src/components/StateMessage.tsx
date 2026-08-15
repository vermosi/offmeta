/**
 * Shared empty / error state panel used by result-bearing pages.
 * Renders an icon, a title, an optional detail line, optional hints and actions.
 * @module StateMessage
 */

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type StateMessageTone = 'empty' | 'error';

export interface StateMessageAction {
  /** Button label. */
  label: string;
  /** Click handler; omit when `href` is provided. */
  onClick?: () => void;
  /** Internal or external link target. */
  href?: string;
  /** Visual weight of the action. */
  variant?: 'default' | 'outline';
}

export interface StateMessageProps {
  tone?: StateMessageTone;
  icon: LucideIcon;
  title: string;
  /** Short explanation of what happened. */
  description?: string;
  /** Raw technical detail (error text) shown in mono, small. */
  detail?: string;
  /** Suggested next steps. */
  hints?: string[];
  actions?: StateMessageAction[];
  className?: string;
}

/**
 * Renders a consistent empty or error panel.
 */
export function StateMessage({
  tone = 'empty',
  icon: Icon,
  title,
  description,
  detail,
  hints,
  actions,
  className = '',
}: StateMessageProps) {
  const isError = tone === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`border p-6 sm:p-8 ${
        isError
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-border/60 bg-muted/20'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={`mt-0.5 h-5 w-5 shrink-0 ${
            isError ? 'text-destructive' : 'text-muted-foreground'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`font-display text-lg font-bold uppercase leading-tight tracking-tight ${
              isError ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {title}
          </p>

          {description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          {detail && (
            <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-muted-foreground/80">
              {detail}
            </p>
          )}

          {hints && hints.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {hints.map((hint) => (
                <li
                  key={hint}
                  className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <span aria-hidden="true" className="text-muted-foreground/50">
                    —
                  </span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          )}

          {actions && actions.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {actions.map((action) =>
                action.href ? (
                  <Button
                    key={action.label}
                    asChild
                    size="sm"
                    variant={action.variant ?? 'outline'}
                    className="rounded-none"
                  >
                    <a href={action.href}>{action.label}</a>
                  </Button>
                ) : (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant ?? 'outline'}
                    className="rounded-none"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StateMessage;
