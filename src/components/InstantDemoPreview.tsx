/**
 * Instant demo preview — cinematic showcase with larger cards, typewriter query, and 3D hover.
 * @module components/InstantDemoPreview
 */

import { useEffect, useRef, useState } from 'react';
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

function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
}

export function InstantDemoPreview({ onTrySearch }: InstantDemoPreviewProps) {
  const { trackEvent } = useAnalytics();
  const impressionTracked = useRef(false);
  const { displayed: typedQuery, done: typingDone } = useTypewriter(DEMO_QUERY, 50);

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
    <div className="animate-reveal space-y-6">
      {/* Section divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" aria-hidden="true" />

      <div className="glass-card rounded-2xl p-5 sm:p-8 space-y-6">
        {/* Heading with typewriter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
              <span className="text-base font-semibold text-foreground tracking-wide">
                See it in action
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              &ldquo;<span className="text-foreground/80">{typedQuery}</span>
              {!typingDone && (
                <span className="inline-block w-[2px] h-4 bg-accent/70 ml-0.5 align-middle animate-pulse" />
              )}
              &rdquo;
              {typingDone && (
                <span className="animate-fade-in">
                  <span className="mx-2 text-muted-foreground/50">→</span>
                  <code className="text-xs font-mono text-accent/80">{DEMO_SCRYFALL}</code>
                </span>
              )}
            </p>
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSearchClick}
            className="gap-2 text-sm self-start sm:self-auto font-medium magnetic shadow-lg shadow-accent/20"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Try this search
          </Button>
        </div>

        {/* Card grid — larger cards with 3D hover */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
          {DEMO_CARDS.map((card, index) => (
            <button
              key={card.name}
              type="button"
              onClick={() => handleCardClick(card.name, index)}
              className="group flex flex-col items-center gap-2 focus-ring rounded-lg demo-card-entrance"
              style={{ animationDelay: `${index * 100 + 300}ms` }}
            >
              <div className="relative aspect-[488/680] w-full overflow-hidden rounded-xl border border-border/40 bg-muted shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-accent/10 group-hover:-translate-y-2 demo-card-3d">
                <img
                  src={card.imageUri}
                  alt={card.name}
                  width={488}
                  height={680}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding={index === 0 ? 'sync' : 'async'}
                  fetchPriority={index === 0 ? 'high' : undefined}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="text-center">
                <p className="text-xs sm:text-sm font-medium text-foreground truncate max-w-full">
                  {card.name}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{card.price}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
