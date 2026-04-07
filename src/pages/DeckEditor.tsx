/**
 * Deck Editor page – Moxfield-inspired layout.
 * Thin orchestrator that delegates to:
 * - `useDeckEditorHandlers` — all state, effects, and callbacks
 * - `DeckEditorHeader` — deck name, format, commander, tags, search
 * - `DeckListView` — view/sort toolbar, card list, count/stats bars
 * - `DeckPreviewSidebar` — preview panel (sidebar on desktop, drawer on mobile)
 * @module pages/DeckEditor
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useDeck, useDeckCards, useDeckMutations } from '@/hooks/useDeck';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useMobile';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useDeckActions } from '@/hooks/useDeckActions';
import { useDeckEditorHandlers } from '@/hooks/useDeckEditorHandlers';
import { DeckEditorHeader } from '@/components/deckbuilder/DeckEditorHeader';
import { DeckListView } from '@/components/deckbuilder/DeckListView';
import { DeckPreviewSidebar } from '@/components/deckbuilder/DeckPreviewSidebar';
import { DeckEditorShortcutsModal } from '@/components/deckbuilder/DeckEditorShortcutsModal';
import { useTranslation } from '@/lib/i18n';

export default function DeckEditor() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const { data: deck, isLoading: deckLoading } = useDeck(id);
  const { data: cards = [], isLoading: cardsLoading } = useDeckCards(id);
  const { updateDeck } = useDeckMutations();
  const undoRedo = useUndoRedo();

  const {
    addCard,
    updateCard,
    handleAddCard: handleAddCardBase,
    handleRemoveCard,
    handleSetQuantity,
    handleMoveToSideboard,
    handleMoveToMaybeboard,
  } = useDeckActions({ deckId: id, cards, undoRedo });

  const h = useDeckEditorHandlers({
    id,
    deck: deck ?? null,
    cards,
    user,
    isMobile,
    undoRedo,
    addCard,
    updateCard,
    updateDeck,
    handleAddCardBase,
    handleRemoveCard,
    handleSetQuantity,
    handleMoveToSideboard,
    handleMoveToMaybeboard,
  });

  // ── Loading / Not Found States ──
  if (deckLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-48 shimmer rounded-lg" />
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-muted-foreground">{t('deckEditor.notFound')}</p>
          <Button variant="outline" onClick={() => navigate('/deckbuilder')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('deckEditor.backToDecks')}
          </Button>
        </div>
      </div>
    );
  }

  const previewPanelProps = {
    card: h.previewCard,
    suggestions: h.suggestions,
    suggestionsAnalysis: h.suggestionsAnalysis,
    suggestionsLoading: h.suggestionsLoading,
    onSuggest: h.handleSuggest,
    onAddSuggestion: h.handleAddSuggestion,
    cardCount: cards.length,
    deckCards: cards,
    commanderName: deck.commander_name,
    colorIdentity: deck.color_identity,
    format: deck.format,
    onRemoveByName: h.isReadOnly ? undefined : h.handleRemoveByName,
    deckId: id,
    scryfallCache: h.scryfallCacheRef,
    previewOpen: h.previewOpen,
    isMobile,
    onClose: () => h.setPreviewOpen(false),
  };

  const listViewProps = {
    cards,
    cardsLoading,
    isReadOnly: h.isReadOnly,
    isMobile,
    deckViewMode: h.deckViewMode,
    onDeckViewModeChange: h.setDeckViewMode,
    deckSortMode: h.deckSortMode,
    onDeckSortModeChange: h.setDeckSortMode,
    undoRedo,
    previewOpen: h.previewOpen,
    onPreviewOpenChange: (open: boolean) => h.setPreviewOpen(open),
    mainboardCards: h.mainboardCards,
    sideboardCards: h.sideboardCards,
    maybeboardCards: h.maybeboardCards,
    sortedMainboard: h.sortedMainboard,
    grouped: h.grouped,
    totalMainboard: h.totalMainboard,
    totalSideboard: h.totalSideboard,
    totalMaybeboard: h.totalMaybeboard,
    formatMax: h.formatMax,
    scryfallCacheVersion: h.scryfallCacheVersion,
    scryfallCacheRef: h.scryfallCacheRef,
    selectedCardId: h.selectedCardId,
    onSelectCard: h.handleSelectCard,
    onRemove: handleRemoveCard,
    onSetQuantity: handleSetQuantity,
    onSetCommander: h.handleSetCommander,
    onSetCompanion: h.handleSetCompanion,
    onSetCategory: h.handleSetCategory,
    onMoveToSideboard: handleMoveToSideboard,
    onMoveToMaybeboard: handleMoveToMaybeboard,
    onChangePrinting: (cardId: string, p: { id: string }) =>
      updateCard.mutate({ id: cardId, scryfall_id: p.id }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DeckEditorHeader
          deck={deck}
          cards={cards}
          deckId={id!}
          isReadOnly={h.isReadOnly}
          editingName={h.editingName}
          nameInput={h.nameInput}
          onNameInputChange={h.setNameInput}
          onStartEditName={h.startEditName}
          onSaveName={h.saveName}
          formatLabel={h.formatConfig.label}
          onFormatChange={h.handleFormatChange}
          totalMainboard={h.totalMainboard}
          totalSideboard={h.totalSideboard}
          totalMaybeboard={h.totalMaybeboard}
          formatMax={h.formatMax}
          mainboardCount={h.mainboardCards.length}
          deckPrice={h.deckPrice}
          priceLoading={h.priceLoading}
          categorizingAll={h.categorizingAll}
          onRecategorizeAll={h.handleRecategorizeAll}
          descriptionOpen={h.descriptionOpen}
          onDescriptionOpenChange={h.setDescriptionOpen}
          descriptionInput={h.descriptionInput}
          onDescriptionInputChange={h.setDescriptionInput}
          onDescriptionBlur={h.handleDescriptionBlur}
          onTogglePublic={h.handleTogglePublic}
          onAddCard={h.handleAddCard}
          onPreview={h.setPreviewCard}
          searchInputRef={h.searchInputRef}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <DeckListView {...listViewProps} />
          </div>
          {!isMobile && <DeckPreviewSidebar {...previewPanelProps} />}
        </div>

        {isMobile && <DeckPreviewSidebar {...previewPanelProps} />}
      </div>

      <DeckEditorShortcutsModal
        isOpen={h.shortcutsOpen}
        onClose={() => h.setShortcutsOpen(false)}
      />
    </div>
  );
}
