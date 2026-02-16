/**
 * "Staples For" quick lookup section on the home page.
 * Pre-built archetype chips that run curated searches.
 */

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { ManaSymbol } from '@/components/ManaSymbol';
import { useTranslation } from '@/lib/i18n';

interface StaplesSectionProps {
  onSearch: (query: string) => void;
}

const STAPLES = [
  { label: 'Mono-Red Aggro', query: 'cheap red creatures with power 2 or more', colors: ['R'] },
  { label: 'Simic Ramp', query: 'simic ramp spells', colors: ['G', 'U'] },
  { label: 'Orzhov Aristocrats', query: 'white black sacrifice payoffs', colors: ['W', 'B'] },
  { label: 'Izzet Spellslinger', query: 'blue red spellslinger payoffs', colors: ['U', 'R'] },
  { label: 'Golgari Graveyard', query: 'black green graveyard recursion', colors: ['B', 'G'] },
  { label: 'Selesnya Tokens', query: 'selesnya cards that create tokens', colors: ['G', 'W'] },
  { label: 'Dimir Control', query: 'blue black removal spells', colors: ['U', 'B'] },
  { label: 'Boros Equipment', query: 'equipment that cares about equipped creature', colors: ['R', 'W'] },
  { label: 'Gruul Stompy', query: 'red green big creatures with trample', colors: ['R', 'G'] },
  { label: 'Azorius Flickers', query: 'azorius creatures with enters the battlefield abilities', colors: ['W', 'U'] },
  { label: 'Mono-Black Devotion', query: 'black permanents with three or more black pips in mana cost', colors: ['B'] },
  { label: 'Mono-Green Elves', query: 'green elf creatures', colors: ['G'] },
  { label: 'Temur Landfall', query: 'temur creatures with landfall abilities', colors: ['G', 'U', 'R'] },
  { label: 'Rakdos Sacrifice', query: 'rakdos sacrifice payoffs', colors: ['B', 'R'] },
  { label: 'Dimir Mill', query: 'dimir mill spells', colors: ['U', 'B'] },
  { label: 'Mono-White Lifegain', query: 'white cards that gain life', colors: ['W'] },
  { label: 'Golgari Counters', query: 'golgari creatures with +1/+1 counters', colors: ['B', 'G'] },
  { label: 'Boros Burn', query: 'boros instant and sorcery burn spells', colors: ['R', 'W'] },
] as const;

export const StaplesSection = memo(function StaplesSection({
  onSearch,
}: StaplesSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { t } = useTranslation();

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <section className="w-full max-w-2xl mx-auto overflow-hidden" aria-labelledby="staples-heading">
      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 id="staples-heading" className="text-sm font-semibold text-foreground">
              {t('staples.heading')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('staples.subtitle')}
            </p>
          </div>
        </div>

        {/* Mobile: 2-column grid */}
        <div className="grid grid-cols-2 gap-1.5 sm:hidden">
          {STAPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => onSearch(s.query)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 text-xs font-medium text-foreground hover:bg-muted/60 hover:border-border transition-colors whitespace-nowrap"
              title={`Search: ${s.query}`}
            >
              <span className="inline-flex items-center gap-0.5">
                {s.colors.map((c) => (
                  <ManaSymbol key={c} symbol={c} size="sm" className="h-3.5 w-3.5" />
                ))}
              </span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Desktop: horizontal scroll */}
        <div className="relative group hidden sm:block">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="flex absolute left-0 top-1/2 -translate-y-1/2 z-20 h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground hover:text-foreground hover:bg-muted/60 shadow-sm transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="flex absolute right-0 top-1/2 -translate-y-1/2 z-20 h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground hover:text-foreground hover:bg-muted/60 shadow-sm transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 transition-opacity duration-200"
            style={{
              background: 'linear-gradient(to right, hsl(var(--card) / 0.9), transparent)',
              opacity: canScrollLeft ? 1 : 0,
            }}
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 transition-opacity duration-200"
            style={{
              background: 'linear-gradient(to left, hsl(var(--card) / 0.9), transparent)',
              opacity: canScrollRight ? 1 : 0,
            }}
          />

          <div
            ref={scrollRef}
            className="flex gap-2 pb-3 overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            {STAPLES.map((s) => (
              <button
                key={s.label}
                onClick={() => onSearch(s.query)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 text-xs font-medium text-foreground hover:bg-muted/60 hover:border-border transition-colors whitespace-nowrap shrink-0"
                title={`Search: ${s.query}`}
              >
                <span className="inline-flex items-center gap-0.5">
                  {s.colors.map((c) => (
                    <ManaSymbol key={c} symbol={c} size="sm" className="h-3.5 w-3.5" />
                  ))}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
