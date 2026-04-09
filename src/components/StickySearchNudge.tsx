/**
 * Sticky bottom nudge for mobile users who scroll past the search bar.
 * Appears after 3s of inactivity if the user hasn't searched.
 * @module components/StickySearchNudge
 */

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks';
import { useAnalytics } from '@/hooks';

const NUDGE_QUERY = 'budget board wipes under $5';
const DISMISS_KEY = 'offmeta_nudge_dismissed';

interface StickySearchNudgeProps {
  hasSearched: boolean;
  onTrySearch: (query: string) => void;
}

export function StickySearchNudge({
  hasSearched,
  onTrySearch,
}: StickySearchNudgeProps) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const { trackEvent } = useAnalytics();
  const impressionTracked = useRef(false);

  useEffect(() => {
    if (hasSearched || !isMobile) return;

    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // storage unavailable
    }

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [hasSearched, isMobile]);

  useEffect(() => {
    if (visible && !impressionTracked.current) {
      impressionTracked.current = true;
      trackEvent('nudge_impression', { query: NUDGE_QUERY });
    }
  }, [visible, trackEvent]);

  if (!visible || hasSearched) return null;

  const dismiss = () => {
    setVisible(false);
    trackEvent('nudge_dismiss', { query: NUDGE_QUERY });
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 safe-bottom animate-slide-up">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card shadow-lg p-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            trackEvent('nudge_click', { query: NUDGE_QUERY });
            onTrySearch(NUDGE_QUERY);
            dismiss();
          }}
          className="flex-1 flex items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="h-4 w-4 text-accent flex-shrink-0" aria-hidden="true" />
          <span>
            Try: <span className="font-medium text-foreground">{NUDGE_QUERY}</span>
          </span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismiss}
          className="h-8 w-8 p-0 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
