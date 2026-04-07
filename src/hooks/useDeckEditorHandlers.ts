/**
 * Hook encapsulating all DeckEditor local state and handlers.
 *
 * Owns: card preview, name editing, description, AI categorization,
 * suggestions, import, view/sort mode, and scryfall cache management.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ScryfallCard } from '@/types/card';
import type { DeckCard } from '@/hooks/useDeck';
import { searchCards } from '@/lib/scryfall';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { useDeckPrice } from '@/hooks/useDeckPrice';
import { useDeckEditorDerivedState } from '@/hooks/useDeckEditorDerivedState';
import { useDeckKeyboardShortcuts } from '@/hooks/useDeckKeyboardShortcuts';
import { useTranslation } from '@/lib/i18n';
import {
  printingsByName,
  cardImageFetchCache,
} from '@/components/deckbuilder/constants';
import type { CardSuggestion } from '@/components/deckbuilder/SuggestionsPanel';
import type { DeckSortMode } from '@/lib/deckbuilder/sort-deck-cards';
import { DEFAULT_CATEGORY } from '@/lib/deckbuilder/infer-category';
import type { UseUndoRedoReturn } from '@/hooks/useUndoRedo';

export type DeckViewMode = 'list' | 'visual' | 'pile';

interface UseDeckEditorHandlersInput {
  id: string | undefined;
  deck: {
    name: string;
    description: string | null;
    commander_name: string | null;
    companion_name: string | null;
    color_identity: string[];
    format: string;
    user_id: string;
    is_public: boolean;
  } | null;
  cards: DeckCard[];
  cardsLoading: boolean;
  user: { id: string } | null;
  isMobile: boolean;
  undoRedo: UseUndoRedoReturn;
  addCard: { mutate: (data: { card_name: string; quantity?: number; is_commander?: boolean }) => void };
  updateCard: { mutate: (data: { id: string; [key: string]: unknown }) => void };
  updateDeck: { mutate: (data: { id: string; [key: string]: unknown }) => void };
  handleAddCardBase: (card: ScryfallCard) => Promise<string>;
  handleRemoveCard: (cardId: string) => void;
  handleSetQuantity: (cardId: string, quantity: number) => void;
  handleMoveToSideboard: (cardId: string, toSideboard: boolean) => void;
  handleMoveToMaybeboard: (cardId: string) => void;
}

export function useDeckEditorHandlers({
  id,
  deck,
  cards,
  cardsLoading,
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
}: UseDeckEditorHandlersInput) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Local state ────────────────────────────────────────────────────────
  const [previewCard, setPreviewCard] = useState<ScryfallCard | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [suggestionsAnalysis, setSuggestionsAnalysis] = useState('');
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [categorizingAll, setCategorizingAll] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [deckViewMode, setDeckViewMode] = useState<DeckViewMode>('list');
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>('category');
  const [previewOpen, setPreviewOpen] = useState(!isMobile);
  const scryfallCacheRef = useRef<Map<string, ScryfallCard>>(new Map());
  const [scryfallCacheVersion, setScryfallCacheVersion] = useState(0);
  const importProcessedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useDeckKeyboardShortcuts({
    user,
    selectedCardId,
    cards,
    undoRedo,
    searchInputRef,
    onSelectCard: setSelectedCardId,
    onToggleShortcuts: (open?: boolean) =>
      setShortcutsOpen(open !== undefined ? open : (o: boolean) => !o),
    onRemove: handleRemoveCard,
    onSetQuantity: handleSetQuantity,
    onMoveToSideboard: handleMoveToSideboard,
    onMoveToMaybeboard: handleMoveToMaybeboard,
  });

  // ── Select card in deck list → load preview ────────────────────────────
  const handleSelectCard = useCallback(
    (cardId: string) => {
      setSelectedCardId(cardId);
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const cached = scryfallCacheRef.current.get(card.card_name);
      if (cached) {
        setPreviewCard(cached);
        if (isMobile) setPreviewOpen(true);
        return;
      }
      searchCards(`!"${card.card_name}"`)
        .then((res) => {
          const sc = res.data?.[0];
          if (sc) {
            scryfallCacheRef.current.set(card.card_name, sc);
            setScryfallCacheVersion((v) => v + 1);
            setPreviewCard(sc);
            if (isMobile) setPreviewOpen(true);
          }
        })
        .catch(() => {});
    },
    [cards, isMobile],
  );

  // ── Sync description ───────────────────────────────────────────────────
  useEffect(() => {
    if (deck?.description !== undefined) setDescriptionInput(deck.description || '');
  }, [deck?.description]);

  useEffect(() => {
    return () => {
      printingsByName.clear();
      cardImageFetchCache.clear();
    };
  }, []);

  // ── Add card with AI categorization ────────────────────────────────────
  const handleAddCard = useCallback(
    async (card: ScryfallCard) => {
      scryfallCacheRef.current.set(card.name, card);
      setScryfallCacheVersion((v) => v + 1);
      setPreviewCard(card);
      const typeCategory = await handleAddCardBase(card);
      try {
        const { data, error } = await supabase.functions.invoke('deck-categorize', {
          body: { cards: [card.name] },
        });
        if (!error && data?.categories?.[card.name]) {
          const aiCategory = data.categories[card.name];
          if (aiCategory !== typeCategory) {
            setTimeout(async () => {
              const { data: deckCards } = await supabase
                .from('deck_cards')
                .select('id')
                .eq('deck_id', id!)
                .eq('card_name', card.name)
                .eq('board', 'mainboard')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              if (deckCards) updateCard.mutate({ id: deckCards.id, category: aiCategory });
            }, 500);
          }
        }
      } catch {
        /* silent */
      }
    },
    [handleAddCardBase, id, updateCard],
  );

  // ── Handle imported cards ──────────────────────────────────────────────
  useEffect(() => {
    const state = location.state as {
      importCards?: { name: string; quantity: number }[];
      importCommander?: string | null;
    } | null;
    if (!state?.importCards || importProcessedRef.current || !id) return;
    importProcessedRef.current = true;
    const importCards = async () => {
      for (const card of state.importCards!) {
        addCard.mutate({
          card_name: card.name,
          quantity: card.quantity,
          is_commander: state.importCommander === card.name,
        });
      }
      toast({
        title: t('deckEditor.cardsImported'),
        description: t('deckEditor.cardsImportedDesc').replace('{count}', String(state.importCards!.length)),
      });
      navigate(location.pathname, { replace: true, state: null });
    };
    importCards();
  }, [id, location.state, addCard, navigate, location.pathname, t]);

  // ── Derived deck state ─────────────────────────────────────────────────
  const derived = useDeckEditorDerivedState({
    cards,
    deckFormat: deck?.format,
    deckSortMode,
    scryfallCache: scryfallCacheRef.current,
  });

  const { total: deckPrice, loading: priceLoading } = useDeckPrice(
    derived.mainboardCards,
    scryfallCacheRef,
    () => setScryfallCacheVersion((v) => v + 1),
  );

  const sortedMainboard = useMemo(() => {
    void scryfallCacheVersion;
    return derived.sortedMainboard;
  }, [derived.sortedMainboard, scryfallCacheVersion]);

  // ── Recategorize all ───────────────────────────────────────────────────
  const handleRecategorizeAll = useCallback(async () => {
    if (cards.length === 0) return;
    setCategorizingAll(true);
    try {
      const cardNames = cards.filter((c) => !c.is_commander).map((c) => c.card_name);
      const { data, error } = await supabase.functions.invoke('deck-categorize', {
        body: { cards: cardNames },
      });
      if (error || !data?.categories) {
        toast({ title: t('deckEditor.categorizeFailed'), variant: 'destructive' });
        return;
      }
      for (const card of cards) {
        if (card.is_commander) continue;
        const newCat = data.categories[card.card_name];
        if (newCat && newCat !== card.category) updateCard.mutate({ id: card.id, category: newCat });
      }
      toast({
        title: t('deckEditor.categorizeSuccess'),
        description: t('deckEditor.categorizeSuccessDesc').replace('{count}', String(cardNames.length)),
      });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setCategorizingAll(false);
    }
  }, [cards, updateCard, t]);

  // ── Suggest cards ──────────────────────────────────────────────────────
  const handleSuggest = useCallback(async () => {
    if (cards.length < 5) return;
    setSuggestionsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('deck-suggest', {
        body: {
          commander: deck?.commander_name,
          cards: cards.map((c) => ({ name: c.card_name, category: c.category })),
          color_identity: deck?.color_identity,
          format: deck?.format,
        },
      });
      if (error || !data?.suggestions) {
        toast({ title: t('deckEditor.suggestions.failed'), variant: 'destructive' });
        return;
      }
      setSuggestions(data.suggestions);
      setSuggestionsAnalysis(data.analysis || '');
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSuggestionsLoading(false);
    }
  }, [cards, deck, t]);

  const handleAddSuggestion = useCallback(
    async (cardName: string) => {
      try {
        const res = await searchCards(`!"${cardName}"`);
        const card = res.data?.[0];
        if (card) {
          handleAddCard(card);
          toast({ title: t('deckEditor.added'), description: cardName });
        } else {
          addCard.mutate({ card_name: cardName });
          toast({ title: t('deckEditor.added'), description: cardName });
        }
      } catch {
        addCard.mutate({ card_name: cardName });
        toast({ title: t('deckEditor.added'), description: cardName });
      }
    },
    [handleAddCard, addCard, t],
  );

  const handleRemoveByName = useCallback(
    (cardName: string) => {
      const card = cards.find((c) => c.card_name === cardName && c.board !== 'maybeboard');
      if (card) handleRemoveCard(card.id);
    },
    [cards, handleRemoveCard],
  );

  // ── Commander / Companion ──────────────────────────────────────────────
  const handleSetCommander = useCallback(
    (cardId: string, isCommander: boolean) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      if (isCommander) {
        for (const c of cards) {
          if (c.is_commander && c.id !== cardId)
            updateCard.mutate({ id: c.id, is_commander: false, category: c.category || DEFAULT_CATEGORY });
        }
        updateCard.mutate({ id: cardId, is_commander: true });
        updateDeck.mutate({ id: id!, commander_name: card.card_name });
      } else {
        updateCard.mutate({ id: cardId, is_commander: false });
        updateDeck.mutate({ id: id!, commander_name: null });
      }
    },
    [cards, updateCard, updateDeck, id],
  );

  const handleSetCompanion = useCallback(
    (cardId: string, isCompanion: boolean) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      if (isCompanion) {
        for (const c of cards) {
          if (c.is_companion && c.id !== cardId) updateCard.mutate({ id: c.id, is_companion: false });
        }
        updateCard.mutate({ id: cardId, is_companion: true });
        updateDeck.mutate({ id: id!, companion_name: card.card_name });
      } else {
        updateCard.mutate({ id: cardId, is_companion: false });
        updateDeck.mutate({ id: id!, companion_name: null });
      }
    },
    [cards, updateCard, updateDeck, id],
  );

  const handleSetCategory = useCallback(
    (cardId: string, category: string) => {
      updateCard.mutate({ id: cardId, category });
    },
    [updateCard],
  );

  const handleTogglePublic = useCallback(() => {
    if (!deck || !id) return;
    updateDeck.mutate({ id, is_public: !deck.is_public });
    toast({
      title: deck.is_public ? t('deckExport.nowPrivate') : t('deckExport.nowPublic'),
      description: deck.is_public ? t('deckExport.nowPrivateDesc') : t('deckExport.nowPublicDesc'),
    });
  }, [deck, id, updateDeck, t]);

  const handleFormatChange = useCallback(
    (format: string) => {
      if (id) updateDeck.mutate({ id, format });
    },
    [id, updateDeck],
  );

  const handleDescriptionBlur = useCallback(() => {
    if (!id || descriptionInput === (deck?.description || '')) return;
    updateDeck.mutate({ id, description: descriptionInput || null });
  }, [id, descriptionInput, deck?.description, updateDeck]);

  const startEditName = () => {
    setNameInput(deck?.name || '');
    setEditingName(true);
  };

  const saveName = () => {
    if (nameInput.trim() && id) updateDeck.mutate({ id, name: nameInput.trim() });
    setEditingName(false);
  };

  const isReadOnly = !user || deck?.user_id !== user.id;

  return {
    // State
    previewCard,
    setPreviewCard,
    editingName,
    nameInput,
    setNameInput,
    suggestions,
    suggestionsAnalysis,
    suggestionsLoading,
    categorizingAll,
    descriptionOpen,
    setDescriptionOpen,
    descriptionInput,
    setDescriptionInput,
    selectedCardId,
    shortcutsOpen,
    setShortcutsOpen,
    deckViewMode,
    setDeckViewMode,
    deckSortMode,
    setDeckSortMode,
    previewOpen,
    setPreviewOpen,
    scryfallCacheRef,
    scryfallCacheVersion,
    setScryfallCacheVersion,
    searchInputRef,
    isReadOnly,

    // Derived
    ...derived,
    sortedMainboard,
    deckPrice,
    priceLoading,

    // Handlers
    handleSelectCard,
    handleAddCard,
    handleRecategorizeAll,
    handleSuggest,
    handleAddSuggestion,
    handleRemoveByName,
    handleSetCommander,
    handleSetCompanion,
    handleSetCategory,
    handleTogglePublic,
    handleFormatChange,
    handleDescriptionBlur,
    startEditName,
    saveName,
  };
}
