/**
 * Public browse page for shared decklists.
 * Filters by format, color identity, tags, and name search.
 * @module pages/BrowseDecks
 */

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Crown, Loader2, Library } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';
import { FORMATS, FORMAT_LABELS } from '@/data/formats';
import type { Deck } from '@/hooks/useDeck';
import type { DeckTag } from '@/hooks/useDeckTags';

const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
const PAGE_SIZE = 25;

/** Fetch public decks. */
function usePublicDecks() {
  return useQuery({
    queryKey: ['browse-decks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Deck[];
    },
  });
}

/** Fetch all tags for public decks. */
function useAllPublicTags() {
  return useQuery({
    queryKey: ['browse-deck-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deck_tags')
        .select('*');
      if (error) throw error;
      return data as DeckTag[];
    },
  });
}

type SortMode = 'newest' | 'cards' | 'alpha';

export default function BrowseDecks() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTag = searchParams.get('tag');

  const { data: decks = [], isLoading } = usePublicDecks();
  const { data: allTags = [] } = useAllPublicTags();

  const [nameFilter, setNameFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>(initialTag ? [initialTag] : []);
  const [sortBy, setSortBy] = useState<SortMode>('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Build tag map: deckId -> tags[]
  const tagsByDeck = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of allTags) {
      if (!map[t.deck_id]) map[t.deck_id] = [];
      map[t.deck_id].push(t.tag);
    }
    return map;
  }, [allTags]);

  // All unique tags for filter suggestions
  const uniqueTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of allTags) counts[t.tag] = (counts[t.tag] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [allTags]);

  // Filter & sort
  const filtered = useMemo(() => {
    let result = decks;

    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      result = result.filter((d) =>
        d.name.toLowerCase().includes(q) ||
        (d.commander_name?.toLowerCase().includes(q)),
      );
    }
    if (formatFilter) result = result.filter((d) => d.format === formatFilter);
    if (colorFilter.length > 0) {
      result = result.filter((d) =>
        colorFilter.every((c) => d.color_identity.includes(c)),
      );
    }
    if (tagFilter.length > 0) {
      result = result.filter((d) => {
        const dt = tagsByDeck[d.id] || [];
        return tagFilter.every((tf) => dt.includes(tf));
      });
    }

    if (sortBy === 'newest') result = [...result].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    else if (sortBy === 'cards') result = [...result].sort((a, b) => b.card_count - a.card_count);
    else if (sortBy === 'alpha') result = [...result].sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [decks, nameFilter, formatFilter, colorFilter, tagFilter, sortBy, tagsByDeck]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const toggleColor = (c: string) => setColorFilter((prev) =>
    prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
  );

  const toggleTag = (tag: string) => {
    setTagFilter((prev) => {
      const next = prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag];
      if (next.length === 0) { searchParams.delete('tag'); setSearchParams(searchParams); }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('browse.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('browse.subtitle')}</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder={t('browse.searchPlaceholder', 'Search decks...')}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">{t('browse.allFormats', 'All Formats')}</option>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => toggleColor(c)}
                className={cn(
                  'h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all',
                  colorFilter.includes(c)
                    ? 'border-accent ring-1 ring-accent/30'
                    : 'border-border opacity-50 hover:opacity-100',
                )}
              >
                <img src={`https://svgs.scryfall.io/card-symbols/${c}.svg`} alt={c} className="h-4 w-4" />
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="newest">{t('browse.sortNewest', 'Newest')}</option>
            <option value="cards">{t('browse.sortCards', 'Most Cards')}</option>
            <option value="alpha">{t('browse.sortAlpha', 'A-Z')}</option>
          </select>
        </div>

        {/* Tag Chips */}
        {uniqueTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {uniqueTags.slice(0, 20).map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  tagFilter.includes(tag)
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-secondary/50 text-muted-foreground border-border hover:border-muted-foreground/30',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Library className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t('browse.noResults')}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'deck' : 'decks'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((deck) => (
                <DeckCard key={deck.id} deck={deck} tags={tagsByDeck[deck.id] || []} onTagClick={toggleTag} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                  {t('browse.loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function DeckCard({ deck, tags, onTagClick }: { deck: Deck; tags: string[]; onTagClick: (tag: string) => void }) {
  return (
    <Link
      to={`/deck/${deck.id}`}
      className="block rounded-xl border border-border bg-card p-4 space-y-2.5 hover:border-muted-foreground/30 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm truncate group-hover:text-accent transition-colors">{deck.name}</h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
          {FORMAT_LABELS[deck.format] || deck.format}
        </span>
      </div>

      {deck.commander_name && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Crown className="h-3 w-3 text-accent" />
          <span className="truncate">{deck.commander_name}</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {deck.color_identity.length > 0 && (
          <div className="flex items-center gap-0.5">
            {deck.color_identity.map((c) => (
              <img key={c} src={`https://svgs.scryfall.io/card-symbols/${c}.svg`} alt={c} className="h-3.5 w-3.5" />
            ))}
          </div>
        )}
        <span className="text-xs text-muted-foreground">{deck.card_count} cards</span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1" onClick={(e) => e.preventDefault()}>
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              size="sm"
              className="cursor-pointer hover:bg-accent/10 hover:text-accent transition-colors"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick(tag); }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {deck.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{deck.description}</p>
      )}
    </Link>
  );
}
