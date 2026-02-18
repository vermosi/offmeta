/**
 * Left-panel card search for the deck editor.
 * Supports direct Scryfall name search and NL smart search (via semantic-search edge function).
 * @module components/deckbuilder/CardSearchPanel
 */

import { useState } from 'react';
import { Search, Sparkles, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { searchCards } from '@/lib/scryfall';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';

interface CardSearchPanelProps {
  onAddCard: (card: ScryfallCard) => void;
  onPreview: (card: ScryfallCard) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function CardSearchPanel({ onAddCard, onPreview, searchInputRef }: CardSearchPanelProps) {
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
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={mode === 'smart' ? t('deckEditor.searchSmart') : t('deckEditor.searchName')}
            className="text-sm"
          />
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
              <li key={card.id}
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/50 cursor-pointer transition-colors group active:bg-secondary/70"
                onClick={() => onPreview(card)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{card.mana_cost?.replace(/[{}]/g, '')} · {card.type_line}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddCard(card); }}
                  className="p-2 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
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
