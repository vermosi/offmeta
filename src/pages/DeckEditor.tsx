/**
 * Deck Editor page – three-panel layout for building a deck.
 * Left: Card search (Scryfall + NL). Center: Categorized deck list. Right: Card preview + AI suggestions + combos.
 * @module pages/DeckEditor
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Search, List, Plus, Minus, Trash2, Crown, ChevronDown, ChevronRight,
  Pencil, Check, Sparkles, Wand2, Loader2, Brain, Zap, ArrowRightLeft, ChevronUp, Shield,
  Keyboard,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { DeckStatsBar } from '@/components/deckbuilder/DeckStats';
import { DeckCombos } from '@/components/deckbuilder/DeckCombos';
import { DeckExportMenu } from '@/components/deckbuilder/DeckExportMenu';
import { useTranslation } from '@/lib/i18n';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ── Constants ──
const CATEGORIES = [
  'Commander', 'Creatures', 'Instants', 'Sorceries', 'Artifacts',
  'Enchantments', 'Planeswalkers', 'Lands', 'Ramp', 'Removal',
  'Draw', 'Protection', 'Combo', 'Recursion', 'Utility', 'Finisher', 'Other',
] as const;

const FORMATS = [
  { value: 'commander', label: 'Commander', max: 100 },
  { value: 'standard', label: 'Standard', max: 60 },
  { value: 'modern', label: 'Modern', max: 60 },
  { value: 'pioneer', label: 'Pioneer', max: 60 },
  { value: 'legacy', label: 'Legacy', max: 60 },
  { value: 'vintage', label: 'Vintage', max: 60 },
  { value: 'pauper', label: 'Pauper', max: 60 },
  { value: 'oathbreaker', label: 'Oathbreaker', max: 60 },
  { value: 'brawl', label: 'Brawl', max: 60 },
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

interface CardSuggestion {
  card_name: string;
  reason: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

// ── Card Search Panel ──
function CardSearchPanel({ onAddCard, onPreview, searchInputRef }: {
  onAddCard: (card: ScryfallCard) => void;
  onPreview: (card: ScryfallCard) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTranslation();
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
          <button onClick={() => setMode('name')}
            className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-md transition-colors',
              mode === 'name' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Search className="h-3 w-3" />{t('deckEditor.searchMode.name')}
          </button>
          <button onClick={() => setMode('smart')}
            className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-md transition-colors',
              mode === 'smart' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Sparkles className="h-3 w-3" />{t('deckEditor.searchMode.smart')}
          </button>
        </div>
        <div className="flex gap-2">
          <Input ref={searchInputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={mode === 'smart' ? t('deckEditor.searchSmart') : t('deckEditor.searchName')} className="text-sm" />
          <Button size="sm" onClick={handleSearch} disabled={loading} className="shrink-0 min-w-[36px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {mode === 'smart' && <p className="text-[10px] text-muted-foreground">{t('deckEditor.smartHint')}</p>}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 shimmer rounded-lg" />)}</div>
        ) : results.length === 0 && searched ? (
          <p className="p-4 text-sm text-muted-foreground text-center">{t('deckEditor.noResults')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {results.slice(0, 50).map((card) => (
              <li key={card.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/50 cursor-pointer transition-colors group active:bg-secondary/70"
                onClick={() => onPreview(card)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{card.mana_cost?.replace(/[{}]/g, '')} · {card.type_line}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onAddCard(card); }}
                  className="p-2 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Add ${card.name}`}>
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
function CategorySection({ category, cards, onRemove, onSetQuantity, onSetCommander, onSetCompanion, onSetCategory, onMoveToSideboard, onMoveToMaybeboard, isReadOnly, selectedCardId, onSelectCard }: {
  category: string;
  cards: DeckCard[];
  onRemove: (id: string) => void;
  onSetQuantity: (cardId: string, qty: number) => void;
  onSetCommander: (cardId: string, isCommander: boolean) => void;
  onSetCompanion: (cardId: string, isCompanion: boolean) => void;
  onSetCategory: (cardId: string, category: string) => void;
  onMoveToSideboard: (cardId: string, toSideboard: boolean) => void;
  onMoveToMaybeboard: (cardId: string) => void;
  isReadOnly: boolean;
  selectedCardId: string | null;
  onSelectCard: (id: string) => void;
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
            <li key={card.id}
              onClick={() => onSelectCard(card.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 transition-colors group text-sm cursor-pointer',
                selectedCardId === card.id
                  ? 'bg-accent/10 border-l-2 border-accent -ml-px'
                  : 'hover:bg-secondary/30',
              )}>
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{card.quantity}×</span>
              <span className={cn(
                'flex-1 truncate text-xs',
                card.is_commander && 'font-semibold text-accent',
                card.is_companion && !card.is_commander && 'font-semibold text-primary',
              )}>{card.card_name}</span>
              {/* Companion / commander badge inline */}
              {card.is_companion && <span title="Companion"><Shield className="h-3 w-3 text-primary shrink-0" /></span>}
              {card.is_commander && <span title="Commander"><Crown className="h-3 w-3 text-accent shrink-0" /></span>}
              {!isReadOnly && (
                <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {/* Category picker */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Change category"
                        onClick={(e) => e.stopPropagation()}>
                        <Pencil className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 max-h-60 overflow-y-auto">
                      {CATEGORIES.filter(c => c !== 'Commander').map((cat) => (
                        <DropdownMenuItem key={cat} onClick={() => onSetCategory(card.id, cat)}
                          className={cn('text-xs', card.category === cat && 'text-accent font-medium')}>
                          {cat}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button onClick={(e) => { e.stopPropagation(); onSetCommander(card.id, !card.is_commander); }}
                    className={cn('p-1 rounded text-muted-foreground hover:text-accent transition-colors', card.is_commander && 'text-accent')}
                    aria-label="Toggle commander" title="Set as commander"><Crown className="h-3 w-3" /></button>
                  {/* Companion toggle — only allow 1 companion */}
                  <button onClick={(e) => { e.stopPropagation(); onSetCompanion(card.id, !card.is_companion); }}
                    className={cn('p-1 rounded text-muted-foreground hover:text-primary transition-colors', card.is_companion && 'text-primary')}
                    aria-label="Toggle companion" title="Set as companion"><Shield className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onMoveToSideboard(card.id, true); }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Move to sideboard (Shift+S)"><ArrowRightLeft className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onMoveToMaybeboard(card.id); }}
                    className="p-1 rounded text-muted-foreground hover:text-muted-foreground/60 hover:text-foreground transition-colors"
                    title="Move to maybeboard"><List className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onSetQuantity(card.id, card.quantity - 1); }} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                    <Minus className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onSetQuantity(card.id, card.quantity + 1); }} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onRemove(card.id); }} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove (Del)">
                    <Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Sideboard Section ──
// ── Sideboard Section ──
function SideboardSection({ cards, onRemove, onSetQuantity, onMoveToMainboard, isReadOnly }: {
  cards: DeckCard[];
  onRemove: (id: string) => void;
  onSetQuantity: (cardId: string, qty: number) => void;
  onMoveToMainboard: (cardId: string) => void;
  isReadOnly: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const totalQty = cards.reduce((sum, c) => sum + c.quantity, 0);

  if (cards.length === 0 && isReadOnly) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary/30 transition-colors rounded-lg text-left">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold text-muted-foreground">{t('deckEditor.sideboard')}</span>
          <span className="text-[10px] text-muted-foreground">({totalQty})</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {cards.length === 0 ? (
            <p className="px-3 py-2 text-[10px] text-muted-foreground">{t('deckEditor.sideboardEmpty')}</p>
          ) : (
            <ul className="ml-2 border-l border-border/30">
              {cards.map((card) => (
                <li key={card.id} className="flex items-center gap-1 px-2 py-1.5 hover:bg-secondary/30 transition-colors group text-sm">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{card.quantity}×</span>
                  <span className="flex-1 truncate text-xs text-muted-foreground">{card.card_name}</span>
                  {!isReadOnly && (
                    <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onMoveToMainboard(card.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title={t('deckEditor.moveToMainboard')}><ChevronUp className="h-3 w-3" /></button>
                      <button onClick={() => onSetQuantity(card.id, card.quantity - 1)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Minus className="h-3 w-3" /></button>
                      <button onClick={() => onSetQuantity(card.id, card.quantity + 1)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="h-3 w-3" /></button>
                      <button onClick={() => onRemove(card.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ── Maybeboard Section ──
function MaybeboardSection({ cards, onRemove, onSetQuantity, onMoveToMainboard, onMoveToSideboard, isReadOnly }: {
  cards: DeckCard[];
  onRemove: (id: string) => void;
  onSetQuantity: (cardId: string, qty: number) => void;
  onMoveToMainboard: (cardId: string) => void;
  onMoveToSideboard: (cardId: string) => void;
  isReadOnly: boolean;
}) {
  const [open, setOpen] = useState(false); // collapsed by default
  const totalQty = cards.reduce((sum, c) => sum + c.quantity, 0);

  if (cards.length === 0 && isReadOnly) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary/30 transition-colors rounded-lg text-left">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold text-muted-foreground">Maybeboard</span>
          <span className="text-[10px] text-muted-foreground">({totalQty})</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {cards.length === 0 ? (
            <p className="px-3 py-2 text-[10px] text-muted-foreground">No cards yet. Use the ⋯ menu on any card to add here.</p>
          ) : (
            <ul className="ml-2 border-l border-border/30">
              {cards.map((card) => (
                <li key={card.id} className="flex items-center gap-1 px-2 py-1.5 hover:bg-secondary/30 transition-colors group text-sm">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{card.quantity}×</span>
                  <span className="flex-1 truncate text-xs text-muted-foreground">{card.card_name}</span>
                  {!isReadOnly && (
                    <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onMoveToMainboard(card.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Move to mainboard"><ChevronUp className="h-3 w-3" /></button>
                      <button onClick={() => onMoveToSideboard(card.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Move to sideboard"><ArrowRightLeft className="h-3 w-3" /></button>
                      <button onClick={() => onSetQuantity(card.id, card.quantity - 1)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Minus className="h-3 w-3" /></button>
                      <button onClick={() => onSetQuantity(card.id, card.quantity + 1)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="h-3 w-3" /></button>
                      <button onClick={() => onRemove(card.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ── AI Suggestions Panel ──
function SuggestionsPanel({ suggestions, analysis, loading, onSuggest, onAddSuggestion, cardCount }: {
  suggestions: CardSuggestion[]; analysis: string; loading: boolean;
  onSuggest: () => void; onAddSuggestion: (name: string) => void; cardCount: number;
}) {
  const { t } = useTranslation();
  const priorityColor = { high: 'text-accent', medium: 'text-foreground', low: 'text-muted-foreground' };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-accent" />{t('deckEditor.suggestions.title')}</h3>
        <Button size="sm" variant="outline" onClick={onSuggest} disabled={loading || cardCount < 5} className="h-7 text-[11px] gap-1">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {loading ? t('deckEditor.suggestions.analyzing') : t('deckEditor.suggestions.suggest')}
        </Button>
      </div>
      {cardCount < 5 && <p className="text-[10px] text-muted-foreground">{t('deckEditor.suggestions.minCards')}</p>}
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
                className="p-1.5 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100 shrink-0 mt-0.5"
                aria-label={`Add ${s.card_name}`}><Plus className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Card Preview Panel (with suggestions + combos) ──
function CardPreviewPanel({ card, suggestions, suggestionsAnalysis, suggestionsLoading,
  onSuggest, onAddSuggestion, cardCount, deckCards, commanderName }: {
  card: ScryfallCard | null; suggestions: CardSuggestion[]; suggestionsAnalysis: string;
  suggestionsLoading: boolean; onSuggest: () => void; onAddSuggestion: (name: string) => void;
  cardCount: number; deckCards: DeckCard[]; commanderName: string | null;
}) {
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
        <div className="text-center text-muted-foreground text-sm py-4"><p>{t('deckEditor.preview.clickToPreview')}</p></div>
      )}
      <div className="border-t border-border" />
      <DeckCombos cards={deckCards} commanderName={commanderName} onAddCard={onAddSuggestion} />
      <div className="border-t border-border" />
      <SuggestionsPanel suggestions={suggestions} analysis={suggestionsAnalysis} loading={suggestionsLoading}
        onSuggest={onSuggest} onAddSuggestion={onAddSuggestion} cardCount={cardCount} />
    </div>
  );
}

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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const queryClient = useQueryClient();
  const scryfallCacheRef = useRef<Map<string, ScryfallCard>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scryfallCacheVersion, setScryfallCacheVersion] = useState(0);
  const importProcessedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync description input when deck loads
  useEffect(() => {
    if (deck?.description !== undefined) setDescriptionInput(deck.description || '');
  }, [deck?.description]);

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
      if (!CATEGORIES.includes(cat as any)) sorted.push([cat, catCards]);
    }
    return sorted;
  }, [mainboardCards]);

  const totalMainboard = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalSideboard = sideboardCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalMaybeboard = maybeboardCards.reduce((sum, c) => sum + c.quantity, 0);
  const formatConfig = FORMATS.find((f) => f.value === deck?.format) ?? FORMATS[0];
  const formatMax = formatConfig.max;

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
        if (newCat && newCat !== card.category) await supabase.from('deck_cards').update({ category: newCat }).eq('id', card.id);
      }
      toast({ title: t('deckEditor.categorizeSuccess'), description: t('deckEditor.categorizeSuccessDesc').replace('{count}', String(cardNames.length)) });
      queryClient.invalidateQueries({ queryKey: ['deck-cards', id] });
    } catch {
      toast({ title: 'Error', description: t('deckEditor.categorizeFailed'), variant: 'destructive' });
    } finally { setCategorizingAll(false); }
  }, [cards, id, queryClient, t]);

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
      // Enforce one companion — clear any existing
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

  // Check if viewing someone else's public deck (read-only)
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
        {/* Format selector */}
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
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
          totalMainboard >= formatMax ? 'bg-accent/10 text-accent' : 'bg-secondary text-secondary-foreground')}>
          {totalMainboard}/{formatMax}
          {totalSideboard > 0 && <span className="text-muted-foreground"> +{totalSideboard}sb</span>}
          {totalMaybeboard > 0 && <span className="text-muted-foreground"> +{totalMaybeboard}mb</span>}
        </span>
      </div>
      {/* Commander / Companion chips */}
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
      {/* Description row */}
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

  const deckListContent = (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {cardsLoading ? (
        <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 shimmer rounded-lg" />)}</div>
      ) : cards.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
          <p className="text-center">{isReadOnly ? t('deckEditor.emptyDeckReadOnly') : t('deckEditor.emptyDeck')}</p>
        </div>
      ) : (
        <>
          {grouped.map(([category, catCards]) => (
            <CategorySection
              key={category}
              category={category}
              cards={catCards}
              isReadOnly={isReadOnly}
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              onRemove={(cardId) => removeCard.mutate(cardId)}
              onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
              onSetCommander={handleSetCommander}
              onSetCompanion={handleSetCompanion}
              onSetCategory={handleSetCategory}
              onMoveToSideboard={(cardId, toSb) => handleMoveToSideboard(cardId, toSb)}
              onMoveToMaybeboard={handleMoveToMaybeboard}
            />
          ))}
          <SideboardSection
            cards={sideboardCards}
            isReadOnly={isReadOnly}
            onRemove={(cardId) => removeCard.mutate(cardId)}
            onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
            onMoveToMainboard={(cardId) => handleMoveToSideboard(cardId, false)}
          />
          <MaybeboardSection
            cards={maybeboardCards}
            isReadOnly={isReadOnly}
            onRemove={(cardId) => removeCard.mutate(cardId)}
            onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
            onMoveToMainboard={(cardId) => handleMoveToSideboard(cardId, false)}
            onMoveToSideboard={(cardId) => updateCard.mutate({ id: cardId, board: 'sideboard' })}
          />
        </>
      )}
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
        {mobileTab === 'list' && (
          <div className="overflow-y-auto h-full p-2 space-y-1">
            {cards.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
                <p className="text-center">{isReadOnly ? t('deckEditor.emptyDeckReadOnly') : t('deckEditor.emptyDeckMobile')}</p>
              </div>
            ) : (
              <>
                {grouped.map(([category, catCards]) => (
                  <CategorySection
                    key={category}
                    category={category}
                    cards={catCards}
                    isReadOnly={isReadOnly}
                    selectedCardId={selectedCardId}
                    onSelectCard={setSelectedCardId}
                    onRemove={(cardId) => removeCard.mutate(cardId)}
                    onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
                    onSetCommander={handleSetCommander}
                    onSetCompanion={handleSetCompanion}
                    onSetCategory={handleSetCategory}
                    onMoveToSideboard={(cardId, toSb) => handleMoveToSideboard(cardId, toSb)}
                    onMoveToMaybeboard={handleMoveToMaybeboard}
                  />
                ))}
                <SideboardSection
                  cards={sideboardCards}
                  isReadOnly={isReadOnly}
                  onRemove={(cardId) => removeCard.mutate(cardId)}
                  onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
                  onMoveToMainboard={(cardId) => handleMoveToSideboard(cardId, false)}
                />
                <MaybeboardSection
                  cards={maybeboardCards}
                  isReadOnly={isReadOnly}
                  onRemove={(cardId) => removeCard.mutate(cardId)}
                  onSetQuantity={(cardId, qty) => setQuantity.mutate({ cardId, quantity: qty })}
                  onMoveToMainboard={(cardId) => handleMoveToSideboard(cardId, false)}
                  onMoveToSideboard={(cardId) => updateCard.mutate({ id: cardId, board: 'sideboard' })}
                />
              </>
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
