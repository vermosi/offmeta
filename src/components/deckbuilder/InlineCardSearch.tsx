/**
 * Moxfield-inspired inline card search with floating autocomplete dropdown.
 * Replaces the old left-panel CardSearchPanel for a more streamlined UX.
 * @module components/deckbuilder/InlineCardSearch
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Sparkles, Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { searchCards } from '@/lib/scryfall';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';

interface InlineCardSearchProps {
  onAddCard: (card: ScryfallCard) => void;
  onPreview: (card: ScryfallCard) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

export function InlineCardSearch({ onAddCard, onPreview, searchInputRef, disabled }: InlineCardSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'name' | 'smart'>('name');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setOpen(true);
    try {
      if (mode === 'smart') {
        const { data: nlData, error: nlError } = await supabase.functions.invoke('semantic-search', {
          body: { query: q.trim(), useCache: true },
        });
        if (nlError || !nlData?.scryfallQuery) {
          const res = await searchCards(q.trim());
          setResults(res.data || []);
        } else {
          const res = await searchCards(nlData.scryfallQuery);
          setResults(res.data || []);
        }
      } else {
        const res = await searchCards(q.trim());
        setResults(res.data || []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setHighlightIndex(-1);
    clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(value), 350);
    } else {
      setResults([]);
      setOpen(false);
    }
  };

  const handleAddCard = (card: ScryfallCard) => {
    onAddCard(card);
    // Don't close - let user keep adding cards (like Moxfield)
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch(query);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, Math.min(results.length - 1, 29)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && results[highlightIndex]) {
        handleAddCard(results[highlightIndex]);
      } else {
        doSearch(query);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const visibleResults = results.slice(0, 30);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={mode === 'smart' ? t('deckEditor.searchSmart') : 'Add cards by name...'}
            className="pl-9 pr-8 h-10 text-sm bg-secondary/30 border-border/50 focus:bg-background transition-colors"
            disabled={disabled}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setMode((m) => m === 'name' ? 'smart' : 'name')}
          className={cn(
            'flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 border',
            mode === 'smart'
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-secondary/50 text-muted-foreground border-transparent hover:text-foreground',
          )}
          title={mode === 'smart' ? 'Smart search (AI)' : 'Direct search'}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{mode === 'smart' ? 'Smart' : 'Direct'}</span>
        </button>
      </div>

      {/* Floating dropdown results */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-2xl max-h-[380px] overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No cards found for "{query}"
            </div>
          ) : (
            <ul className="overflow-y-auto max-h-[380px] py-1">
              {visibleResults.map((card, i) => {
                const imageUrl = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
                return (
                  <li
                    key={card.id}
                    onMouseEnter={() => { setHighlightIndex(i); onPreview(card); }}
                    onClick={() => handleAddCard(card)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors group',
                      highlightIndex === i ? 'bg-accent/10' : 'hover:bg-secondary/50',
                    )}
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-10 w-[72px] object-cover rounded-sm shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{card.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {card.mana_cost?.replace(/[{}]/g, '')} · {card.type_line}
                      </p>
                    </div>
                    {card.prices?.usd && (
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        ${card.prices.usd}
                      </span>
                    )}
                    <div className="p-1.5 rounded-md text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Plus className="h-4 w-4" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
