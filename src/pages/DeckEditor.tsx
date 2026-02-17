/**
 * Deck Editor page – three-panel layout for building a deck.
 * Left: Card search. Center: Categorized deck list. Right: Card preview + suggestions.
 * @module pages/DeckEditor
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  List,
  Eye,
  Plus,
  Minus,
  Trash2,
  Crown,
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDeck, useDeckCards, useDeckMutations, useDeckCardMutations } from '@/hooks/useDeck';
import type { DeckCard } from '@/hooks/useDeck';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/core/utils';
import { useIsMobile } from '@/hooks/useMobile';
import { searchCards, autocomplete, getCardImage } from '@/lib/scryfall';
import type { ScryfallCard } from '@/types/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ── Constants ──
const CATEGORIES = [
  'Commander',
  'Creatures',
  'Instants',
  'Sorceries',
  'Artifacts',
  'Enchantments',
  'Planeswalkers',
  'Lands',
  'Ramp',
  'Removal',
  'Draw',
  'Protection',
  'Utility',
  'Other',
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

// ── Card Search Panel ──
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

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchCards(query.trim());
      setResults(res.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search cards..."
            className="text-sm"
          />
          <Button size="sm" onClick={handleSearch} disabled={loading} className="shrink-0">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 shimmer rounded-lg" />
            ))}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddCard(card);
                  }}
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
  category,
  cards,
  onRemove,
  onSetQuantity,
  onSetCommander,
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
            <li
              key={card.id}
              className="flex items-center gap-1 px-2 py-1 hover:bg-secondary/30 transition-colors group text-sm"
            >
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                {card.quantity}×
              </span>
              <span className={cn('flex-1 truncate text-xs', card.is_commander && 'font-semibold text-accent')}>
                {card.card_name}
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onSetCommander(card.id, !card.is_commander)}
                  className={cn(
                    'p-0.5 rounded text-muted-foreground hover:text-accent transition-colors',
                    card.is_commander && 'text-accent',
                  )}
                  aria-label="Toggle commander"
                  title="Set as commander"
                >
                  <Crown className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onSetQuantity(card.id, card.quantity - 1)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onSetQuantity(card.id, card.quantity + 1)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onRemove(card.id)}
                  className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove card"
                >
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

// ── Card Preview Panel ──
function CardPreviewPanel({ card }: { card: ScryfallCard | null }) {
  if (!card) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        <p className="text-center">Click a card from search results to preview it here.</p>
      </div>
    );
  }

  const imageUrl =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal;

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={card.name}
          className="w-full rounded-xl shadow-lg"
          loading="lazy"
        />
      )}
      <div>
        <h3 className="font-semibold text-sm">{card.name}</h3>
        <p className="text-xs text-muted-foreground">{card.type_line}</p>
        {card.oracle_text && (
          <p className="text-xs mt-2 whitespace-pre-line leading-relaxed">{card.oracle_text}</p>
        )}
        {card.prices?.usd && (
          <p className="text-xs text-muted-foreground mt-2">${card.prices.usd}</p>
        )}
      </div>
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

  // Group cards by category
  const grouped = useMemo(() => {
    const groups: Record<string, DeckCard[]> = {};
    for (const card of cards) {
      const cat = card.is_commander ? 'Commander' : card.category || DEFAULT_CATEGORY;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(card);
    }
    // Sort by CATEGORIES order
    const sorted: [string, DeckCard[]][] = [];
    for (const cat of CATEGORIES) {
      if (groups[cat]) sorted.push([cat, groups[cat]]);
    }
    // Add any custom categories not in the list
    for (const [cat, cards] of Object.entries(groups)) {
      if (!CATEGORIES.includes(cat as any)) sorted.push([cat, cards]);
    }
    return sorted;
  }, [cards]);

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const formatMax = deck?.format === 'commander' ? 100 : 60;

  const handleAddCard = useCallback(
    (card: ScryfallCard) => {
      addCard.mutate({
        card_name: card.name,
        category: inferCategory(card),
        scryfall_id: card.id,
      });
    },
    [addCard],
  );

  const handleSetCommander = useCallback(
    (cardId: string, isCommander: boolean) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      // If setting as commander, unset any existing commanders
      if (isCommander) {
        for (const c of cards) {
          if (c.is_commander && c.id !== cardId) {
            updateCard.mutate({ id: c.id, is_commander: false, category: inferCategoryFromName(c) });
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

  const startEditName = () => {
    setNameInput(deck?.name || '');
    setEditingName(true);
  };

  const saveName = () => {
    if (nameInput.trim() && id) {
      updateDeck.mutate({ id, name: nameInput.trim() });
    }
    setEditingName(false);
  };

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
          <p className="text-muted-foreground">Deck not found.</p>
          <Button variant="outline" onClick={() => navigate('/deckbuilder')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Decks
          </Button>
        </div>
      </div>
    );
  }

  // ── Desktop Layout ──
  const desktopLayout = (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Card Search */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <CardSearchPanel onAddCard={handleAddCard} onPreview={setPreviewCard} />
      </div>

      {/* Center: Deck List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Deck header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <Link
            to="/deckbuilder"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="text-sm h-8"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={saveName}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={startEditName}
              className="flex items-center gap-1.5 group text-left flex-1 min-w-0"
            >
              <h2 className="font-semibold truncate">{deck.name}</h2>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            totalCards >= formatMax
              ? 'bg-accent/10 text-accent'
              : 'bg-secondary text-secondary-foreground',
          )}>
            {totalCards}/{formatMax}
          </span>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {cardsLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 shimmer rounded-lg" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <p className="text-center">
                Search for cards on the left and click <Plus className="h-3 w-3 inline" /> to add them.
              </p>
            </div>
          ) : (
            grouped.map(([category, catCards]) => (
              <CategorySection
                key={category}
                category={category}
                cards={catCards}
                onRemove={(cardId) => removeCard.mutate(cardId)}
                onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
                onSetCommander={handleSetCommander}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Card Preview */}
      <div className="w-72 border-l border-border bg-card flex flex-col">
        <CardPreviewPanel card={previewCard} />
      </div>
    </div>
  );

  // ── Mobile Layout ──
  const mobileLayout = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Deck header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Link
          to="/deckbuilder"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              className="text-sm h-8"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={saveName}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button onClick={startEditName} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
            <h2 className="font-semibold truncate text-sm">{deck.name}</h2>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
          {totalCards}/{formatMax}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {[
          { key: 'search' as const, icon: Search, label: 'Search' },
          { key: 'list' as const, icon: List, label: 'Deck' },
          { key: 'preview' as const, icon: Eye, label: 'Preview' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
              mobileTab === tab.key
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted-foreground',
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {mobileTab === 'search' && (
          <CardSearchPanel onAddCard={handleAddCard} onPreview={(card) => { setPreviewCard(card); setMobileTab('preview'); }} />
        )}
        {mobileTab === 'list' && (
          <div className="overflow-y-auto h-full p-2 space-y-1">
            {cards.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
                <p className="text-center">Tap "Search" to find cards and add them.</p>
              </div>
            ) : (
              grouped.map(([category, catCards]) => (
                <CategorySection
                  key={category}
                  category={category}
                  cards={catCards}
                  onRemove={(cardId) => removeCard.mutate(cardId)}
                  onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
                  onSetCommander={handleSetCommander}
                />
              ))
            )}
          </div>
        )}
        {mobileTab === 'preview' && <CardPreviewPanel card={previewCard} />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      {isMobile ? mobileLayout : desktopLayout}
    </div>
  );
}

/** Fallback category inference from card name (when Scryfall data not available). */
function inferCategoryFromName(card: DeckCard): string {
  return card.category || DEFAULT_CATEGORY;
}
