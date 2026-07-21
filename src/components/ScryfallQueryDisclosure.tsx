/**
 * Collapsible disclosure that hides the generated Scryfall query behind a
 * visible toggle on the results page. Users click "Show Scryfall query" to
 * reveal the underlying compiled query and its editor controls.
 *
 * Toggle state is persisted to localStorage so returning users keep their
 * preference across searches.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'offmeta_scryfall_disclosure_open';

interface ScryfallQueryDisclosureProps {
  scryfallQuery: string;
  children: ReactNode;
}

export function ScryfallQueryDisclosure({
  scryfallQuery,
  children,
}: ScryfallQueryDisclosureProps) {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      trackEvent('scryfall_query_disclosure_toggle', {
        open: next,
        query_length: scryfallQuery.length,
      });
      return next;
    });
  };

  const preview =
    scryfallQuery.length > 64
      ? `${scryfallQuery.slice(0, 64).trim()}…`
      : scryfallQuery;

  return (
    <div className="rounded-lg border border-border/70 bg-card/60">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls="scryfall-query-panel"
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
          'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        )}
      >
        <Code2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('search.scryfallQuery.label', 'Scryfall query')}
        </span>
        {!open && scryfallQuery && (
          <code className="min-w-0 flex-1 truncate rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
            {preview}
          </code>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          {open
            ? t('search.scryfallQuery.hide', 'Hide')
            : t('search.scryfallQuery.show', 'Show')}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </span>
      </button>
      {open && (
        <div id="scryfall-query-panel" className="border-t border-border/70 p-2 sm:p-3">
          {children}
        </div>
      )}
    </div>
  );
}
