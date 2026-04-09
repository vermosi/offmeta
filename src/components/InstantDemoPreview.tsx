/**
 * Instant demo preview — shows hardcoded card results to prove the tool works
 * before the user types anything. Renders only on the landing page.
 * @module components/InstantDemoPreview
 */

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useAnalytics } from '@/hooks';

const DEMO_QUERY = 'budget board wipes under $5';
const DEMO_SCRYFALL = 'otag:board-wipe usd<5';

const DEMO_CARDS = [
  {
    name: 'Blasphemous Act',
    imageUri:
      'https://cards.scryfall.io/normal/front/1/7/175eb155-7262-4c2e-85c3-e0cc9be855e5.jpg?1775052162',
    price: '$2.00',
  },
  {
    name: 'Austere Command',
    imageUri:
      'https://cards.scryfall.io/normal/front/a/3/a31ffc9e-d21b-4a8f-ac67-695e38e09e3b.jpg?1706240553',
    price: '$0.49',
  },
  {
    name: 'Damn',
    imageUri:
      'https://cards.scryfall.io/normal/front/8/4/84056124-1a6f-4274-bee2-74cf0debddb5.jpg?1698988237',
    price: '$2.18',
  },
  {
    name: 'Supreme Verdict',
    imageUri:
      'https://cards.scryfall.io/normal/front/3/8/3892f1c5-937e-4ef4-b6f9-e0c0ded070d0.jpg?1706240181',
    price: '$2.79',
  },
] as const;

interface InstantDemoPreviewProps {
  onTrySearch: (query: string) => void;
}

export function InstantDemoPreview({ onTrySearch }: InstantDemoPreviewProps) {
  const { trackEvent } = useAnalytics();
  const impressionTracked = useRef(false);

  useEffect(() => {
    if (!impressionTracked.current) {
      impressionTracked.current = true;
      trackEvent('demo_preview_impression', { query: DEMO_QUERY });
    }
  }, [trackEvent]);

  const handleSearchClick = () => {
    trackEvent('demo_preview_click', { query: DEMO_QUERY, action: 'search_button' });
    onTrySearch(DEMO_QUERY);
  };

  const handleCardClick = (cardName: string, position: number) => {
    trackEvent('demo_preview_card_click', {
      query: DEMO_QUERY,
      card_name: cardName,
      position_in_results: position,
    });
    onTrySearch(DEMO_QUERY);
  };

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
          onClick={handleSearchClick}
          className="gap-1.5 text-xs self-start sm:self-auto"
        >
          <Search className="h-3 w-3" aria-hidden="true" />
          Search this →
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {DEMO_CARDS.map((card, index) => (
          <button
            key={card.name}
            type="button"
            onClick={() => handleCardClick(card.name, index)}
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
