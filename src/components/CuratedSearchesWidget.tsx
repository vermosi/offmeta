/**
 * Curated searches widget for the home page.
 * Shows a sample of curated search pages with links for SEO internal linking.
 * @module components/CuratedSearchesWidget
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CuratedSearch {
  slug: string;
  title: string;
  category: string;
}

async function fetchTopCuratedSearches(): Promise<CuratedSearch[]> {
  const { data } = await supabase
    .from('curated_searches')
    .select('slug, title, category')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(8);
  return (data ?? []) as CuratedSearch[];
}

export function CuratedSearchesWidget() {
  const { data: searches = [] } = useQuery({
    queryKey: ['curated-searches-widget'],
    queryFn: fetchTopCuratedSearches,
    staleTime: 30 * 60 * 1000,
  });

  if (searches.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Popular Searches
        </h2>
        <Link
          to="/browse-searches"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((s) => (
          <Link
            key={s.slug}
            to={`/search/${s.slug}`}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors"
          >
            {s.title.replace(/ for (MTG|Commander|Magic)$/i, '').replace(/ in MTG$/i, '')}
          </Link>
        ))}
      </div>
    </div>
  );
}
