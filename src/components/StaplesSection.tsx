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
  { label: 'Rakdos Madness', query: 'rakdos cards with madness or discard synergy', colors: ['B', 'R'] },
  { label: 'Esper Artifacts', query: 'esper artifact synergy cards', colors: ['W', 'U', 'B'] },
  { label: 'Naya Enchantress', query: 'naya enchantment synergy cards', colors: ['R', 'G', 'W'] },
  { label: 'Sultai Counters', query: 'sultai creatures with +1/+1 counter synergy', colors: ['B', 'G', 'U'] },
  { label: 'Mardu Reanimator', query: 'mardu reanimation spells and creatures', colors: ['R', 'W', 'B'] },
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
