/**
 * Post-results action bar: share the current query, jump to similar cards,
 * or reveal related search suggestions derived from the current intent.
 */

import { useCallback, useMemo, useState } from 'react';
import { Share2, Sparkles, Compass, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { SearchIntent } from '@/types/search';

interface SearchNextStepsBarProps {
  originalQuery: string;
  intent: SearchIntent | null;
  totalCards: number;
  onJumpToSimilar: () => void;
  onRelatedSearchClick: (query: string) => void;
}

const COLOR_NAMES: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
};

function buildRelatedSearches(
  originalQuery: string,
  intent: SearchIntent | null,
): string[] {
  const q = originalQuery.trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const suggestions: string[] = [];

  const hasBudgetHint = /(budget|cheap|under\s*\$?\d|<\s*\$?\d)/i.test(lower);
  if (!hasBudgetHint) {
    suggestions.push(`budget ${q}`);
  }

  const colorValues = intent?.colors?.values ?? [];
  if (colorValues.length === 0 && !/\b(mono|white|blue|black|red|green|colorless|azorius|dimir|rakdos|gruul|selesnya)\b/i.test(lower)) {
    suggestions.push(`mono blue ${q}`);
    suggestions.push(`mono green ${q}`);
  } else if (colorValues.length === 1) {
    const other = colorValues[0] === 'W' ? 'B' : 'W';
    suggestions.push(
      `${q.replace(new RegExp(`\\b${COLOR_NAMES[colorValues[0]] ?? ''}\\b`, 'i'), COLOR_NAMES[other])} `.trim() ||
        `mono ${COLOR_NAMES[other]} ${q}`,
    );
  }

  if (!/\bcommander|edh\b/i.test(lower)) {
    suggestions.push(`${q} for commander`);
  }

  if (!/\b(under|<|\$)\b/i.test(lower)) {
    suggestions.push(`${q} under $5`);
  }

  const types = intent?.types ?? [];
  if (types.length > 0 && !/\b(similar|like)\b/i.test(lower)) {
    suggestions.push(`best ${types[0]}s ${new Date().getFullYear()}`);
  }

  // Deduplicate + cap length
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of suggestions) {
    const normalized = s.replace(/\s+/g, ' ').trim();
    if (!normalized || normalized.toLowerCase() === lower) continue;
    if (seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    out.push(normalized);
    if (out.length >= 5) break;
  }
  return out;
}

export function SearchNextStepsBar({
  originalQuery,
  intent,
  totalCards,
  onJumpToSimilar,
  onRelatedSearchClick,
}: SearchNextStepsBarProps) {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const [showRelated, setShowRelated] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  const related = useMemo(
    () => buildRelatedSearches(originalQuery, intent),
    [originalQuery, intent],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    trackEvent('share_clicked', {
      query: originalQuery,
      surface: 'next_steps_bar',
    });
    const shareData = {
      title: `OffMeta — ${originalQuery}`,
      text: t(
        'results.nextSteps.shareText',
        'Check out these Magic cards on OffMeta',
      ),
      url: shareUrl,
    };
    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // Fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setJustCopied(true);
      toast.success(t('results.nextSteps.linkCopied', 'Search link copied'));
      window.setTimeout(() => setJustCopied(false), 2000);
    } catch {
      toast.error(t('results.nextSteps.copyFailed', 'Could not copy link'));
    }
  }, [shareUrl, originalQuery, trackEvent, t]);

  const handleJumpToSimilar = useCallback(() => {
    trackEvent('next_steps_jump_similar', {
      query: originalQuery,
      results_count: totalCards,
    });
    onJumpToSimilar();
  }, [onJumpToSimilar, originalQuery, totalCards, trackEvent]);

  const handleToggleRelated = useCallback(() => {
    setShowRelated((prev) => {
      const next = !prev;
      if (next) {
        trackEvent('next_steps_related_shown', {
          query: originalQuery,
          suggestion_count: related.length,
        });
      }
      return next;
    });
  }, [originalQuery, related.length, trackEvent]);

  const handleRelated = useCallback(
    (suggestion: string) => {
      trackEvent('next_steps_related_clicked', {
        query: originalQuery,
        suggestion_query: suggestion,
      });
      onRelatedSearchClick(suggestion);
    },
    [onRelatedSearchClick, originalQuery, trackEvent],
  );

  if (!originalQuery.trim()) return null;

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4 animate-reveal"
      aria-label={t('results.nextSteps.ariaLabel', 'Next steps')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          {justCopied ? (
            <Check className="h-4 w-4 text-accent" aria-hidden="true" />
          ) : (
            <Share2 className="h-4 w-4 text-accent" aria-hidden="true" />
          )}
          <span>
            {justCopied
              ? t('results.nextSteps.copied', 'Copied')
              : t('results.nextSteps.share', 'Share query')}
          </span>
        </button>

        <button
          type="button"
          onClick={handleJumpToSimilar}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
          <span>
            {t('results.nextSteps.jumpSimilar', 'Jump to similar')}
          </span>
        </button>

        <button
          type="button"
          onClick={handleToggleRelated}
          disabled={related.length === 0}
          aria-expanded={showRelated}
          aria-controls="next-steps-related-list"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Compass className="h-4 w-4 text-accent" aria-hidden="true" />
          <span>
            {t('results.nextSteps.relatedSearches', 'Related searches')}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showRelated ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {showRelated && related.length > 0 && (
        <div
          id="next-steps-related-list"
          className="mt-3 flex flex-wrap gap-2"
        >
          {related.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleRelated(suggestion)}
              className="inline-flex min-h-8 items-center rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
