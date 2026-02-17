/**
 * Deck Editor page – three-panel layout for building a deck.
 * Left: Card search (Scryfall + NL). Center: Categorized deck list. Right: Card preview + AI suggestions + combos.
 * @module pages/DeckEditor
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  List,
  Plus,
  Minus,
  Trash2,
  Crown,
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  Sparkles,
  Wand2,
  Loader2,
  Brain,
  Zap,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDeck, useDeckCards, useDeckMutations, useDeckCardMutations } from '@/hooks/useDeck';
import type { DeckCard } from '@/hooks/useDeck';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/core/utils';
import { useIsMobile } from '@/hooks/useMobile';
import { searchCards } from '@/lib/scryfall';
import type { ScryfallCard } from '@/types/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { DeckStatsBar } from '@/components/deckbuilder/DeckStats';
import { DeckCombos } from '@/components/deckbuilder/DeckCombos';

// ── Constants ──
const CATEGORIES = [
  'Commander', 'Creatures', 'Instants', 'Sorceries', 'Artifacts',
  'Enchantments', 'Planeswalkers', 'Lands', 'Ramp', 'Removal',
  'Draw', 'Protection', 'Combo', 'Recursion', 'Utility', 'Finisher', 'Other',
] as const;

const DEFAULT_CATEGORY = 'Other';

function inferCategory(card: ScryfallCard): string {
  const type = card.type_line?.toLowerCase() || '';
  if (type.includes('land')) return 'Lands';
  if (type.includes('creature')) return 'Creatures';
  if (type.includes('instant')) return 'Instants';
  if (type.includes('sorcery')) return 'Sorceries';
  if (type.includes('artifact')) return 'Artifacts';
  if (type.includes('enchantment')) return 'Enchantments';
  if (type.includes('planeswalker')) return 'Planeswalkers';
  return DEFAULT_CATEGORY;
}

// ── Types for AI features ──
interface CardSuggestion {
  card_name: string;
  reason: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

// ── Card Search Panel (with NL toggle) ──
function CardSearchPanel({
  onAddCard,
  onPreview,
}: {
  onAddCard: (card: ScryfallCard) => void;
  onPreview: (card: ScryfallCard) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mode, setMode] = useState<'name' | 'smart'>('name');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      if (mode === 'smart') {
        const { data: nlData, error: nlError } = await supabase.functions.invoke('semantic-search', {
          body: { query: query.trim(), useCache: true },
        });
        if (nlError || !nlData?.scryfallQuery) {
          const res = await searchCards(query.trim());
          setResults(res.data || []);
        } else {
          const res = await searchCards(nlData.scryfallQuery);
          setResults(res.data || []);
        }
      } else {
        const res = await searchCards(query.trim());
        setResults(res.data || []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex gap-1 p-0.5 bg-secondary/50 rounded-lg">
          <button
            onClick={() => setMode('name')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded-md transition-colors',
              mode === 'name' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Search className="h-3 w-3" />
            Name Search
          </button>
          <button
            onClick={() => setMode('smart')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded-md transition-colors',
              mode === 'smart' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Sparkles className="h-3 w-3" />
            Smart Search
          </button>
        </div>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={mode === 'smart' ? 'e.g. "cheap green ramp that draws"' : 'Search by card name...'}
            className="text-sm"
          />
          <Button size="sm" onClick={handleSearch} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {mode === 'smart' && (
          <p className="text-[10px] text-muted-foreground">Powered by AI — describe what you need in plain English.</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 shimmer rounded-lg" />)}
          </div>
        ) : results.length === 0 && searched ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No results found.</p>
        ) : (
          <ul className="divide-y divide-border">
            {results.slice(0, 50).map((card) => (
              <li
                key={card.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 cursor-pointer transition-colors group"
                onClick={() => onPreview(card)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {card.mana_cost?.replace(/[{}]/g, '')} · {card.type_line}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddCard(card); }}
                  className="p-1 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={`Add ${card.name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Category Section ──
function CategorySection({
  category, cards, onRemove, onSetQuantity, onSetCommander,
}: {
  category: string;
  cards: DeckCard[];
  onRemove: (id: string) => void;
  onSetQuantity: (cardId: string, qty: number) => void;
  onSetCommander: (cardId: string, isCommander: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const totalQty = cards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary/30 transition-colors rounded-lg text-left">
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-xs font-semibold text-foreground">{category}</span>
        <span className="text-[10px] text-muted-foreground">({totalQty})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="ml-2 border-l border-border/50">
          {cards.map((card) => (
            <li key={card.id} className="flex items-center gap-1 px-2 py-1 hover:bg-secondary/30 transition-colors group text-sm">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{card.quantity}×</span>
              <span className={cn('flex-1 truncate text-xs', card.is_commander && 'font-semibold text-accent')}>
                {card.card_name}
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onSetCommander(card.id, !card.is_commander)}
                  className={cn('p-0.5 rounded text-muted-foreground hover:text-accent transition-colors', card.is_commander && 'text-accent')}
                  aria-label="Toggle commander" title="Set as commander">
                  <Crown className="h-3 w-3" />
                </button>
                <button onClick={() => onSetQuantity(card.id, card.quantity - 1)} className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                  <Minus className="h-3 w-3" />
                </button>
                <button onClick={() => onSetQuantity(card.id, card.quantity + 1)} className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-3 w-3" />
                </button>
                <button onClick={() => onRemove(card.id)} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── AI Suggestions Panel ──
function SuggestionsPanel({
  suggestions, analysis, loading, onSuggest, onAddSuggestion, cardCount,
}: {
  suggestions: CardSuggestion[];
  analysis: string;
  loading: boolean;
  onSuggest: () => void;
  onAddSuggestion: (name: string) => void;
  cardCount: number;
}) {
  const priorityColor = { high: 'text-accent', medium: 'text-foreground', low: 'text-muted-foreground' };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-accent" />
          AI Suggestions
        </h3>
        <Button size="sm" variant="outline" onClick={onSuggest} disabled={loading || cardCount < 5} className="h-7 text-[11px] gap-1">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {loading ? 'Analyzing...' : 'Suggest'}
        </Button>
      </div>
      {cardCount < 5 && <p className="text-[10px] text-muted-foreground">Add at least 5 cards to get AI suggestions.</p>}
      {analysis && <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2">{analysis}</p>}
      {suggestions.length > 0 && (
        <ul className="space-y-1.5">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-semibold', priorityColor[s.priority])}>{s.card_name}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground">{s.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{s.reason}</p>
              </div>
              <button onClick={() => onAddSuggestion(s.card_name)}
                className="p-1 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                aria-label={`Add ${s.card_name}`}>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Card Preview Panel (with suggestions + combos) ──
function CardPreviewPanel({
  card, suggestions, suggestionsAnalysis, suggestionsLoading,
  onSuggest, onAddSuggestion, cardCount, deckCards, commanderName,
}: {
  card: ScryfallCard | null;
  suggestions: CardSuggestion[];
  suggestionsAnalysis: string;
  suggestionsLoading: boolean;
  onSuggest: () => void;
  onAddSuggestion: (name: string) => void;
  cardCount: number;
  deckCards: DeckCard[];
  commanderName: string | null;
}) {
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
          <p>Click a card to preview it.</p>
        </div>
      )}

      <div className="border-t border-border" />
      <DeckCombos cards={deckCards} commanderName={commanderName} onAddCard={onAddSuggestion} />

      <div className="border-t border-border" />
      <SuggestionsPanel
        suggestions={suggestions} analysis={suggestionsAnalysis} loading={suggestionsLoading}
        onSuggest={onSuggest} onAddSuggestion={onAddSuggestion} cardCount={cardCount}
      />
    </div>
  );
}

// ── Main Editor ──
export default function DeckEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const queryClient = useQueryClient();
  const scryfallCacheRef = useRef<Map<string, ScryfallCard>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scryfallCacheVersion, setScryfallCacheVersion] = useState(0);

  // Group cards by category
  const grouped = useMemo(() => {
    const groups: Record<string, DeckCard[]> = {};
    for (const card of cards) {
      const cat = card.is_commander ? 'Commander' : card.category || DEFAULT_CATEGORY;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(card);
    }
    const sorted: [string, DeckCard[]][] = [];
    for (const cat of CATEGORIES) {
      if (groups[cat]) sorted.push([cat, groups[cat]]);
    }
    for (const [cat, catCards] of Object.entries(groups)) {
      if (!CATEGORIES.includes(cat as any)) sorted.push([cat, catCards]);
    }
    return sorted;
  }, [cards]);

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const formatMax = deck?.format === 'commander' ? 100 : 60;

  // ── AI: Auto-categorize new cards ──
  const handleAddCard = useCallback(
    async (card: ScryfallCard) => {
      scryfallCacheRef.current.set(card.name, card);
      setScryfallCacheVersion((v) => v + 1);

      const typeCategory = inferCategory(card);
      addCard.mutate({ card_name: card.name, category: typeCategory, scryfall_id: card.id });

      try {
        const { data, error } = await supabase.functions.invoke('deck-categorize', {
          body: { cards: [card.name] },
        });
        if (!error && data?.categories?.[card.name]) {
          const aiCategory = data.categories[card.name];
          if (aiCategory !== typeCategory) {
            setTimeout(async () => {
              const { data: deckCards } = await supabase
                .from('deck_cards').select('id')
                .eq('deck_id', id!).eq('card_name', card.name).eq('board', 'mainboard')
                .order('created_at', { ascending: false }).limit(1).single();
              if (deckCards) updateCard.mutate({ id: deckCards.id, category: aiCategory });
            }, 500);
          }
        }
      } catch {
        // Silently fail
      }
    },
    [addCard, id, updateCard],
  );

  // ── AI: Re-categorize all cards ──
  const handleRecategorizeAll = useCallback(async () => {
    if (cards.length === 0) return;
    setCategorizingAll(true);
    try {
      const cardNames = cards.filter((c) => !c.is_commander).map((c) => c.card_name);
      const { data, error } = await supabase.functions.invoke('deck-categorize', { body: { cards: cardNames } });
      if (error || !data?.categories) {
        toast({ title: 'Categorization failed', description: 'Could not reach AI service.', variant: 'destructive' });
        return;
      }
      for (const card of cards) {
        if (card.is_commander) continue;
        const newCat = data.categories[card.card_name];
        if (newCat && newCat !== card.category) {
          await supabase.from('deck_cards').update({ category: newCat }).eq('id', card.id);
        }
      }
      toast({ title: 'Categories updated', description: `AI re-categorized ${cardNames.length} cards.` });
      queryClient.invalidateQueries({ queryKey: ['deck-cards', id] });
    } catch {
      toast({ title: 'Error', description: 'Categorization failed.', variant: 'destructive' });
    } finally {
      setCategorizingAll(false);
    }
  }, [cards, id, queryClient]);

  // ── AI: Get suggestions ──
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
        toast({ title: 'Suggestions failed', description: 'Could not reach AI service.', variant: 'destructive' });
        return;
      }
      setSuggestions(data.suggestions);
      setSuggestionsAnalysis(data.analysis || '');
    } catch {
      toast({ title: 'Error', description: 'Suggestion failed.', variant: 'destructive' });
    } finally {
      setSuggestionsLoading(false);
    }
  }, [cards, deck]);

  // ── Add a suggested card ──
  const handleAddSuggestion = useCallback(
    async (cardName: string) => {
      try {
        const res = await searchCards(`!"${cardName}"`);
        const card = res.data?.[0];
        if (card) {
          handleAddCard(card);
          toast({ title: 'Added', description: cardName });
        } else {
          addCard.mutate({ card_name: cardName });
          toast({ title: 'Added', description: cardName });
        }
      } catch {
        addCard.mutate({ card_name: cardName });
        toast({ title: 'Added', description: cardName });
      }
    },
    [handleAddCard, addCard],
  );

  const handleSetCommander = useCallback(
    (cardId: string, isCommander: boolean) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      if (isCommander) {
        for (const c of cards) {
          if (c.is_commander && c.id !== cardId) {
            updateCard.mutate({ id: c.id, is_commander: false, category: c.category || DEFAULT_CATEGORY });
          }
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

  const startEditName = () => { setNameInput(deck?.name || ''); setEditingName(true); };
  const saveName = () => {
    if (nameInput.trim() && id) updateDeck.mutate({ id, name: nameInput.trim() });
    setEditingName(false);
  };

  if (deckLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center"><div className="h-8 w-48 shimmer rounded-lg" /></div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-muted-foreground">Deck not found.</p>
          <Button variant="outline" onClick={() => navigate('/deckbuilder')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Decks
          </Button>
        </div>
      </div>
    );
  }

  const previewPanelProps = {
    card: previewCard,
    suggestions,
    suggestionsAnalysis,
    suggestionsLoading,
    onSuggest: handleSuggest,
    onAddSuggestion: handleAddSuggestion,
    cardCount: cards.length,
    deckCards: cards,
    commanderName: deck.commander_name,
  };

  // ── Deck Header Bar ──
  const deckHeader = (
    <div className="px-4 py-3 border-b border-border flex items-center gap-3">
      <Link to="/deckbuilder" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      {editingName ? (
        <div className="flex items-center gap-2 flex-1">
          <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveName()} className="text-sm h-8" autoFocus />
          <Button size="sm" variant="ghost" onClick={saveName}><Check className="h-4 w-4" /></Button>
        </div>
      ) : (
        <button onClick={startEditName} className="flex items-center gap-1.5 group text-left flex-1 min-w-0">
          <h2 className={cn('font-semibold truncate', isMobile && 'text-sm')}>{deck.name}</h2>
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
      {cards.length >= 3 && (
        <Button size="sm" variant="ghost" onClick={handleRecategorizeAll} disabled={categorizingAll}
          className="h-7 text-[11px] gap-1 hidden sm:flex" title="AI re-categorize all cards">
          {categorizingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          Categorize
        </Button>
      )}
      <span className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-full',
        totalCards >= formatMax ? 'bg-accent/10 text-accent' : 'bg-secondary text-secondary-foreground',
      )}>
        {totalCards}/{formatMax}
      </span>
    </div>
  );

  // ── Deck List Content ──
  const deckListContent = (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {cardsLoading ? (
        <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 shimmer rounded-lg" />)}</div>
      ) : cards.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          <p className="text-center">Search for cards on the left and click <Plus className="h-3 w-3 inline" /> to add them.</p>
        </div>
      ) : (
        grouped.map(([category, catCards]) => (
          <CategorySection key={category} category={category} cards={catCards}
            onRemove={(cardId) => removeCard.mutate(cardId)}
            onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
            onSetCommander={handleSetCommander} />
        ))
      )}
    </div>
  );

  // ── Stats Bar ──
  const statsBar = cards.length > 0 && (
    <DeckStatsBar cards={cards} scryfallCache={scryfallCacheRef.current} formatMax={formatMax} />
  );

  // ── Desktop Layout ──
  const desktopLayout = (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <CardSearchPanel onAddCard={handleAddCard} onPreview={setPreviewCard} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {deckHeader}
          {deckListContent}
        </div>
        <div className="w-72 border-l border-border bg-card flex flex-col overflow-hidden">
          <CardPreviewPanel {...previewPanelProps} />
        </div>
      </div>
      {statsBar}
    </div>
  );

  // ── Mobile Layout ──
  const mobileLayout = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {deckHeader}
      <div className="flex border-b border-border">
        {([
          { key: 'search' as const, icon: Search, label: 'Search' },
          { key: 'list' as const, icon: List, label: 'Deck' },
          { key: 'preview' as const, icon: Sparkles, label: 'AI' },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setMobileTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
              mobileTab === tab.key ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground',
            )}>
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {mobileTab === 'search' && (
          <CardSearchPanel onAddCard={handleAddCard} onPreview={(card) => { setPreviewCard(card); setMobileTab('preview'); }} />
        )}
        {mobileTab === 'list' && (
          <div className="overflow-y-auto h-full p-2 space-y-1">
            {cards.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
                <p className="text-center">Tap "Search" to find and add cards.</p>
              </div>
            ) : (
              grouped.map(([category, catCards]) => (
                <CategorySection key={category} category={category} cards={catCards}
                  onRemove={(cardId) => removeCard.mutate(cardId)}
                  onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
                  onSetCommander={handleSetCommander} />
              ))
            )}
          </div>
        )}
        {mobileTab === 'preview' && <CardPreviewPanel {...previewPanelProps} />}
      </div>
      {statsBar}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      {isMobile ? mobileLayout : desktopLayout}
    </div>
  );
}
