/**
 * Aggregates the current result set into a few high-signal facets.
 * The strip summarizes the most common card types and colors in the displayed
 * results and turns those into one-click query refinements.
 */

import { useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';

type FacetKind = 'type' | 'color';

interface FacetChip {
  key: string;
  label: string;
  token: string;
  count: number;
  kind: FacetKind;
}

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};

const TYPE_LABELS: Record<string, string> = {
  creature: 'Creatures',
  instant: 'Instants',
  sorcery: 'Sorceries',
  artifact: 'Artifacts',
  enchantment: 'Enchantments',
  planeswalker: 'Planeswalkers',
  land: 'Lands',
  battle: 'Battles',
};

const TYPE_TOKENS: Record<string, string> = {
  creature: 't:creature',
  instant: 't:instant',
  sorcery: 't:sorcery',
  artifact: 't:artifact',
  enchantment: 't:enchantment',
  planeswalker: 't:planeswalker',
  land: 't:land',
  battle: 't:battle',
};

interface ResultFacetAggregationStripProps {
  cards: ScryfallCard[];
  searchQuery: string;
  onRefine: (query: string) => void;
  maxChips?: number;
}

function hasToken(query: string, token: string): boolean {
  const normalized = query.toLowerCase();
  return normalized.split(/\s+/).some((part) => part === token.toLowerCase());
}

function collectFacets(cards: ScryfallCard[]): FacetChip[] {
  const counts = new Map<string, FacetChip>();
  const sample = cards.slice(0, 40);

  for (const card of sample) {
    const typeLine = (card.type_line || '').toLowerCase();
    for (const [type, token] of Object.entries(TYPE_TOKENS)) {
      if (!typeLine.includes(type)) continue;
      const existing = counts.get(token);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(token, {
          key: token,
          label: TYPE_LABELS[type] ?? type,
          token,
          count: 1,
          kind: 'type',
        });
      }
    }

    const colors = Array.from(
      new Set(card.color_identity ?? card.colors ?? []),
    );
    for (const color of colors) {
      const token = `c:${color.toLowerCase()}`;
      const existing = counts.get(token);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(token, {
          key: token,
          label: COLOR_NAMES[color] ?? color,
          token,
          count: 1,
          kind: 'color',
        });
      }
    }
  }

  return Array.from(counts.values())
    .filter((facet) => facet.count >= 2)
    .sort((a, b) => b.count - a.count);
}

export function ResultFacetAggregationStrip({
  cards,
  searchQuery,
  onRefine,
  maxChips = 6,
}: ResultFacetAggregationStripProps) {
  const { t } = useTranslation();

  const chips = useMemo(() => {
    return collectFacets(cards)
      .filter((facet) => !hasToken(searchQuery, facet.token))
      .slice(0, maxChips);
  }, [cards, searchQuery, maxChips]);

  const summary = useMemo(() => {
    if (chips.length === 0) return null;
    const labels = chips.slice(0, 2).map((chip) => chip.label.toLowerCase());
    if (labels.length === 1) {
      return t('results.facetSummarySingle', 'Mostly {label} cards').replace(
        '{label}',
        labels[0],
      );
    }
    return t('results.facetSummaryMulti', 'Mostly {first} and {second} cards')
      .replace('{first}', labels[0])
      .replace('{second}', labels[1]);
  }, [chips, t]);

  if (chips.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          {t('results.facetAggregation', 'Popular facets in this result set')}
        </span>
      </div>
      {summary && <p className="mb-3 text-sm text-foreground/80">{summary}</p>}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Button
            key={chip.key}
            type="button"
            size="sm"
            variant="outline"
            className="h-8 min-h-[36px] rounded-full px-3 text-xs"
            onClick={() => onRefine(chip.token)}
            title={`${chip.kind}: ${chip.label}`}
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
