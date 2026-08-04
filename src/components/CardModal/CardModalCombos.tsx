/**
 * Combos tab for CardModal — shows Commander Spellbook combos for the viewed card.
 * @module components/CardModal/CardModalCombos
 */

import { useState, useEffect, useReducer } from 'react';
import { useTranslation } from '@/lib/i18n';
import { invokeComboSearch } from '@/services/combo-search';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Zap,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OracleText } from '@/components/ManaSymbol';
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
  onComboCountChange?: (count: number) => void;
}

type ComboState = {
  combos: Combo[];
  total: number;
  isLoading: boolean;
  error: string | null;
};

type ComboAction =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; combos: Combo[]; total: number }
  | { type: 'ERROR'; error: string };

function comboReducer(_state: ComboState, action: ComboAction): ComboState {
  switch (action.type) {
    case 'FETCH':
      return { combos: [], total: 0, isLoading: true, error: null };
    case 'SUCCESS':
      return { combos: action.combos, total: action.total, isLoading: false, error: null };
    case 'ERROR':
      return { combos: [], total: 0, isLoading: false, error: action.error };
  }
}

export function CardModalCombos({ cardName, isMobile }: CardModalCombosProps) {
  const { t } = useTranslation();
  const [showCombos, setShowCombos] = useState(false);
  const [state, dispatch] = useReducer(comboReducer, {
    combos: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const { combos, total, isLoading, error } = state;

  const debouncedCardName = useDebouncedValue(cardName, 300);

  useEffect(() => {
    if (!debouncedCardName) return;

    let cancelled = false;
    dispatch({ type: 'FETCH' });

    invokeComboSearch<{ success?: boolean; combos?: Combo[]; total?: number; error?: string }>({
      action: 'card',
      cardName: debouncedCardName,
    })
      .then((data) => {
        if (cancelled) return;
        if (data?.success) {
          dispatch({ type: 'SUCCESS', combos: data.combos || [], total: data.total || 0 });
        } else {
          dispatch({ type: 'ERROR', error: data?.error || 'Unknown error' });
        }
      })
      .catch((fnError: unknown) => {
        if (cancelled) return;
        logger.warn('Combo search error', fnError);
        dispatch({ type: 'ERROR', error: 'Could not load combos' });
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCardName]);

  const combosLabel = total > combos.length
    ? t('card.combosOf', '{shown} of {total}')
        .replace('{shown}', String(combos.length))
        .replace('{total}', String(total))
    : String(combos.length);

  if (error) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setShowCombos(!showCombos)}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>{t('card.combos', 'Combos').replace('{count}', combosLabel)}</span>
          {showCombos ? (
            <ChevronUp className="h-3.5 w-3.5 ml-auto" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 ml-auto" />
          )}
        </button>
        {showCombos && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  if (combos.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowCombos(!showCombos)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
      >
        <Zap className="h-3.5 w-3.5" />
        <span>
          {isLoading
            ? t('card.combosLoading', 'Loading combos…')
            : t('card.combos', 'Combos ({count})').replace('{count}', combosLabel)}
        </span>
        {showCombos ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>

      {showCombos && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <a
              href={`https://commanderspellbook.com/search/?q=card%3A%22${encodeURIComponent(cardName)}%22`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {t('card.combosViewAll', 'View all')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
                >
                  <div className="flex-1 min-w-0">
                    {/* What it produces */}
                    <div className="flex flex-wrap gap-1">
                      {combo.produces.slice(0, 3).map((p, i) => (
                        <span
                          key={i}
                          className="text-xs text-primary/80 flex items-center gap-0.5"
                        >
                          <Sparkles className="h-3 w-3" />
                          <OracleText text={p} size="sm" />
                        </span>
                      ))}
                      {combo.produces.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{combo.produces.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
