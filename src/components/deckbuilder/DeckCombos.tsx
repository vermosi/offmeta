/**
 * Inline combo detection panel for the deck editor.
 * Uses the combo-search edge function to find combos in the current deck.
 * @module components/deckbuilder/DeckCombos
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Plus, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


import type { DeckCard } from '@/hooks/useDeck';

interface ComboCard {
  name: string;
  imageUrl?: string;
}

interface Combo {
  id: string;
  cards: ComboCard[];
  description: string;
  prerequisites: string;
  produces: string[];
}

interface DeckCombosProps {
  cards: DeckCard[];
  commanderName: string | null;
  onAddCard: (name: string) => void;
}

export function DeckCombos({ cards, commanderName, onAddCard }: DeckCombosProps) {
  const [included, setIncluded] = useState<Combo[]>([]);
  const [almostIncluded, setAlmostIncluded] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastCardCountRef = useRef<number>(0);

  const cardNames = cards.map((c) => c.card_name);
  const commanders = commanderName ? [commanderName] : cards.filter((c) => c.is_commander).map((c) => c.card_name);

  const cardNamesKey = cardNames.join(',');
  const commandersKey = commanders.join(',');

  const fetchCombos = useCallback(async () => {
    if (cardNames.length < 10) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('combo-search', {
        body: {
          action: 'deck',
          commanders,
          cards: cardNames,
        },
      });
      if (!error && data?.success !== false) {
        setIncluded(data.included || []);
        setAlmostIncluded(data.almostIncluded || []);
      }
      setSearched(true);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardNamesKey, commandersKey]);

  // Auto-detect when deck changes significantly (every 5 cards added)
  useEffect(() => {
    const total = cards.length;
    if (total < 10) return;
    if (total === lastCardCountRef.current) return;

    // Only auto-fire every 5 cards or first time at 10
    if (total >= 10 && (total - lastCardCountRef.current >= 5 || !searched)) {
      lastCardCountRef.current = total;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchCombos, 2000);
    }

    return () => clearTimeout(debounceRef.current);
  }, [cards.length, fetchCombos, searched]);

  const deckCardSet = new Set(cardNames.map((n) => n.toLowerCase()));

  if (cards.length < 10 && !searched) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-accent" />
          Combos
        </h3>
        <p className="text-[10px] text-muted-foreground">Add 10+ cards to auto-detect combos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-accent" />
          Combos
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchCombos}
          disabled={loading || cards.length < 10}
          className="h-7 text-[11px] gap-1"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          {loading ? 'Scanning...' : 'Scan'}
        </Button>
      </div>

      {loading && !searched && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Scanning for combos...
        </div>
      )}

      {searched && included.length === 0 && almostIncluded.length === 0 && !loading && (
        <p className="text-[10px] text-muted-foreground">No combos detected yet. Keep building!</p>
      )}

      {/* In deck */}
      {included.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1.5">
            In Your Deck ({included.length})
          </div>
          {included.slice(0, 10).map((combo) => (
            <ComboItem key={combo.id} combo={combo} deckCardSet={deckCardSet} onAddCard={onAddCard} />
          ))}
        </div>
      )}

      {/* Almost included */}
      {almostIncluded.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Almost There ({almostIncluded.length})
          </div>
          {almostIncluded.slice(0, 8).map((combo) => (
            <ComboItem key={combo.id} combo={combo} deckCardSet={deckCardSet} onAddCard={onAddCard} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComboItem({
  combo,
  deckCardSet,
  onAddCard,
}: {
  combo: Combo;
  deckCardSet: Set<string>;
  onAddCard: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const missingCards = combo.cards
    .filter((c) => !c.name.startsWith('[Any]') && !deckCardSet.has(c.name.toLowerCase()));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-start gap-1.5 w-full text-left p-1.5 rounded-lg hover:bg-secondary/30 transition-colors">
        {open ? <ChevronDown className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium leading-tight">
            {combo.cards.map((c) => c.name).join(' + ')}
          </p>
          {combo.produces.length > 0 && (
            <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
              → {combo.produces.join(', ')}
            </p>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 pl-2 border-l border-border/50 mb-2 space-y-1.5">
          {combo.description && (
            <p className="text-[10px] text-muted-foreground whitespace-pre-line">{combo.description}</p>
          )}
          {missingCards.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold text-accent">Missing cards:</p>
              {missingCards.map((card) => (
                <button
                  key={card.name}
                  onClick={() => onAddCard(card.name)}
                  className="flex items-center gap-1 text-[10px] text-foreground hover:text-accent transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" />
                  {card.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
