/**
 * Collapsible disclosure that hides the generated Scryfall query behind a
 * subtle inline toggle on the results page. Collapsed state renders as a
 * quiet, textual affordance (not a boxed row) so it disappears into the
 * surrounding meta-header until the user asks for it.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/core/utils';

const STORAGE_KEY = 'offmeta_scryfall_disclosure_open';

interface ScryfallQueryDisclosureProps {
  scryfallQuery: string;
  metaLabel?: string;
  children: ReactNode;
}

export function ScryfallQueryDisclosure({
  scryfallQuery,
  metaLabel,
  children,
}: ScryfallQueryDisclosureProps) {
  const { t } = useTranslation();

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  }, [open]);

  const handleToggle = () => setOpen((prev) => !prev);

  const preview =
    scryfallQuery.length > 72
      ? `${scryfallQuery.slice(0, 72).trim()}…`
      : scryfallQuery;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-background/80 via-background/65 to-background/80 transition-colors shadow-sm',
        'hover:border-border',
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls="scryfall-query-panel"
        className={cn(
          'group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors sm:px-3.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <Code2
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        {!open && scryfallQuery ? (
          <>
            <code className="min-w-0 truncate font-mono text-[11px] text-foreground">
              <span className="text-muted-foreground">q:</span> {preview}
            </code>
            {metaLabel && (
              <span className="ml-1.5 shrink-0 rounded-full border border-accent/20 bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent">
                {metaLabel}
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] font-medium text-muted-foreground">
            {t('search.scryfallQuery.label', 'Scryfall query')}
          </span>
        )}
        <ChevronDown
          className={cn(
            'ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id="scryfall-query-panel"
          className="border-t border-border/60 bg-background/70 p-2.5 sm:p-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}
