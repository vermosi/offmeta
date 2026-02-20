/**
 * Deck Editor page – three-panel layout for building a deck.
 * Left: Card search (Scryfall + NL). Center: Categorized deck list. Right: Card preview + AI suggestions + combos.
 * @module pages/DeckEditor
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Search, List, Crown, Check, Sparkles, Wand2, Loader2, Zap, Shield,
  Keyboard, DollarSign, LayoutGrid, Columns3, SortAsc, Pencil,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDeck, useDeckCards, useDeckMutations, useDeckCardMutations } from '@/hooks/useDeck';
import type { DeckCard } from '@/hooks/useDeck';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/core/utils';
import { useIsMobile } from '@/hooks/useMobile';
import { searchCards } from '@/lib/scryfall';
import type { ScryfallCard } from '@/types/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { DeckStatsBar } from '@/components/deckbuilder/DeckStats';
import { DeckExportMenu } from '@/components/deckbuilder/DeckExportMenu';
import { useTranslation } from '@/lib/i18n';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FORMATS } from '@/data/formats';
import { VisualCardGrid } from '@/components/deckbuilder/VisualCardGrid';
import { PileView } from '@/components/deckbuilder/PileView';
import { cardImageFetchCache, printingsByName, CATEGORIES } from '@/components/deckbuilder/constants';
import { CategorySection } from '@/components/deckbuilder/CategorySection';
import { SideboardSection } from '@/components/deckbuilder/SideboardSection';
import { MaybeboardSection } from '@/components/deckbuilder/MaybeboardSection';
import { CardSearchPanel } from '@/components/deckbuilder/CardSearchPanel';
import type { CardSuggestion } from '@/components/deckbuilder/SuggestionsPanel';
import { CardPreviewPanel } from '@/components/deckbuilder/CardPreviewPanel';
import { useDeckPrice } from '@/hooks/useDeckPrice';
import { sortDeckCards } from '@/lib/deckbuilder/sort-deck-cards';
import type { DeckSortMode } from '@/lib/deckbuilder/sort-deck-cards';
import { inferCategory, DEFAULT_CATEGORY } from '@/lib/deckbuilder/infer-category';

type DeckViewMode = 'list' | 'visual' | 'pile';

// ── Main Editor ──
export default function DeckEditor() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const { data: deck, isLoading: deckLoading } = useDeck(id);
  const { data: cards = [], isLoading: cardsLoading } = useDeckCards(id);
  const { updateDeck } = useDeckMutations();
  const { addCard, removeCard, setQuantity, updateCard } = useDeckCardMutations(id);

  const [previewCard, setPreviewCard] = useState<ScryfallCard | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [mobileTab, setMobileTab] = useState<'search' | 'list' | 'preview'>('list');
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [suggestionsAnalysis, setSuggestionsAnalysis] = useState('');
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [categorizingAll, setCategorizingAll] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // When a card is selected in the deck list, also load its preview
  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    // Check scryfall cache first
    const cached = scryfallCacheRef.current.get(card.card_name);
    if (cached) {
      setPreviewCard(cached);
      return;
    }
    // Fetch from Scryfall if not cached
    searchCards(`!"${card.card_name}"`).then((res) => {
      const sc = res.data?.[0];
      if (sc) {
        scryfallCacheRef.current.set(card.card_name, sc);
        setScryfallCacheVersion((v) => v + 1);
        setPreviewCard(sc);
      }
    }).catch(() => { /* silent */ });
  }, [cards]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [deckViewMode, setDeckViewMode] = useState<DeckViewMode>('list');
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>('category');
  const scryfallCacheRef = useRef<Map<string, ScryfallCard>>(new Map());
  const [scryfallCacheVersion, setScryfallCacheVersion] = useState(0);
  const importProcessedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync description input when deck loads
  useEffect(() => {
    if (deck?.description !== undefined) setDescriptionInput(deck.description || '');
  }, [deck?.description]);

  // Clear module-level caches on unmount so stale data doesn't bleed
  // across different deck sessions opened in the same browser tab.
  useEffect(() => {
    return () => {
      printingsByName.clear();
      cardImageFetchCache.clear();
    };
  }, []);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      if (e.key === '?' && !isInput) { e.preventDefault(); setShortcutsOpen((o) => !o); return; }
      if (isInput || !user) return;
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); return; }
      if (e.key === 'Delete' && selectedCardId) { e.preventDefault(); removeCard.mutate(selectedCardId); setSelectedCardId(null); return; }
      if (e.key === 'S' && e.shiftKey && selectedCardId) { e.preventDefault(); updateCard.mutate({ id: selectedCardId, board: 'sideboard' }); setSelectedCardId(null); return; }
      if (e.key === 'M' && e.shiftKey && selectedCardId) { e.preventDefault(); updateCard.mutate({ id: selectedCardId, board: 'maybeboard' }); setSelectedCardId(null); return; }
      if (e.key === 'Escape') { setSelectedCardId(null); setShortcutsOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, selectedCardId, removeCard, updateCard]);

  // ── Handle imported cards from navigation state ──
  useEffect(() => {
    const state = location.state as { importCards?: { name: string; quantity: number }[]; importCommander?: string | null } | null;
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
      toast({ title: t('deckEditor.cardsImported'), description: t('deckEditor.cardsImportedDesc').replace('{count}', String(state.importCards!.length)) });
      navigate(location.pathname, { replace: true, state: null });
    };
    importCards();
  }, [id, location.state, addCard, navigate, location.pathname, t]);

  // Separate mainboard, sideboard, and maybeboard
  const mainboardCards = useMemo(() => cards.filter((c) => c.board !== 'sideboard' && c.board !== 'maybeboard'), [cards]);
  const sideboardCards = useMemo(() => cards.filter((c) => c.board === 'sideboard'), [cards]);
  const maybeboardCards = useMemo(() => cards.filter((c) => c.board === 'maybeboard'), [cards]);

  // Group mainboard cards by category
  const grouped = useMemo(() => {
    const groups: Record<string, DeckCard[]> = {};
    for (const card of mainboardCards) {
      const cat = card.is_commander ? 'Commander' : card.category || DEFAULT_CATEGORY;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(card);
    }
    const sorted: [string, DeckCard[]][] = [];
    for (const cat of CATEGORIES) {
      if (groups[cat]) sorted.push([cat, groups[cat]]);
    }
    for (const [cat, catCards] of Object.entries(groups)) {
      if (!(CATEGORIES as readonly string[]).includes(cat)) sorted.push([cat, catCards]);
    }
    return sorted;
  }, [mainboardCards]);

  const totalMainboard = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalSideboard = sideboardCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalMaybeboard = maybeboardCards.reduce((sum, c) => sum + c.quantity, 0);
  const formatConfig = FORMATS.find((f) => f.value === deck?.format) ?? FORMATS[0];
  const formatMax = formatConfig.max;
  const { total: deckPrice, loading: priceLoading } = useDeckPrice(mainboardCards, scryfallCacheRef, () => setScryfallCacheVersion((v) => v + 1));

  // Sorted flat list for visual/pile views — must be before early returns (Rules of Hooks)
  const sortedMainboard = useMemo(
    () => deckSortMode === 'category'
      ? mainboardCards
      : sortDeckCards(mainboardCards, deckSortMode, scryfallCacheRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainboardCards, deckSortMode, scryfallCacheVersion],
  );

  const handleAddCard = useCallback(
    async (card: ScryfallCard) => {
      scryfallCacheRef.current.set(card.name, card);
      setScryfallCacheVersion((v) => v + 1);
      const typeCategory = inferCategory(card);
      addCard.mutate({ card_name: card.name, category: typeCategory, scryfall_id: card.id });
      try {
        const { data, error } = await supabase.functions.invoke('deck-categorize', { body: { cards: [card.name] } });
        if (!error && data?.categories?.[card.name]) {
          const aiCategory = data.categories[card.name];
          if (aiCategory !== typeCategory) {
            setTimeout(async () => {
              const { data: deckCards } = await supabase.from('deck_cards').select('id')
                .eq('deck_id', id!).eq('card_name', card.name).eq('board', 'mainboard')
                .order('created_at', { ascending: false }).limit(1).single();
              if (deckCards) updateCard.mutate({ id: deckCards.id, category: aiCategory });
            }, 500);
          }
        }
      } catch { /* silent */ }
    }, [addCard, id, updateCard],
  );

  const handleRecategorizeAll = useCallback(async () => {
    if (cards.length === 0) return;
    setCategorizingAll(true);
    try {
      const cardNames = cards.filter((c) => !c.is_commander).map((c) => c.card_name);
      const { data, error } = await supabase.functions.invoke('deck-categorize', { body: { cards: cardNames } });
      if (error || !data?.categories) {
        toast({ title: t('deckEditor.categorizeFailed'), description: t('deckEditor.categorizeFailedDesc'), variant: 'destructive' });
        return;
      }
      for (const card of cards) {
        if (card.is_commander) continue;
        const newCat = data.categories[card.card_name];
        if (newCat && newCat !== card.category) {
          updateCard.mutate({ id: card.id, category: newCat });
        }
      }
      toast({ title: t('deckEditor.categorizeSuccess'), description: t('deckEditor.categorizeSuccessDesc').replace('{count}', String(cardNames.length)) });
    } catch {
      toast({ title: 'Error', description: t('deckEditor.categorizeFailed'), variant: 'destructive' });
    } finally { setCategorizingAll(false); }
  }, [cards, updateCard, t]);

  const handleSuggest = useCallback(async () => {
    if (cards.length < 5) return;
    setSuggestionsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('deck-suggest', {
        body: { commander: deck?.commander_name, cards: cards.map((c) => ({ name: c.card_name, category: c.category })),
          color_identity: deck?.color_identity, format: deck?.format },
      });
      if (error || !data?.suggestions) {
        toast({ title: t('deckEditor.suggestions.failed'), description: t('deckEditor.suggestions.failedDesc'), variant: 'destructive' });
        return;
      }
      setSuggestions(data.suggestions);
      setSuggestionsAnalysis(data.analysis || '');
    } catch {
      toast({ title: 'Error', description: t('deckEditor.suggestions.failed'), variant: 'destructive' });
    } finally { setSuggestionsLoading(false); }
  }, [cards, deck, t]);

  const handleAddSuggestion = useCallback(async (cardName: string) => {
    try {
      const res = await searchCards(`!"${cardName}"`);
      const card = res.data?.[0];
      if (card) { handleAddCard(card); toast({ title: t('deckEditor.added'), description: cardName }); }
      else { addCard.mutate({ card_name: cardName }); toast({ title: t('deckEditor.added'), description: cardName }); }
    } catch { addCard.mutate({ card_name: cardName }); toast({ title: t('deckEditor.added'), description: cardName }); }
  }, [handleAddCard, addCard, t]);

  const handleSetCommander = useCallback((cardId: string, isCommander: boolean) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    if (isCommander) {
      for (const c of cards) {
        if (c.is_commander && c.id !== cardId) updateCard.mutate({ id: c.id, is_commander: false, category: c.category || DEFAULT_CATEGORY });
      }
      updateCard.mutate({ id: cardId, is_commander: true });
      updateDeck.mutate({ id: id!, commander_name: card.card_name });
    } else {
      updateCard.mutate({ id: cardId, is_commander: false });
      updateDeck.mutate({ id: id!, commander_name: null });
    }
  }, [cards, updateCard, updateDeck, id]);

  const handleSetCompanion = useCallback((cardId: string, isCompanion: boolean) => {
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
  }, [cards, updateCard, updateDeck, id]);

  const handleSetCategory = useCallback((cardId: string, category: string) => {
    updateCard.mutate({ id: cardId, category });
  }, [updateCard]);

  const handleMoveToSideboard = useCallback((cardId: string, toSideboard: boolean) => {
    updateCard.mutate({ id: cardId, board: toSideboard ? 'sideboard' : 'mainboard' });
  }, [updateCard]);

  const handleMoveToMaybeboard = useCallback((cardId: string) => {
    updateCard.mutate({ id: cardId, board: 'maybeboard' });
  }, [updateCard]);

  const handleTogglePublic = useCallback(() => {
    if (!deck || !id) return;
    updateDeck.mutate({ id, is_public: !deck.is_public });
    toast({ title: deck.is_public ? t('deckExport.nowPrivate') : t('deckExport.nowPublic'),
      description: deck.is_public ? t('deckExport.nowPrivateDesc') : t('deckExport.nowPublicDesc') });
  }, [deck, id, updateDeck, t]);

  const handleFormatChange = useCallback((format: string) => {
    if (!id) return;
    updateDeck.mutate({ id, format });
  }, [id, updateDeck]);

  const handleDescriptionBlur = useCallback(() => {
    if (!id || descriptionInput === (deck?.description || '')) return;
    updateDeck.mutate({ id, description: descriptionInput || null });
  }, [id, descriptionInput, deck?.description, updateDeck]);

  const startEditName = () => { setNameInput(deck?.name || ''); setEditingName(true); };
  const saveName = () => { if (nameInput.trim() && id) updateDeck.mutate({ id, name: nameInput.trim() }); setEditingName(false); };

  if (deckLoading) return (
    <div className="min-h-screen flex flex-col bg-background"><Header />
      <div className="flex-1 flex items-center justify-center"><div className="h-8 w-48 shimmer rounded-lg" /></div></div>
  );

  if (!deck) return (
    <div className="min-h-screen flex flex-col bg-background"><Header />
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">{t('deckEditor.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/deckbuilder')}><ArrowLeft className="h-4 w-4 mr-2" />{t('deckEditor.backToDecks')}</Button>
      </div></div>
  );

  const isReadOnly = !user || (deck.user_id !== user.id);
  const previewPanelProps = {
    card: previewCard, suggestions, suggestionsAnalysis, suggestionsLoading,
    onSuggest: handleSuggest, onAddSuggestion: handleAddSuggestion,
    cardCount: cards.length, deckCards: cards, commanderName: deck.commander_name,
  };

  // ── Deck Header Bar ──
  const deckHeader = (
    <div className="border-b border-border">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
        <Link to="/deckbuilder" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {editingName && !isReadOnly ? (
          <div className="flex items-center gap-2 flex-1">
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveName()} className="text-sm h-8" autoFocus />
            <Button size="sm" variant="ghost" onClick={saveName}><Check className="h-4 w-4" /></Button>
          </div>
        ) : (
          <button onClick={isReadOnly ? undefined : startEditName}
            className={cn('flex items-center gap-1.5 text-left flex-1 min-w-0', !isReadOnly && 'group')}>
            <h2 className={cn('font-semibold truncate', isMobile && 'text-sm')}>{deck.name}</h2>
            {!isReadOnly && <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
          </button>
        )}
        {!isReadOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 shrink-0 hidden sm:flex">
                <Zap className="h-3 w-3" />
                {formatConfig.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {FORMATS.map((f) => (
                <DropdownMenuItem key={f.value} onClick={() => handleFormatChange(f.value)}
                  className={cn('text-xs', deck.format === f.value && 'text-accent font-medium')}>
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!isReadOnly && cards.length >= 3 && (
          <Button size="sm" variant="ghost" onClick={handleRecategorizeAll} disabled={categorizingAll}
            className="h-7 text-[11px] gap-1 hidden sm:flex" title="AI re-categorize all cards">
            {categorizingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            {t('deckEditor.categorize')}
          </Button>
        )}
        {!isReadOnly && <DeckExportMenu deck={deck} cards={cards} onTogglePublic={handleTogglePublic} />}
        {mainboardCards.length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0"
            title="Estimated TCGplayer price (mainboard only)">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            {priceLoading
              ? <span className="w-10 h-3 shimmer rounded inline-block" />
              : deckPrice !== null
                ? deckPrice.toFixed(2)
                : <span className="text-muted-foreground text-[10px]">—</span>}
          </span>
        )}
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
          totalMainboard >= formatMax ? 'bg-accent/10 text-accent' : 'bg-secondary text-secondary-foreground')}>
          {totalMainboard}/{formatMax}
          {totalSideboard > 0 && <span className="text-muted-foreground"> +{totalSideboard}sb</span>}
          {totalMaybeboard > 0 && <span className="text-muted-foreground"> +{totalMaybeboard}mb</span>}
        </span>
      </div>
      {(deck.commander_name || deck.companion_name) && (
        <div className="px-3 sm:px-4 pb-1 flex items-center gap-2 flex-wrap">
          {deck.commander_name && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              <Crown className="h-2.5 w-2.5" />{deck.commander_name}
            </span>
          )}
          {deck.companion_name && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Shield className="h-2.5 w-2.5" />{deck.companion_name}
            </span>
          )}
        </div>
      )}
      {!isReadOnly && (
        <div className="px-3 sm:px-4 pb-2">
          {descriptionOpen ? (
            <Textarea
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              onBlur={() => { handleDescriptionBlur(); setDescriptionOpen(false); }}
              placeholder={t('deckEditor.descriptionPlaceholder')}
              rows={2}
              className="text-xs resize-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setDescriptionOpen(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors text-left truncate w-full"
            >
              {descriptionInput || t('deckEditor.addNotes')}
            </button>
          )}
        </div>
      )}
      {isReadOnly && deck.description && (
        <div className="px-3 sm:px-4 pb-2">
          <p className="text-[11px] text-muted-foreground">{deck.description}</p>
        </div>
      )}
    </div>
  );

  // ── View/Sort Toolbar ──
  const viewSortToolbar = cards.length > 0 && (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-card/50">
      <div className="flex items-center gap-0.5 p-0.5 bg-secondary/50 rounded-md">
        {([
          { mode: 'list' as DeckViewMode, icon: List, label: t('deckEditor.view.list') },
          { mode: 'visual' as DeckViewMode, icon: LayoutGrid, label: t('deckEditor.view.visual') },
          { mode: 'pile' as DeckViewMode, icon: Columns3, label: t('deckEditor.view.pile') },
        ] as const).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setDeckViewMode(mode)}
            title={label}
            className={cn(
              'p-1.5 rounded transition-colors',
              deckViewMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-secondary/50">
            <SortAsc className="h-3.5 w-3.5" />
            <span className="hidden sm:inline capitalize">{deckSortMode}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36 bg-popover border border-border z-50">
          {(['category', 'name', 'cmc', 'color', 'type', 'price'] as DeckSortMode[]).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => setDeckSortMode(s)}
              className={cn('text-xs capitalize', deckSortMode === s && 'text-accent font-medium')}
            >
              {t(`deckEditor.sort.${s}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const categorySection = (
    <>
      {grouped.map(([category, catCards]) => (
        <CategorySection
          key={category}
          category={category}
          cards={catCards}
          isReadOnly={isReadOnly}
          selectedCardId={selectedCardId}
          onSelectCard={handleSelectCard}
          onRemove={(cardId) => removeCard.mutate(cardId)}
          onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
          onSetCommander={handleSetCommander}
          onSetCompanion={handleSetCompanion}
          onSetCategory={handleSetCategory}
          onMoveToSideboard={(cardId, toSb) => handleMoveToSideboard(cardId, toSb)}
          onMoveToMaybeboard={handleMoveToMaybeboard}
          scryfallCache={scryfallCacheRef}
          onChangePrinting={(cardId, p) => updateCard.mutate({ id: cardId, scryfall_id: p.id })}
          cacheVersion={scryfallCacheVersion}
        />
      ))}
      <SideboardSection
        cards={sideboardCards}
        isReadOnly={isReadOnly}
        onRemove={(cardId) => removeCard.mutate(cardId)}
        onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
        onMoveToMainboard={(cardId) => handleMoveToSideboard(cardId, false)}
        scryfallCache={scryfallCacheRef}
        onChangePrinting={(cardId, p) => updateCard.mutate({ id: cardId, scryfall_id: p.id })}
        cacheVersion={scryfallCacheVersion}
      />
      <MaybeboardSection
        cards={maybeboardCards}
        isReadOnly={isReadOnly}
        onRemove={(cardId) => removeCard.mutate(cardId)}
        onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
        onMoveToMainboard={(cardId) => handleMoveToSideboard(cardId, false)}
        onMoveToSideboard={(cardId) => updateCard.mutate({ id: cardId, board: 'sideboard' })}
        scryfallCache={scryfallCacheRef}
        onChangePrinting={(cardId, p) => updateCard.mutate({ id: cardId, scryfall_id: p.id })}
        cacheVersion={scryfallCacheVersion}
      />
    </>
  );

  const deckListContent = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {viewSortToolbar}
      <div className={cn('flex-1 overflow-y-auto', deckViewMode !== 'pile' ? 'p-2 space-y-1' : 'overflow-x-auto')}>
        {cardsLoading ? (
          <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 shimmer rounded-lg" />)}</div>
        ) : cards.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
            <p className="text-center">{isReadOnly ? t('deckEditor.emptyDeckReadOnly') : t('deckEditor.emptyDeck')}</p>
          </div>
        ) : deckViewMode === 'visual' ? (
          <VisualCardGrid
            cards={deckSortMode === 'category' ? mainboardCards : sortedMainboard}
            scryfallCache={scryfallCacheRef}
            onSelectCard={handleSelectCard}
            selectedCardId={selectedCardId}
            onRemove={(cardId) => removeCard.mutate(cardId)}
            onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
            isReadOnly={isReadOnly}
          />
        ) : deckViewMode === 'pile' ? (
          <PileView
            mainboardCards={mainboardCards}
            scryfallCache={scryfallCacheRef}
            onSelectCard={handleSelectCard}
            selectedCardId={selectedCardId}
          />
        ) : (
          categorySection
        )}
      </div>
    </div>
  );

  const statsBar = cards.length > 0 && (
    <DeckStatsBar cards={mainboardCards} scryfallCache={scryfallCacheRef.current} formatMax={formatMax} />
  );

  // ── Desktop Layout ──
  const desktopLayout = (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {!isReadOnly && (
          <div className="w-80 border-r border-border flex flex-col bg-card">
            <CardSearchPanel onAddCard={handleAddCard} onPreview={setPreviewCard} searchInputRef={searchInputRef} />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          {deckHeader}
          {deckListContent}
        </div>
        <div className={cn('border-l border-border bg-card flex flex-col overflow-hidden', isReadOnly ? 'w-80' : 'w-72')}>
          <CardPreviewPanel {...previewPanelProps} />
        </div>
      </div>
      {statsBar}
    </div>
  );

  // ── Mobile Layout ──
  const mobileTabs = isReadOnly
    ? [{ key: 'list' as const, icon: List, label: t('deckEditor.tab.deck') }, { key: 'preview' as const, icon: Sparkles, label: t('deckEditor.tab.details') }]
    : [{ key: 'search' as const, icon: Search, label: t('deckEditor.tab.search') }, { key: 'list' as const, icon: List, label: t('deckEditor.tab.deck') }, { key: 'preview' as const, icon: Sparkles, label: t('deckEditor.tab.ai') }];

  const mobileLayout = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {deckHeader}
      <div className="flex border-b border-border">
        {mobileTabs.map((tab) => (
          <button key={tab.key} onClick={() => setMobileTab(tab.key)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
              mobileTab === tab.key ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground')}>
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {mobileTab === 'search' && !isReadOnly && (
          <CardSearchPanel onAddCard={handleAddCard} onPreview={(card) => { setPreviewCard(card); setMobileTab('preview'); }} />
        )}
        {mobileTab === 'list' && deckListContent}
        {mobileTab === 'preview' && <CardPreviewPanel {...previewPanelProps} />}
      </div>
      {statsBar}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      {isMobile ? mobileLayout : desktopLayout}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="bg-popover border border-border rounded-xl shadow-2xl p-5 w-72 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-muted-foreground" />
                {t('deckEditor.shortcuts.title')}
              </h3>
              <button onClick={() => setShortcutsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors text-xs">✕</button>
            </div>
            <ul className="space-y-2 text-xs">
              {([
                { keys: ['/'], desc: t('deckEditor.shortcuts.focusSearch') },
                { keys: ['Del'], desc: t('deckEditor.shortcuts.removeCard') },
                { keys: ['Shift', 'S'], desc: t('deckEditor.shortcuts.toSideboard') },
                { keys: ['Shift', 'M'], desc: t('deckEditor.shortcuts.toMaybeboard') },
                { keys: ['?'], desc: t('deckEditor.shortcuts.toggleHelp') },
                { keys: ['Esc'], desc: t('deckEditor.shortcuts.deselectClose') },
              ] as const).map(({ keys, desc }) => (
                <li key={desc} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{desc}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {keys.map((k) => (
                      <kbd key={k} className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary border border-border font-mono text-[10px] leading-none">{k}</kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted-foreground">{t('deckEditor.shortcuts.hint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
