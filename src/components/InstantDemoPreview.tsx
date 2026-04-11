/**
 * Instant demo preview — glass-card treatment with hover lift.
 * @module components/InstantDemoPreview
 */

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';
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
      position,
    });
    onTrySearch(DEMO_QUERY);
  };

  return (
    <div className="animate-reveal glass-card rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground tracking-wide">
              See it in action
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &ldquo;{DEMO_QUERY}&rdquo;
            <span className="mx-1.5 text-muted-foreground/50">→</span>
            <code className="text-[11px] font-mono text-accent/80">{DEMO_SCRYFALL}</code>
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={handleSearchClick}
          className="gap-1.5 text-xs self-start sm:self-auto font-medium magnetic"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Try this search
        </Button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {DEMO_CARDS.map((card, index) => (
          <button
            key={card.name}
            type="button"
            onClick={() => handleCardClick(card.name, index)}
            className="group flex flex-col items-center gap-1.5 focus-ring rounded-lg"
          >
            <div className="relative aspect-[488/680] w-full overflow-hidden rounded-lg border border-border/40 bg-muted shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
              <img
                src={card.imageUri}
                alt={card.name}
                width={488}
                height={680}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding={index === 0 ? 'sync' : 'async'}
                fetchPriority={index === 0 ? 'high' : undefined}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
