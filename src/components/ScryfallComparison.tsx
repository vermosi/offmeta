/**
 * ScryfallComparison — homepage section that explains, with evidence,
 * how OffMeta differs from writing raw Scryfall syntax.
 *
 * Non-buzzy: every row shows a real plain-English query and the actual
 * Scryfall syntax a player would otherwise have to write by hand. All
 * example queries are wired to the search box via `onTrySearch`.
 *
 * Kept intentionally static and small — no data fetching, no animation
 * stacks. See docs/product-audit.md (PR2) for scope rationale.
 */

import { useTranslation } from '@/lib/i18n';
import { MTG_COPY } from '@/lib/i18n/copy';

interface ScryfallComparisonProps {
  onTrySearch?: (query: string) => void;
}

interface ComparisonRow {
  intent: string;
  natural: string;
  scryfall: string;
}

// Every example must run successfully today. Scryfall syntax hand-authored
// against the current Scryfall grammar (verified via Scryfall docs).
const ROWS: ReadonlyArray<ComparisonRow> = [
  {
    intent: 'Budget board wipes',
    natural: 'budget board wipes under $5',
    scryfall: 't:sorcery o:destroy usd<5',
  },
  {
    intent: 'Cards that punish a strategy',
    natural: 'cards that punish treasure decks',
    scryfall: 'o:treasure (o:sacrifice or o:destroy or o:exile)',
  },
  {
    intent: 'Cards similar to a known staple',
    natural: 'cards similar to Seedborn Muse',
    scryfall: 'o:"untap all" o:"during each" -name:"Seedborn Muse"',
  },
  {
    intent: 'Commander card draw',
    natural: 'mono-white card draw for Commander',
    scryfall: 'c:w o:draw f:commander',
  },
];

export function ScryfallComparison({ onTrySearch }: ScryfallComparisonProps) {
  const { t } = useTranslation();

  return (
    <section
      className="border-t border-border/50 py-10 sm:py-14"
      aria-labelledby="scryfall-comparison-heading"
    >
      <div className="container-main">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-muted-foreground sm:text-[11px]">
          {t('compare.pill', MTG_COPY.comparisonPill)}
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-end">
          <h2
            id="scryfall-comparison-heading"
            className="font-display text-2xl font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-3xl lg:col-span-6"
          >
            {t('compare.heading', MTG_COPY.comparisonHeading)}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground lg:col-span-6">
            {t('compare.subheading', MTG_COPY.comparisonSubheading)}
          </p>
        </div>

        <div className="mt-8 border-t border-border/50">
          {ROWS.map((row) => (
            <article
              key={row.natural}
              className="grid gap-2 border-b border-border/50 py-5 sm:grid-cols-12 sm:items-baseline sm:gap-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70 sm:col-span-3">
                {row.intent}
              </p>
              <code className="block break-words font-mono text-xs leading-relaxed text-muted-foreground sm:col-span-5">
                {row.scryfall}
              </code>
              <button
                type="button"
                onClick={() => onTrySearch?.(row.natural)}
                disabled={!onTrySearch}
                className="text-left text-sm text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-4"
                aria-label={t('compare.tryQuery', 'Try this search').replace(
                  '{query}',
                  row.natural,
                )}
              >
                {row.natural} →
              </button>
            </article>
          ))}
        </div>

        <p className="mt-6 max-w-xl text-xs leading-relaxed text-muted-foreground/80">
          {t(
            'compare.footnote',
            'Every result comes from Scryfall — the source of truth for card data. OffMeta only translates intent and adds discovery layers on top.',
          )}
        </p>
      </div>
    </section>
  );
}
