/**
 * Daily Off-Meta Pick — showcases a different hidden gem card each day.
 * Displayed as an always-visible card box (not collapsible).
 */

import { useState, useEffect, useCallback } from 'react';
import { getTodayPick } from '@/data/daily-gems';
import { Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScryfallCard } from '@/types/card';

export function DailyPick() {
  const [card, setCard] = useState<ScryfallCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/10">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="daily-pick-heading"
              className="text-sm font-semibold text-foreground"
            >
              Daily Off-Meta Pick
            </h2>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading today's gem..." : card?.name}
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="shimmer h-6 w-48 rounded-lg" />
          </div>
        ) : card ? (
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
              <div className="rounded-lg bg-accent/5 border border-accent/10 p-3">
                <p className="text-xs font-medium text-accent mb-1">
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
        ) : null}
      </div>
    </section>
  );
}
