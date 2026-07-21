/**
 * Related searches — always-visible follow-up suggestions derived from the
 * user's current query, parsed intent, and the top result. Six to ten
 * diverse chips that pipe a refined query back into search on click.
 */

import { useMemo } from 'react';
import { Compass, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { SearchIntent } from '@/types/search';
import type { ScryfallCard } from '@/types/card';

interface RelatedSearchesSectionProps {
  originalQuery: string;
  intent: SearchIntent | null;
  topCard?: ScryfallCard | null;
  onRefine: (query: string) => void;
}

const COLOR_NAMES: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
};

const MIN = 6;
const MAX = 10;

interface Suggestion {
  label: string;
  query: string;
  reason: string;
}

function buildSuggestions(
  originalQuery: string,
  intent: SearchIntent | null,
  topCard?: ScryfallCard | null,
): Suggestion[] {
  const q = originalQuery.trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const out: Suggestion[] = [];
  const push = (s: Suggestion) => {
    const norm = s.query.replace(/\s+/g, ' ').trim();
    if (!norm || norm.toLowerCase() === lower) return;
    if (out.some((x) => x.query.toLowerCase() === norm.toLowerCase())) return;
    out.push({ ...s, query: norm });
  };

  const hasBudget = /(budget|cheap|under\s*\$?\d|<\s*\$?\d)/i.test(lower);
  if (!hasBudget) {
    push({ label: `budget ${q}`, query: `budget ${q}`, reason: 'budget' });
    push({ label: `${q} under $5`, query: `${q} under $5`, reason: 'price' });
  }

  const colorValues = intent?.colors?.values ?? [];
  const hasColor =
    colorValues.length > 0 ||
    /\b(mono|white|blue|black|red|green|colorless|azorius|dimir|rakdos|gruul|selesnya|orzhov|izzet|golgari|boros|simic)\b/i.test(
      lower,
    );
  if (!hasColor) {
    push({ label: `mono blue ${q}`, query: `mono blue ${q}`, reason: 'color' });
    push({ label: `mono green ${q}`, query: `mono green ${q}`, reason: 'color' });
    push({ label: `mono black ${q}`, query: `mono black ${q}`, reason: 'color' });
  } else if (colorValues.length === 1) {
    const source = COLOR_NAMES[colorValues[0]];
    for (const other of ['W', 'U', 'B', 'R', 'G']) {
      if (other === colorValues[0]) continue;
      const otherName = COLOR_NAMES[other];
      const rewritten = source
        ? q.replace(new RegExp(`\\b${source}\\b`, 'i'), otherName)
        : `mono ${otherName} ${q}`;
      push({ label: rewritten, query: rewritten, reason: 'color-swap' });
    }
  }

  if (!/\bcommander|edh\b/i.test(lower)) {
    push({ label: `${q} for commander`, query: `${q} for commander`, reason: 'format' });
  }
  if (!/\bmodern\b/i.test(lower)) {
    push({ label: `${q} in modern`, query: `${q} in modern`, reason: 'format' });
  }
  if (!/\bpioneer\b/i.test(lower)) {
    push({ label: `${q} in pioneer`, query: `${q} in pioneer`, reason: 'format' });
  }

  const types = intent?.types ?? [];
  if (types.length > 0 && !/\b(similar|like)\b/i.test(lower)) {
    push({
      label: `best ${types[0]}s ${new Date().getFullYear()}`,
      query: `best ${types[0]}s ${new Date().getFullYear()}`,
      reason: 'ranked',
    });
  }

  const cmc = intent?.cmc;
  if (!cmc && !/\bcmc|mana value|mv\b/i.test(lower)) {
    push({ label: `${q} 2 mana or less`, query: `${q} 2 mana or less`, reason: 'cmc' });
  }


  if (topCard?.name && !/\b(similar|like)\b/i.test(lower)) {
    push({
      label: `similar to ${topCard.name}`,
      query: `similar to ${topCard.name}`,
      reason: 'similar-top',
    });
    push({
      label: `cards played with ${topCard.name}`,
      query: `cards played with ${topCard.name}`,
      reason: 'played-with',
    });
  }

  // Ensure we always have at least MIN by adding generic broaden/narrow variants.
  if (out.length < MIN) {
    push({ label: `${q} rare`, query: `${q} rare`, reason: 'rarity' });
    push({ label: `${q} legendary`, query: `${q} legendary`, reason: 'legendary' });
    push({ label: `${q} instants`, query: `${q} instants`, reason: 'type' });
  }

  return out.slice(0, MAX);
}

export function RelatedSearchesSection({
  originalQuery,
  intent,
  topCard,
  onRefine,
}: RelatedSearchesSectionProps) {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const suggestions = useMemo(
    () => buildSuggestions(originalQuery, intent, topCard),
    [originalQuery, intent, topCard],
  );

  if (suggestions.length < MIN) return null;

  const handleClick = (s: Suggestion) => {
    trackEvent('related_searches_clicked', {
      query: originalQuery,
      suggestion_query: s.query,
      reason: s.reason,
    });
    onRefine(s.query);
  };

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4 animate-reveal"
      aria-label={t('results.relatedSearches.ariaLabel', 'Related searches')}
    >
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          {t('results.relatedSearches.title', 'Related searches')}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t('results.relatedSearches.subtitle', 'One-click refine')}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.query}
            type="button"
            onClick={() => handleClick(s)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
          >
            <span className="truncate max-w-[240px]">{s.label}</span>
            <ArrowRight className="h-3 w-3 opacity-60 shrink-0" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
