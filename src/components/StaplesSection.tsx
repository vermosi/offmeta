/**
 * "Staples For" quick lookup section on the home page.
 * Pre-built archetype chips that run curated searches.
 */

import { memo } from 'react';
import { Zap } from 'lucide-react';
import { ManaSymbol } from '@/components/ManaSymbol';

interface StaplesSectionProps {
  onSearch: (query: string) => void;
}

const STAPLES = [
  { label: 'Mono-Red Aggro', query: 'budget red aggro creatures cmc<=3', colors: ['R'] },
  { label: 'Simic Ramp', query: 'simic ramp spells', colors: ['G', 'U'] },
  { label: 'Orzhov Aristocrats', query: 'white black sacrifice payoffs', colors: ['W', 'B'] },
  { label: 'Izzet Spellslinger', query: 'blue red instant sorcery payoffs', colors: ['U', 'R'] },
  { label: 'Golgari Graveyard', query: 'black green graveyard recursion', colors: ['B', 'G'] },
  { label: 'Selesnya Tokens', query: 'green white token generators', colors: ['G', 'W'] },
  { label: 'Dimir Control', query: 'blue black control removal counterspells', colors: ['U', 'B'] },
  { label: 'Boros Equipment', query: 'red white equipment and auras for voltron', colors: ['R', 'W'] },
  { label: 'Gruul Stompy', query: 'red green big creatures with trample', colors: ['R', 'G'] },
  { label: 'Azorius Flickers', query: 'white blue blink ETB creatures', colors: ['W', 'U'] },
  { label: 'Mono-Black Devotion', query: 'black devotion permanents', colors: ['B'] },
  { label: 'Mono-Green Elves', query: 'green elf tribal creatures', colors: ['G'] },
] as const;

export const StaplesSection = memo(function StaplesSection({
  onSearch,
}: StaplesSectionProps) {
  return (
    <section className="w-full max-w-3xl mx-auto" aria-labelledby="staples-heading">
      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 id="staples-heading" className="text-sm font-semibold text-foreground">
              Staples For...
            </h2>
            <p className="text-xs text-muted-foreground">
              Quick searches by archetype
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {STAPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => onSearch(s.query)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 text-xs font-medium text-foreground hover:bg-muted/60 hover:border-border transition-colors"
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
    </section>
  );
});
