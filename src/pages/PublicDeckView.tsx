/**
 * Public read-only deck view with OpenGraph meta tags for social sharing.
 * Accessible at /deck/:id for any deck with is_public = true.
 * @module pages/PublicDeckView
 */

import { useMemo, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Crown, Shield, ExternalLink, Copy, Check, Users } from 'lucide-react';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { useDeckTags } from '@/hooks/useDeckTags';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/core/utils';
import { ManaCost } from '@/components/ManaSymbol';
import { DeckStatsBar } from '@/components/deckbuilder/DeckStats';
import { CATEGORIES } from '@/components/deckbuilder/constants';
import { FORMAT_LABELS } from '@/data/formats';
import { FORMATS } from '@/data/formats';
import { searchCards } from '@/lib/scryfall';
import { useAuth } from '@/hooks/useAuth';
import type { Deck, DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';
import { DEFAULT_CATEGORY } from '@/lib/deckbuilder/infer-category';

/** Set document head meta tags for OG sharing. */
function useOpenGraphMeta(deck: Deck | undefined, cards: DeckCard[]) {
  useEffect(() => {
    if (!deck) return;

    const totalCards = cards.reduce((s, c) => s + c.quantity, 0);
    const title = `${deck.name} – ${FORMAT_LABELS[deck.format] || deck.format} | OffMeta`;
    const description = deck.description
      || `${totalCards}-card ${FORMAT_LABELS[deck.format] || deck.format} deck${deck.commander_name ? ` led by ${deck.commander_name}` : ''}. View the full decklist on OffMeta.`;
    const url = `${window.location.origin}/deck/${deck.id}`;

    // Commander image from Scryfall for OG image
    const ogImage = deck.commander_name
      ? `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(deck.commander_name)}&format=image&version=art_crop`
      : `${window.location.origin}/og-image.png`;

    document.title = title;

    const metaTags: Record<string, string> = {
      'og:title': title,
      'og:description': description,
      'og:url': url,
      'og:image': ogImage,
      'og:type': 'website',
      'og:site_name': 'OffMeta',
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': ogImage,
      'description': description,
    };

    const cleanups: (() => void)[] = [];
    for (const [property, content] of Object.entries(metaTags)) {
      const isOg = property.startsWith('og:') || property.startsWith('twitter:');
      const attr = isOg ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
        cleanups.push(() => el!.remove());
      }
      const prev = el.content;
      el.content = content;
      if (!cleanups.length) cleanups.push(() => { el!.content = prev; });
    }

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = canonical?.href;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
      cleanups.push(() => canonical!.remove());
    }
    canonical.href = url;

    return () => {
      document.title = 'OffMeta – MTG Card Search';
      if (prevCanonical && canonical) canonical.href = prevCanonical;
      cleanups.forEach((fn) => fn());
    };
  }, [deck, cards]);
}

/** Fetch a public deck by ID (uses the decks_public view or direct query). */
function usePublicDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: ['public-deck', deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('id', deckId!)
        .eq('is_public', true)
        .single();
      if (error) throw error;
      return data as Deck;
    },
    enabled: !!deckId,
  });
}

function usePublicDeckCards(deckId: string | undefined) {
  return useQuery({
    queryKey: ['public-deck-cards', deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('deck_id', deckId!)
        .order('category', { ascending: true })
        .order('card_name', { ascending: true });
      if (error) throw error;
      return data as DeckCard[];
    },
    enabled: !!deckId,
  });
}

/** Progressively fetch Scryfall data for all cards. */
function useScryfallHydration(cards: DeckCard[]) {
  const [scryfallMap, setScryfallMap] = useState<Map<string, ScryfallCard>>(new Map());
  const [version, setVersion] = useState(0);
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (cards.length === 0) return;
    let cancelled = false;
    const names = [...new Set(cards.map((c) => c.card_name))];
    const missing = names.filter((n) => !fetchedRef.current.has(n));

    const fetchBatch = async (batch: string[]) => {
      for (const name of batch) {
        if (cancelled) return;
        fetchedRef.current.add(name);
        try {
          const res = await searchCards(`!"${name}"`);
          const sc = res.data?.[0];
          if (sc) {
            setScryfallMap((prev) => {
              const next = new Map(prev);
              next.set(name, sc);
              return next;
            });
            setVersion((v) => v + 1);
          }
        } catch { /* silent */ }
        await new Promise((r) => setTimeout(r, 80));
      }
    };

    fetchBatch(missing);
    return () => { cancelled = true; };
  }, [cards]);

  return { scryfallMap, version };
}

export default function PublicDeckView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: deck, isLoading: deckLoading, error: deckError } = usePublicDeck(id);
  const { data: cards = [], isLoading: cardsLoading } = usePublicDeckCards(id);
  const { data: deckTags = [] } = useDeckTags(id);
  const { scryfallMap, version } = useScryfallHydration(cards);
  const [copied, setCopied] = useState(false);

  useOpenGraphMeta(deck, cards);

  const mainboardCards = useMemo(() => cards.filter((c) => c.board !== 'sideboard' && c.board !== 'maybeboard'), [cards]);
  const sideboardCards = useMemo(() => cards.filter((c) => c.board === 'sideboard'), [cards]);
  const maybeboardCards = useMemo(() => cards.filter((c) => c.board === 'maybeboard'), [cards]);

  const grouped = useMemo(() => {
    const groups: Record<string, DeckCard[]> = {};
    for (const card of mainboardCards) {
      const cat = card.is_commander ? 'Commander' : card.category || DEFAULT_CATEGORY;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(card);
    }
    const sorted: [string, DeckCard[]][] = [];
    for (const cat of CATEGORIES) { if (groups[cat]) sorted.push([cat, groups[cat]]); }
    for (const [cat, catCards] of Object.entries(groups)) {
      if (!(CATEGORIES as readonly string[]).includes(cat)) sorted.push([cat, catCards]);
    }
    return sorted;
  }, [mainboardCards]);

  const totalMainboard = mainboardCards.reduce((s, c) => s + c.quantity, 0);
  const formatConfig = FORMATS.find((f) => f.value === deck?.format) ?? FORMATS[0];


  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwner = user && deck && user.id === deck.user_id;

  // Loading
  if (deckLoading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-48 shimmer rounded-lg" />
      </div>
    </div>
  );

  // Not found / private
  if (deckError || !deck) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <Users className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Deck not found</h2>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          This deck doesn't exist or is set to private.
        </p>
        <Button variant="outline" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to Home</Link>
        </Button>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ── Deck Header ── */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{deck.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {FORMAT_LABELS[deck.format] || deck.format}
                </span>
                <span className="text-xs text-muted-foreground">
                  {totalMainboard} cards
                </span>
                {deck.color_identity.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    {deck.color_identity.map((c) => (
                      <img key={c} src={`https://svgs.scryfall.io/card-symbols/${c}.svg`}
                        alt={c} className="h-4 w-4" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isOwner && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/deckbuilder/${deck.id}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Edit
                  </Link>
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={handleCopyUrl}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>
          </div>

          {/* Commander / Companion badges */}
          {(deck.commander_name || deck.companion_name) && (
            <div className="flex items-center gap-2 flex-wrap">
              {deck.commander_name && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                  <Crown className="h-3 w-3" />{deck.commander_name}
                </span>
              )}
              {deck.companion_name && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Shield className="h-3 w-3" />{deck.companion_name}
                </span>
              )}
            </div>
          )}

          {deck.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{deck.description}</p>
          )}

          {deckTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {deckTags.map((tag) => (
                <Link key={tag.id} to={`/decks?tag=${encodeURIComponent(tag.tag)}`}>
                  <Badge variant="outline" size="sm" className="hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer">
                    {tag.tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Stats Bar ── */}
        {mainboardCards.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <DeckStatsBar cards={mainboardCards} scryfallCache={scryfallMap}
              formatMax={formatConfig.max} cacheVersion={version} />
          </div>
        )}

        {/* ── Decklist ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {cardsLoading ? (
            <div className="space-y-2 col-span-full">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 shimmer rounded-lg" />)}
            </div>
          ) : (
            <>
              {grouped.map(([category, catCards]) => (
                <PublicCategorySection key={category} category={category} cards={catCards}
                  scryfallCache={scryfallMap} cacheVersion={version} />
              ))}
              {sideboardCards.length > 0 && (
                <PublicCategorySection category="Sideboard" cards={sideboardCards}
                  scryfallCache={scryfallMap} cacheVersion={version} />
              )}
              {maybeboardCards.length > 0 && (
                <PublicCategorySection category="Maybeboard" cards={maybeboardCards}
                  scryfallCache={scryfallMap} cacheVersion={version} />
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** Read-only category section for public deck view. */
function PublicCategorySection({
  category, cards, scryfallCache, cacheVersion,
}: {
  category: string;
  cards: DeckCard[];
  scryfallCache: Map<string, ScryfallCard>;
  cacheVersion: number;
}) {
  const totalQty = cards.reduce((s, c) => s + c.quantity, 0);

  const categoryPrice = useMemo(() => {
    let total = 0;
    for (const card of cards) {
      const cached = scryfallCache.get(card.card_name);
      const price = cached?.prices?.usd ? parseFloat(cached.prices.usd) : 0;
      total += price * card.quantity;
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, cacheVersion]);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 px-1 py-2 border-b border-border/40">
        <span className="text-sm font-bold">{category}</span>
        <span className="text-xs text-muted-foreground">({totalQty})</span>
        {categoryPrice > 0 && (
          <>
            <span className="text-xs text-muted-foreground">–</span>
            <span className="text-xs text-muted-foreground font-medium">${categoryPrice.toFixed(2)}</span>
          </>
        )}
      </div>
      <ul>
        {cards.map((card) => {
          const cached = scryfallCache.get(card.card_name);
          const manaCost = cached?.mana_cost || cached?.card_faces?.[0]?.mana_cost;
          const price = cached?.prices?.usd;

          return (
            <li key={card.id}
              className="flex items-center gap-2 px-1 py-1.5 hover:bg-secondary/20 rounded transition-colors text-sm">
              <span className="flex items-center gap-1 shrink-0 w-6">
                {(card.is_commander || card.is_companion) && (
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    card.is_commander ? 'bg-accent' : 'bg-primary',
                  )} />
                )}
                <span className="text-xs text-muted-foreground">{card.quantity}</span>
              </span>
              <span className={cn(
                'truncate text-sm',
                (card.is_commander || card.is_companion) && 'font-semibold',
              )}>
                {card.card_name}
              </span>
              <span className="flex-1" />
              {manaCost && <ManaCost cost={manaCost} size="sm" className="shrink-0" />}
              {price && (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 font-mono">
                  ${price}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
