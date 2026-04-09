/**
 * DeckPreviewSidebar – Preview panel wrapper for desktop (sidebar) and mobile (bottom drawer).
 */

import { type RefObject } from 'react';
import { CardPreviewPanel } from '@/components/deckbuilder/CardPreviewPanel';
import type { ScryfallCard } from '@/types/card';
import { type DeckCard } from '@/hooks';
import type { CardSuggestion } from '@/components/deckbuilder/SuggestionsPanel';

interface DeckPreviewSidebarProps {
  card: ScryfallCard | null;
  suggestions: CardSuggestion[];
  suggestionsAnalysis: string;
  suggestionsLoading: boolean;
  onSuggest: () => void;
  onAddSuggestion: (cardName: string) => void;
  cardCount: number;
  deckCards: DeckCard[];
  commanderName: string | null;
  colorIdentity: string[];
  format: string;
  onRemoveByName?: (cardName: string) => void;
  deckId: string | undefined;
  scryfallCache: RefObject<Map<string, ScryfallCard>>;
  previewOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export function DeckPreviewSidebar({
  previewOpen,
  isMobile,
  onClose,
  card,
  ...rest
}: DeckPreviewSidebarProps) {
  const panelProps = { card, ...rest };

  if (isMobile) {
    if (!previewOpen || !card) return null;
    return (
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl max-h-[70vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <CardPreviewPanel {...panelProps} />
        </div>
      </div>
    );
  }

  if (!previewOpen) return null;

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col overflow-hidden shrink-0">
      <CardPreviewPanel {...panelProps} />
    </div>
  );
}
