/**
 * Right panel in the deck editor: shows the selected card image + oracle text,
 * followed by the combo finder and AI suggestions panel.
 * @module components/deckbuilder/CardPreviewPanel
 */

import { useEffect, useRef, useState } from 'react';
import { SuggestionsPanel } from '@/components/deckbuilder/SuggestionsPanel';
import { DeckCombos } from '@/components/deckbuilder/DeckCombos';
import { DeckCritiquePanel } from '@/components/deckbuilder/DeckCritiquePanel';
import { useTranslation } from '@/lib/i18n';
import { searchCards } from '@/lib/scryfall';
import type { ScryfallCard } from '@/types/card';
import { type DeckCard } from '@/hooks';
import type { CardSuggestion } from '@/components/deckbuilder/SuggestionsPanel';

interface CardPreviewPanelProps {
  card: ScryfallCard | null;
  suggestions: CardSuggestion[];
  suggestionsAnalysis: string;
  suggestionsLoading: boolean;
  onSuggest: () => void;
  onAddSuggestion: (name: string) => void;
  cardCount: number;
  deckCards: DeckCard[];
  commanderName: string | null;
  colorIdentity?: string[];
  format?: string;
  onRemoveByName?: (name: string) => void;
  deckId?: string;
  scryfallCache?: React.RefObject<Map<string, ScryfallCard>>;
}

export function CardPreviewPanel({
  card, suggestions, suggestionsAnalysis, suggestionsLoading,
  onSuggest, onAddSuggestion, cardCount, deckCards, commanderName,
  colorIdentity = [], format = 'commander', onRemoveByName, deckId, scryfallCache,
}: CardPreviewPanelProps) {
  const { t } = useTranslation();
  const [fallbackCommanderCard, setFallbackCommanderCard] = useState<ScryfallCard | null>(null);
  const attemptedCommanderRef = useRef<string | null>(null);

  const commanderCandidate = commanderName || deckCards.find((deckCard) => deckCard.is_commander)?.card_name || null;

  useEffect(() => {
    let cancelled = false;

    // Avoid sync setState in effect body (lint rule: react-hooks/set-state-in-effect)
    const setFallbackAsync = (next: ScryfallCard | null) => {
      queueMicrotask(() => {
        if (cancelled) return;
        setFallbackCommanderCard(next);
      });
    };

    if (card) {
      return () => {
        cancelled = true;
      };
    }

    if (!commanderCandidate) {
      setFallbackAsync(null);
      attemptedCommanderRef.current = null;
      return () => {
        cancelled = true;
      };
    }

    if (fallbackCommanderCard?.name === commanderCandidate) {
      return () => {
        cancelled = true;
      };
    }

    const cachedCommander = scryfallCache?.current.get(commanderCandidate);
    if (cachedCommander) {
      setFallbackAsync(cachedCommander);
      return () => {
        cancelled = true;
      };
    }

    if (attemptedCommanderRef.current === commanderCandidate) {
      return () => {
        cancelled = true;
      };
    }
    attemptedCommanderRef.current = commanderCandidate;

    searchCards(`!"${commanderCandidate}"`)
      .then((response) => {
        if (cancelled) return;
        const resolvedCommander = response.data?.[0];
        if (!resolvedCommander) return;
        scryfallCache?.current.set(commanderCandidate, resolvedCommander);
        setFallbackCommanderCard(resolvedCommander);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [card, commanderCandidate, fallbackCommanderCard?.name, scryfallCache]);

  const displayCard = card ?? fallbackCommanderCard;
  const imageUrl = displayCard?.image_uris?.normal || displayCard?.card_faces?.[0]?.image_uris?.normal;

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      {displayCard ? (
        <div className="space-y-3">
          {imageUrl && <img src={imageUrl} alt={displayCard.name} className="w-full rounded-xl shadow-lg" loading="lazy" />}
          <div>
            <h3 className="font-semibold text-sm">{displayCard.name}</h3>
            <p className="text-xs text-muted-foreground">{displayCard.type_line}</p>
            {displayCard.oracle_text && <p className="text-xs mt-2 whitespace-pre-line leading-relaxed">{displayCard.oracle_text}</p>}
            {displayCard.prices?.usd && <p className="text-xs text-muted-foreground mt-2">${displayCard.prices.usd}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3" data-testid="card-preview-placeholder">
          <div className="w-full aspect-[5/7] rounded-xl border border-border bg-secondary/30 shadow-sm flex items-center justify-center px-4">
            <p className="text-center text-xs text-muted-foreground">{t('deckEditor.preview.clickToPreview')}</p>
          </div>
        </div>
      )}
      <div className="border-t border-border" />
      <DeckCombos cards={deckCards} commanderName={commanderName} onAddCard={onAddSuggestion} />
      <div className="border-t border-border" />
      <SuggestionsPanel
        suggestions={suggestions}
        analysis={suggestionsAnalysis}
        loading={suggestionsLoading}
        onSuggest={onSuggest}
        onAddSuggestion={onAddSuggestion}
        cardCount={cardCount}
      />
      <div className="border-t border-border" />
      <DeckCritiquePanel
        deckId={deckId || ''}
        cards={deckCards}
        commanderName={commanderName}
        colorIdentity={colorIdentity}
        format={format}
        onAddSuggestion={onAddSuggestion}
        onRemoveByName={onRemoveByName}
        scryfallCache={scryfallCache}
      />
    </div>
  );
}
