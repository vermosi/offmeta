/**
 * Instant demo preview — shows hardcoded card results to prove the tool works
 * before the user types anything. Renders only on the landing page.
 * @module components/InstantDemoPreview
 */

import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const DEMO_QUERY = 'budget board wipes under $5';
const DEMO_SCRYFALL = 'otag:board-wipe usd<5';

const DEMO_CARDS = [
  {
    name: 'Blasphemous Act',
    imageUri:
      'https://cards.scryfall.io/normal/front/0/b/0b4ae2f6-a70e-4de7-92b4-b9267089da27.jpg?1736926345',
    price: '$1.29',
  },
  {
    name: 'Farewell',
    imageUri:
      'https://cards.scryfall.io/normal/front/1/0/10b78a1c-db8e-4e30-936c-7cdc63de5ab2.jpg?1743206741',
    price: '$3.49',
  },
  {
    name: 'Toxic Deluge',
    imageUri:
      'https://cards.scryfall.io/normal/front/d/0/d0068305-45e3-4e46-a3e3-58e96fa8d3b4.jpg?1742355219',
    price: '$4.99',
  },
  {
    name: 'Chain Reaction',
    imageUri:
      'https://cards.scryfall.io/normal/front/2/3/23b3dda0-d08a-4d32-ad26-8fe0e1656cde.jpg?1740003073',
    price: '$0.49',
  },
] as const;

interface InstantDemoPreviewProps {
  onTrySearch: (query: string) => void;
}

export function InstantDemoPreview({ onTrySearch }: InstantDemoPreviewProps) {
  return (
    <div className="animate-reveal rounded-xl border border-border/60 bg-card/50 p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Example: &ldquo;{DEMO_QUERY}&rdquo;
          </p>
          <code className="text-[11px] sm:text-xs text-muted-foreground/80 font-mono">
            → {DEMO_SCRYFALL}
          </code>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTrySearch(DEMO_QUERY)}
          className="gap-1.5 text-xs self-start sm:self-auto"
        >
          <Search className="h-3 w-3" aria-hidden="true" />
          Search this →
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {DEMO_CARDS.map((card) => (
          <button
            key={card.name}
            type="button"
            onClick={() => onTrySearch(DEMO_QUERY)}
            className="group flex flex-col items-center gap-1.5 focus-ring rounded-lg"
          >
            <div className="relative aspect-[488/680] w-full overflow-hidden rounded-lg border border-border/40 bg-muted">
              <img
                src={card.imageUri}
                alt={card.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs font-medium text-foreground truncate max-w-full">
                {card.name}
              </p>
              <p className="text-[10px] text-muted-foreground">{card.price}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
