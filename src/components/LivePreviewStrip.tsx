/**
 * LivePreviewStrip — shows an animated preview of a real search result
 * below the search bar to demonstrate instant value and reduce bounce rate.
 * Fetches actual card images from Scryfall for a rotating example query.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRight, Sparkles, Search } from 'lucide-react';

interface PreviewCard {
  id: string;
  name: string;
  imageUrl: string;
}

interface DemoQuery {
  natural: string;
  scryfall: string;
}

const DEMO_QUERIES: DemoQuery[] = [
  {
    natural: 'budget board wipes under $5',
    scryfall: 'usd<=5 (o:"destroy all creatures" or o:"each creature")',
  },
  {
    natural: 'cards that protect my commander',
    scryfall: '(o:hexproof or o:indestructible or o:"phase out") t:instant',
  },
  {
    natural: 'mana rocks that cost 2',
    scryfall: 't:artifact mv=2 (o:"add {" or o:mana)',
  },
];

const CARD_COUNT = 6;

export function LivePreviewStrip({
  onTrySearch,
}: {
  onTrySearch?: (query: string) => void;
}) {
  const [cards, setCards] = useState<PreviewCard[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeQueryIndex] = useState(() =>
    Math.floor(Math.random() * DEMO_QUERIES.length),
  );
  const activeQuery = useMemo(
    () => DEMO_QUERIES[activeQueryIndex],
    [activeQueryIndex],
  );

  const fetchPreview = useCallback(async () => {
    try {
      const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(activeQuery.scryfall)}&unique=cards&order=edhrec&page=1`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      const previewCards: PreviewCard[] = (data.data || [])
        .slice(0, CARD_COUNT)
        .map(
          (card: {
            id: string;
            name: string;
            image_uris?: { small?: string; normal?: string };
            card_faces?: Array<{
              image_uris?: { small?: string; normal?: string };
            }>;
          }) => ({
            id: card.id,
            name: card.name,
            imageUrl:
              card.image_uris?.normal ||
              card.image_uris?.small ||
              card.card_faces?.[0]?.image_uris?.normal ||
              card.card_faces?.[0]?.image_uris?.small ||
              '',
          }),
        )
        .filter((c: PreviewCard) => c.imageUrl);

      setCards(previewCards);
      // Stagger reveal after images start loading
      setTimeout(() => setIsLoaded(true), 200);
    } catch {
      // Silently fail — this is a non-critical enhancement
    }
  }, [activeQuery.scryfall]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPreview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchPreview]);

  if (cards.length === 0) return null;

  return (
    <section
      aria-label="Live search preview"
      className={`mx-auto w-full max-w-5xl rounded-3xl border border-border/60 bg-card/70 p-4 sm:p-5 lg:p-6 shadow-sm transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="flex flex-col gap-4">
        {/* Query demo header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent mb-2">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Live preview</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">
                Searching for
              </span>
              <span className="text-sm font-semibold text-foreground">
                "{activeQuery.natural}"
              </span>
              <ArrowRight
                className="h-3.5 w-3.5 text-accent hidden sm:block"
                aria-hidden="true"
              />
              <code className="hidden sm:inline text-xs text-muted-foreground bg-secondary/60 rounded-lg px-2 py-0.5 border border-border/40">
                {activeQuery.scryfall}
              </code>
            </div>
          </div>

          {onTrySearch && (
            <button
              type="button"
              onClick={() => onTrySearch(activeQuery.natural)}
              className="group inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 hover:border-accent/50 transition-all duration-200 active:scale-[0.97] self-start"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Try this search</span>
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        {/* Card preview strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="relative rounded-xl overflow-hidden shadow-md border border-border/40 transition-all duration-500 hover:scale-105 hover:shadow-lg hover:z-10"
              style={{
                opacity: isLoaded ? 1 : 0,
                transform: isLoaded ? 'translateY(0)' : 'translateY(16px)',
                transitionDelay: `${i * 100}ms`,
                transitionProperty: 'opacity, transform',
                transitionDuration: '500ms',
              }}
            >
              <img
                src={card.imageUrl}
                alt={card.name}
                loading="lazy"
                className="w-full h-auto aspect-[488/680] object-cover bg-secondary/40"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-overlay/70 to-transparent px-2 py-1.5">
                <p className="text-[10px] sm:text-xs font-medium text-contrast truncate">
                  {card.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
