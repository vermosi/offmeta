/**
 * Browse curated search pages — categorized grid of high-value MTG searches.
 * Provides internal linking for SEO and user discovery.
 * @module pages/BrowseSearches
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Sword, DollarSign, Users, Sparkles, Palette, Shield, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { applySeoMeta, injectJsonLd } from '@/lib/seo';

interface CuratedSearch {
  slug: string;
  title: string;
  description: string;
  category: string;
  natural_query: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Search; order: number }> = {
  commander: { label: 'Commander / EDH', icon: Crown, order: 1 },
  budget: { label: 'Budget Picks', icon: DollarSign, order: 2 },
  tribal: { label: 'Tribal', icon: Users, order: 3 },
  mechanics: { label: 'Mechanics & Synergies', icon: Sparkles, order: 4 },
  format: { label: 'Format Staples', icon: Shield, order: 5 },
  colors: { label: 'Color Combinations', icon: Palette, order: 6 },
  general: { label: 'General', icon: Sword, order: 7 },
};

async function fetchCuratedSearches(): Promise<CuratedSearch[]> {
  const { data, error } = await supabase
    .from('curated_searches')
    .select('slug, title, description, category, natural_query')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('[BrowseSearches] fetch error:', error.message, error.code);
    throw error;
  }
  console.log('[BrowseSearches] fetched', data?.length, 'curated searches');
  return (data ?? []) as CuratedSearch[];
}

export default function BrowseSearches() {
  const { data: searches = [], isLoading, error } = useQuery({
    queryKey: ['curated-searches'],
    queryFn: fetchCuratedSearches,
    staleTime: 30 * 60 * 1000,
  });

  const grouped = useMemo(() => {
    const groups = new Map<string, CuratedSearch[]>();
    for (const s of searches) {
      const list = groups.get(s.category) ?? [];
      list.push(s);
      groups.set(s.category, list);
    }
    return Array.from(groups.entries()).sort(
      ([a], [b]) => (CATEGORY_CONFIG[a]?.order ?? 99) - (CATEGORY_CONFIG[b]?.order ?? 99),
    );
  }, [searches]);

  useEffect(() => {
    const cleanupSeo = applySeoMeta({
      title: 'Browse MTG Card Searches | OffMeta',
      description: 'Explore curated Magic: The Gathering card searches by category — Commander staples, budget picks, tribal lords, mechanics, and more.',
      url: 'https://offmeta.app/browse-searches',
    });
    const cleanupLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Browse MTG Card Searches',
      description: 'Curated Magic: The Gathering card searches organized by category.',
      url: 'https://offmeta.app/browse-searches',
    });
    return () => { cleanupSeo(); cleanupLd(); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-main py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Browse Card Searches
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Explore curated searches for the most popular Magic: The Gathering strategies, themes, and archetypes.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-destructive mb-2">Failed to load curated searches</p>
              <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : searches.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No curated searches available yet.</p>
            <div className="space-y-10">
              {grouped.map(([category, items]) => {
                const config = CATEGORY_CONFIG[category] ?? { label: category, icon: Search, order: 99 };
                const Icon = config.icon;
                return (
                  <section key={category}>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                      <Icon className="h-5 w-5 text-primary" />
                      {config.label}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((item) => (
                        <Link
                          key={item.slug}
                          to={`/search/${item.slug}`}
                          className="group block p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-card/80 transition-colors"
                        >
                          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
