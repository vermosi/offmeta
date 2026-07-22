/**
 * Collapsible disclosure that hides the generated Scryfall query behind a
 * subtle inline toggle on the results page. Collapsed state renders as a
 * quiet, textual affordance (not a boxed row) so it disappears into the
 * surrounding meta-header until the user asks for it.
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
    <div className={cn(open && 'rounded-lg border border-border/60 bg-card/40')}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls="scryfall-query-panel"
        className={cn(
          'group inline-flex max-w-full items-center gap-1.5 text-left transition-colors rounded',
          'text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          open ? 'w-full px-3 py-2' : 'py-0.5',
        )}
      >
        <Code2 className="h-3 w-3 shrink-0" aria-hidden="true" />
        {!open && scryfallQuery ? (
          <code className="min-w-0 truncate font-mono text-[11px] text-foreground/70 group-hover:text-foreground/90">
            {preview}
          </code>
        ) : (
          <span className="text-[11px] font-medium">
            {t('search.scryfallQuery.label', 'Scryfall query')}
          </span>
        )}
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id="scryfall-query-panel" className="border-t border-border/60 p-2 sm:p-3">
          {children}
        </div>
      )}
    </div>
  );
}
