/**
 * Right panel in the deck editor: shows the selected card image + oracle text,
 * followed by the combo finder and AI suggestions panel.
 * @module components/deckbuilder/CardPreviewPanel
 */

import { SuggestionsPanel } from '@/components/deckbuilder/SuggestionsPanel';
import { DeckCombos } from '@/components/deckbuilder/DeckCombos';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';
import type { DeckCard } from '@/hooks/useDeck';
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
}

export function CardPreviewPanel({
  card, suggestions, suggestionsAnalysis, suggestionsLoading,
  onSuggest, onAddSuggestion, cardCount, deckCards, commanderName,
}: CardPreviewPanelProps) {
  const { t } = useTranslation();
  const imageUrl = card?.image_uris?.normal || card?.card_faces?.[0]?.image_uris?.normal;

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      {card ? (
        <div className="space-y-3">
          {imageUrl && <img src={imageUrl} alt={card.name} className="w-full rounded-xl shadow-lg" loading="lazy" />}
          <div>
            <h3 className="font-semibold text-sm">{card.name}</h3>
            <p className="text-xs text-muted-foreground">{card.type_line}</p>
            {card.oracle_text && <p className="text-xs mt-2 whitespace-pre-line leading-relaxed">{card.oracle_text}</p>}
            {card.prices?.usd && <p className="text-xs text-muted-foreground mt-2">${card.prices.usd}</p>}
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground text-sm py-4">
          <p>{t('deckEditor.preview.clickToPreview')}</p>
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
    </div>
  );
}
