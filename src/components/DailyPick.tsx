/**
 * Daily Off-Meta Pick — showcases a different hidden gem card each day.
 * Fetches card data from Scryfall and displays it with the curator's blurb.
 */

import { useState, useEffect, useCallback } from 'react';
import { getTodayPick } from '@/data/daily-gems';
import { Sparkles, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ScryfallCard } from '@/types/card';

export function DailyPick() {
  const [card, setCard] = useState<ScryfallCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const gem = getTodayPick();

  useEffect(() => {
    let cancelled = false;

    async function fetchCard() {
      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(gem.name)}`,
        );
        if (!res.ok) throw new Error('Card not found');
        const data = await res.json();
        if (!cancelled) setCard(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCard();
    return () => { cancelled = true; };
  }, [gem.name]);

  const handleScryfallOpen = useCallback(() => {
    if (!card) return;
    window.open(card.scryfall_uri, '_blank', 'noopener,noreferrer');
  }, [card]);

  if (error || (!loading && !card)) return null;

  // Get the image URI — handle double-faced cards
  const imageUri =
    card?.image_uris?.normal ||
    card?.image_uris?.large ||
    card?.card_faces?.[0]?.image_uris?.normal ||
    '';

  const manaCost = card?.mana_cost || card?.card_faces?.[0]?.mana_cost || '';
  const typeLine = card?.type_line || '';
  const oracleText = card?.oracle_text || card?.card_faces?.[0]?.oracle_text || '';

  return (
    <section
      className="w-full max-w-2xl mx-auto"
      aria-labelledby="daily-pick-heading"
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
          aria-expanded={expanded}
          aria-controls="daily-pick-content"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2
                id="daily-pick-heading"
                className="text-sm font-semibold text-foreground"
              >
                Daily Off-Meta Pick
              </h2>
              <p className="text-xs text-muted-foreground">
                {loading ? 'Loading today\'s gem...' : card?.name}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {/* Expandable content */}
        {expanded && !loading && card && (
          <div
            id="daily-pick-content"
            className="border-t border-border p-4 sm:p-5 animate-reveal"
          >
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Card image */}
              {imageUri && (
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <img
                    src={imageUri}
                    alt={`${card.name} card art`}
                    className="w-48 sm:w-56 rounded-lg shadow-lg"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Card info */}
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {card.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {manaCost && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {manaCost}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {typeLine}
                    </span>
                  </div>
                </div>

                {/* Why it's a gem */}
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-xs font-medium text-primary mb-1">
                    Why it's a hidden gem
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">
                    {gem.reason}
                  </p>
                </div>

                {/* Oracle text preview */}
                {oracleText && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 italic">
                    {oracleText}
                  </p>
                )}

                {/* Price + link */}
                <div className="flex items-center gap-3 pt-1">
                  {card.prices?.usd && (
                    <span className="text-sm font-medium text-foreground">
                      ${card.prices.usd}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScryfallOpen}
                    className="h-8 text-xs gap-1.5"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Scryfall
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
