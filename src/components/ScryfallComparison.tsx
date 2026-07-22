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

import { ArrowRight, Search, Type } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

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
    intent: 'Budget alternatives to a staple',
    natural: 'budget alternatives to Rhystic Study',
    scryfall: 'o:"whenever an opponent casts" o:draw usd<5 -name:"Rhystic Study"',
  },
  {
    intent: 'Cards that punish a strategy',
    natural: 'cards that punish treasure decks',
    scryfall: 'o:treasure (o:sacrifice or o:destroy or o:exile or o:"can\'t")',
  },
  {
    intent: 'Functional similars to a card',
    natural: 'cards similar to Seedborn Muse',
    scryfall: 'o:"untap all" o:"during each" -name:"Seedborn Muse"',
  },
  {
    intent: 'Hidden gems by price ceiling',
    natural: 'hidden finishers under $5',
    scryfall: 'o:"win the game" or o:"lose the game" usd<5 f:commander',
  },
];

export function ScryfallComparison({ onTrySearch }: ScryfallComparisonProps) {
  const { t } = useTranslation();

  return (
    <section
      className="py-10 sm:py-14"
      aria-labelledby="scryfall-comparison-heading"
    >
      <div className="container-main">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium border border-border/60 bg-card/50 text-muted-foreground mb-3">
            {t(
              'compare.pill',
              'Scryfall power, without the syntax',
            )}
          </span>
          <h2
            id="scryfall-comparison-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground"
          >
            {t(
              'compare.heading',
              'What you would type in Scryfall vs. OffMeta',
            )}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {t(
              'compare.subheading',
              'Scryfall is the source of truth we search — but its query language rewards experts. OffMeta lets anyone ask the same questions in plain English, then shows the exact query it built.',
            )}
          </p>
        </div>

        <div className="grid gap-4 max-w-4xl mx-auto">
          {ROWS.map((row) => (
            <article key={row.natural} className="group">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-2 pl-1">
                {row.intent}
              </p>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                {/* Raw Scryfall column */}
                <div className="rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors group-hover:bg-card/60">
                  <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    <Type className="h-3 w-3" aria-hidden="true" />
                    {t('compare.rawLabel', 'Raw Scryfall')}
                  </div>
                  <code className="block font-mono text-xs sm:text-[13px] text-warning/90 leading-relaxed break-words">
                    {row.scryfall}
                  </code>
                </div>

                <div
                  className="hidden sm:flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    VS
                  </div>
                </div>

                {/* OffMeta column */}
                <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] transition-colors group-hover:border-accent/50 group-hover:bg-accent/10">
                  <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-widest text-accent">
                    <Search className="h-3 w-3" aria-hidden="true" />
                    {t('compare.offmetaLabel', 'OffMeta')}
                  </div>
                  <button
                    type="button"
                    onClick={() => onTrySearch?.(row.natural)}
                    disabled={!onTrySearch}
                    className="text-left w-full text-sm sm:text-[15px] text-foreground hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    aria-label={t('compare.tryQuery', 'Try this search').replace(
                      '{query}',
                      row.natural,
                    )}
                  >
                    &ldquo;{row.natural}&rdquo;
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>


        <p className="mt-6 text-center text-xs text-muted-foreground/80 max-w-xl mx-auto">
          {t(
            'compare.footnote',
            'Every result comes from Scryfall — the source of truth for card data. OffMeta only translates intent and adds discovery layers on top.',
          )}
        </p>
      </div>
    </section>
  );
}
