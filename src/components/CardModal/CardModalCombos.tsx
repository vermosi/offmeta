/**
 * Combos tab for CardModal — shows Commander Spellbook combos for the viewed card.
 * @module components/CardModal/CardModalCombos
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ManaCost } from '@/components/ManaSymbol';
import { logger } from '@/lib/core/logger';

interface ComboCard {
  name: string;
  imageUrl?: string;
  typeLine?: string;
}

interface Combo {
  id: string;
  cards: ComboCard[];
  description: string;
  prerequisites: string;
  produces: string[];
  identity: string;
  popularity: number;
  prices?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardkingdom?: string;
  };
  legalities?: Record<string, boolean>;
}

export interface CardModalCombosProps {
  cardName: string;
  isMobile?: boolean;
}

export function CardModalCombos({ cardName, isMobile }: CardModalCombosProps) {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);

  useEffect(() => {
    if (!cardName) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    supabase.functions
      .invoke('combo-search', {
        body: { action: 'card', cardName },
      })
      .then(({ data, error: fnError }) => {
        if (cancelled) return;
        if (fnError) {
          logger.warn('Combo search error', fnError);
          setError('Could not load combos');
          setIsLoading(false);
          return;
        }
        if (data?.success) {
          setCombos(data.combos || []);
          setTotal(data.total || 0);
        } else {
          setError(data?.error || 'Unknown error');
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cardName]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Loading combos…</span>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <AlertTriangle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (combos.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-3">
        No known combos found for this card.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Combos ({total > combos.length ? `${combos.length} of ${total}` : combos.length})
          </span>
        </div>
        <a
          href={`https://commanderspellbook.com/search/?q=card%3A%22${encodeURIComponent(cardName)}%22`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          View all
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="space-y-2">
        {combos.map((combo) => (
          <Collapsible
            key={combo.id}
            open={expandedCombo === combo.id}
            onOpenChange={(open) =>
              setExpandedCombo(open ? combo.id : null)
            }
          >
            <CollapsibleTrigger asChild>
              <button
                className="w-full text-left rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors p-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Card names in combo */}
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {combo.cards
                        .filter((c) => c.name !== cardName && !c.name.startsWith('[Any]'))
                        .slice(0, isMobile ? 3 : 5)
                        .map((c, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {c.name}
                          </Badge>
                        ))}
                      {combo.cards.filter((c) => c.name.startsWith('[Any]')).map((c, i) => (
                        <Badge
                          key={`tmpl-${i}`}
                          variant="outline"
                          className="text-xs font-normal italic"
                        >
                          {c.name.replace('[Any] ', '')}
                        </Badge>
                      ))}
                    </div>

                    {/* What it produces */}
                    <div className="flex flex-wrap gap-1">
                      {combo.produces.slice(0, 3).map((p, i) => (
                        <span
                          key={i}
                          className="text-xs text-primary/80 flex items-center gap-0.5"
                        >
                          <Sparkles className="h-3 w-3" />
                          {p}
                        </span>
                      ))}
                      {combo.produces.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{combo.produces.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    {combo.identity && (
                      <span className="inline-flex items-center gap-0.5">
                        {combo.identity.split('').filter((c: string) => 'WUBRG'.includes(c)).map((c: string, i: number) => (
                          <img
                            key={i}
                            src={`https://svgs.scryfall.io/card-symbols/${c}.svg`}
                            alt={c}
                            className="h-4 w-4"
                          />
                        ))}
                      </span>
                    )}
                    {expandedCombo === combo.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border border-t-0 border-border/50 rounded-b-lg bg-background p-3 space-y-3">
                {/* Steps */}
                {combo.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Steps
                    </p>
                    <ol className="text-xs space-y-0.5 list-decimal list-inside text-foreground/90">
                      {combo.description.split('\n').filter(Boolean).map((step, i) => (
                        <li key={i}>{step.replace(/^\d+\.\s*/, '')}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Prerequisites */}
                {combo.prerequisites && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Prerequisites
                    </p>
                    <ul className="text-xs space-y-0.5 list-disc list-inside text-foreground/70">
                      {combo.prerequisites.split('\n').filter(Boolean).map((prereq, i) => (
                        <li key={i}>{prereq}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Price + link */}
                <div className="flex items-center justify-between">
                  {combo.prices?.tcgplayer && (
                    <span className="text-xs text-muted-foreground">
                      Combo cost: ~${combo.prices.tcgplayer}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    asChild
                  >
                    <a
                      href={`https://commanderspellbook.com/combo/${combo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Commander Spellbook
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
