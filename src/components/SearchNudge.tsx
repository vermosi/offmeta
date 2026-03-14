/**
 * Floating nudge that appears after idle time for users who haven't searched.
 * Gently encourages first-time visitors to try the search bar.
 * Auto-dismisses after interaction or on search.
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

const NUDGE_DELAY_MS = 8000;
const NUDGE_STORAGE_KEY = 'offmeta_search_nudge_dismissed';

interface SearchNudgeProps {
  hasSearched: boolean;
  onTrySearch: (query: string) => void;
}

const NUDGE_EXAMPLES = [
  'creatures that make treasure',
  'board wipes under $5',
  'green ramp spells',
];

export function SearchNudge({ hasSearched, onTrySearch }: SearchNudgeProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already searched, dismissed, or previously dismissed
    if (hasSearched || dismissed) return;
    try {
      if (sessionStorage.getItem(NUDGE_STORAGE_KEY)) return;
    } catch { /* continue */ }

    const timer = setTimeout(() => setVisible(true), NUDGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasSearched, dismissed]);

  // Auto-hide when user searches — derive from hasSearched instead of effect
  const effectiveVisible = visible && !hasSearched;

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    try { sessionStorage.setItem(NUDGE_STORAGE_KEY, '1'); } catch { /* ok */ }
  }, []);

  const handleTry = useCallback(() => {
    const example = NUDGE_EXAMPLES[Math.floor(Math.random() * NUDGE_EXAMPLES.length)];
    onTrySearch(example);
    handleDismiss();
  }, [onTrySearch, handleDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-[calc(100vw-2rem)] max-w-sm"
      role="complementary"
      aria-label={t('searchNudge.label', 'Search suggestion')}
    >
      <div className="relative bg-card border border-accent/30 rounded-xl shadow-2xl p-4 space-y-3">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label={t('a11y.close', 'Close')}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-6">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-accent/10 text-accent flex-shrink-0">
            <Search className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t('searchNudge.title', 'Try searching in plain English')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('searchNudge.description', 'Type what you\'re looking for — like "board wipes under $5" — and we\'ll find the cards.')}
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button
          variant="accent"
          size="sm"
          onClick={handleTry}
          className="w-full gap-2 text-xs h-9"
        >
          <Search className="h-3.5 w-3.5" />
          {t('searchNudge.cta', 'Try an example search')}
        </Button>
      </div>
    </div>
  );
}
