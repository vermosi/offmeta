/**
 * Copy link button — copies the current URL (including query and toolbar filters)
 * to the clipboard. Reconstructs the URL from the live filter state so the link
 * always reflects the latest filter choices, even before the debounced URL write
 * has flushed.
 */

import { useCallback } from 'react';
import { Link } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';
import { encodeFiltersToUrl } from '@/lib/search/search-state';
import type { FilterState } from '@/types/filters';

interface CopyLinkButtonProps {
  /** Live filter state from the toolbar — used to guarantee the URL includes all applied filters. */
  activeFilters?: FilterState | null;
}

export function CopyLinkButton({ activeFilters }: CopyLinkButtonProps) {
  const { t } = useTranslation();
  const { trackShareClicked } = useAnalytics();

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    encodeFiltersToUrl(params, activeFilters ?? null);

    const queryString = params.toString();
    return queryString
      ? `${window.location.origin}${window.location.pathname}?${queryString}`
      : `${window.location.origin}${window.location.pathname}`;
  }, [activeFilters]);

  const handleCopy = useCallback(async () => {
    const url = buildUrl();

    trackShareClicked({
      surface: 'search-toolbar',
      url,
    });

    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('copyLink.copied', 'Link copied!'), {
        description: t('copyLink.copiedDesc', 'Share it anywhere.'),
      });
    } catch {
      toast.error(t('copyLink.copyFailed', 'Could not copy link'));
    }
  }, [buildUrl, t, trackShareClicked]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      aria-label={t('copyLink.label', 'Copy link to this search')}
    >
      <Link className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t('copyLink.button', 'Copy link')}</span>
    </button>
  );
}
