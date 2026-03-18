/**
 * AI Guides index page — lists all published SEO guides.
 * Acts as an internal linking hub for AI-optimized content.
 * @module pages/AiIndex
 */

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { applySeoMeta, injectJsonLd } from '@/lib/seo';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, ArrowRight } from 'lucide-react';

interface SeoPageSummary {
  slug: string;
  query: string;
  content_json: {
    tldr: string;
    cards?: Array<{ name: string }>;
  };
  published_at: string | null;
}

export default function AiIndex() {
  const [search, setSearch] = useState('');

  const { data: pages, isLoading } = useQuery({
    queryKey: ['seo-pages-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_pages')
        .select('slug, query, content_json, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as SeoPageSummary[];
    },
    staleTime: 30 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!pages) return [];
    if (!search.trim()) return pages;
    const q = search.toLowerCase();
    return pages.filter(
      (p) =>
        p.query.toLowerCase().includes(q) ||
        p.content_json?.tldr?.toLowerCase().includes(q),
    );
  }, [pages, search]);

  // SEO
  useEffect(() => {
    const cleanupMeta = applySeoMeta({
      title: 'MTG Card Guides — AI-Powered Search | OffMeta',
      description:
        'Browse AI-generated guides for Magic: The Gathering card searches. Find the best cards by mechanic, color, format, and strategy.',
      url: 'https://offmeta.app/ai',
      type: 'website',
    });

    const cleanupJsonLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'MTG Card Guides',
      description:
        'AI-generated guides for Magic: The Gathering card searches.',
      url: 'https://offmeta.app/ai',
      publisher: { '@type': 'Organization', name: 'OffMeta' },
    });

    return () => {
      cleanupMeta();
      cleanupJsonLd();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              MTG Card Guides
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            AI-generated guides answering common Magic: The Gathering card
            searches. Each guide includes curated card lists, strategic
            explanations, and FAQs.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter guides..."
            className="pl-10"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>
              {search
                ? 'No guides match your search.'
                : 'No guides published yet.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {filtered.length} guide{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((page) => (
                <Link
                  key={page.slug}
                  to={`/ai/${page.slug}`}
                  className="group rounded-lg border border-border/50 bg-card/50 p-5 hover:border-accent/30 hover:bg-card transition-all"
                >
                  <h2 className="font-semibold text-foreground group-hover:text-accent transition-colors mb-2 line-clamp-2">
                    {page.query}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {page.content_json?.tldr?.slice(0, 140)}
                    {(page.content_json?.tldr?.length ?? 0) > 140 ? '…' : ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {page.content_json?.cards?.length ?? 0} cards
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Citation */}
        <footer className="mt-12 pt-6 border-t border-border/30 text-sm text-muted-foreground">
          <p>
            Source:{' '}
            <Link to="/" className="text-accent hover:underline">
              OffMeta
            </Link>{' '}
            — AI-powered MTG card search and discovery.
          </p>
        </footer>
      </main>
    </div>
  );
}
