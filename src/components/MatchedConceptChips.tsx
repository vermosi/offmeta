/**
 * "Narrow by matched concept" — aggregates the top match reasons across the
 * currently displayed cards and surfaces them as one-click filter chips.
 * Clicking a chip appends the underlying Scryfall token (e.g. `t:creature`,
 * `otag:treasure`, `mv<=2`) to the active query, narrowing the result set.
 * @module components/MatchedConceptChips
 */

import { useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';
import { explainCardMatch, type MatchReason } from '@/lib/search/matchExplanation';
import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';

interface MatchedConceptChipsProps {
  cards: ScryfallCard[];
  intent: SearchIntent | null | undefined;
  searchQuery: string;
  originalQuery: string;
  onRefine: (token: string, label: string) => void;
  /** Max chips to render (default 8). */
  limit?: number;
  /** Max cards sampled for aggregation (default 40 for perf). */
  sampleSize?: number;
}

interface AggregatedChip {
  token: string;
  label: string;
  count: number;
}

function aggregateReasons(
  cards: ScryfallCard[],
  intent: SearchIntent | null | undefined,
  sampleSize: number,
): AggregatedChip[] {
  if (!intent || cards.length === 0) return [];
  const counts = new Map<string, AggregatedChip>();
  const sample = cards.slice(0, sampleSize);
  for (const card of sample) {
    const reasons: MatchReason[] = explainCardMatch(card, intent);
    const seenInCard = new Set<string>();
    for (const r of reasons) {
      if (!r.token) continue;
      // Split composite tokens (e.g. "t:creature t:artifact") into atoms
      const atoms = r.token.split(/\s+/).filter(Boolean);
      for (const atom of atoms) {
        if (seenInCard.has(atom)) continue;
        seenInCard.add(atom);
        const existing = counts.get(atom);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(atom, { token: atom, label: labelForToken(atom, r.label), count: 1 });
        }
      }
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

/**
 * Produce a compact human-readable label for a single atomic Scryfall token,
 * falling back to the source MatchReason label when we can't parse it.
 */
function labelForToken(token: string, fallback: string): string {
  const lower = token.toLowerCase();
  if (lower.startsWith('t:')) return `Type: ${stripQuotes(token.slice(2))}`;
  if (lower.startsWith('otag:')) return `Concept: ${stripQuotes(token.slice(5))}`;
  if (lower.startsWith('o:')) {
    const v = stripQuotes(token.slice(2));
    const trimmed = v.length > 24 ? `${v.slice(0, 22)}…` : v;
    return `Text: "${trimmed}"`;
  }
  if (lower.startsWith('ci:')) return `Color identity: ${token.slice(3).toUpperCase()}`;
  if (lower.startsWith('c:')) return `Color: ${token.slice(2).toUpperCase()}`;
  if (lower.startsWith('mv')) return `Mana value ${token.slice(2)}`;
  if (lower.startsWith('pow')) return `Power ${token.slice(3)}`;
  if (lower.startsWith('tou')) return `Toughness ${token.slice(3)}`;
  return fallback;
}

function stripQuotes(s: string): string {
  return s.replace(/^"|"$/g, '');
}

function tokenAlreadyInQuery(query: string, token: string): boolean {
  const q = query.toLowerCase();
  return q.split(/\s+/).some((t) => t === token.toLowerCase());
}

export function MatchedConceptChips({
  cards,
  intent,
  searchQuery,
  originalQuery,
  onRefine,
  limit = 8,
  sampleSize = 40,
}: MatchedConceptChipsProps) {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const chips = useMemo(() => {
    const aggregated = aggregateReasons(cards, intent, sampleSize);
    // Filter out chips already active in the query, plus singletons that
    // wouldn't meaningfully narrow the set.
    return aggregated
      .filter((c) => !tokenAlreadyInQuery(searchQuery, c.token))
      .filter((c) => c.count >= 2 || cards.length < 4)
      .slice(0, limit);
  }, [cards, intent, searchQuery, sampleSize, limit]);

  if (chips.length === 0) return null;

  return (
    <section
      aria-label={t('search.narrowByConcept', 'Narrow by matched concept')}
      className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-xl p-3 sm:p-4"
    >
      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t('search.narrowByConcept', 'Narrow by matched concept')}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <Button
            key={chip.token}
            type="button"
            size="sm"
            variant="outline"
            className="h-8 min-h-[36px] rounded-full text-xs px-3 hover:bg-primary/10 hover:border-primary/40 transition-colors"
            onClick={() => {
              trackEvent('matched_concept_chip_clicked', {
                query: originalQuery,
                scryfall_query: searchQuery,
                token: chip.token,
                label: chip.label,
                count: chip.count,
              });
              onRefine(chip.token, chip.label);
            }}
            aria-label={t('search.narrowByConceptChip', 'Narrow results by {label} ({count} matches)')
              .replace('{label}', chip.label)
              .replace('{count}', String(chip.count))}
          >
            <span>{chip.label}</span>
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {chip.count}
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
