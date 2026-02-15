/**
 * Root guides index page — lists all 10 guides as visual cards.
 * Guides are ordered from basic (level 1) to complex (level 10).
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GUIDES } from '@/data/guides';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ScrollToTop } from '@/components/ScrollToTop';
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LEVEL_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Beginner',
  3: 'Beginner',
  4: 'Intermediate',
  5: 'Intermediate',
  6: 'Intermediate',
  7: 'Advanced',
  8: 'Advanced',
  9: 'Expert',
  10: 'Expert',
};

const LEVEL_COLORS: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
  Intermediate: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Advanced: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Expert: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function GuidesIndex() {
  useEffect(() => {
    document.title = 'Search Guides — OffMeta MTG';
    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('description', 'Learn how to search for Magic: The Gathering cards with OffMeta. 10 guides from basic type searches to complex multi-constraint queries.');
    setMeta('og:title', 'Search Guides — OffMeta MTG', 'property');
    setMeta('og:description', 'Learn how to search for Magic: The Gathering cards with OffMeta. 10 guides from basic to complex.', 'property');

    return () => {
      document.title = 'OffMeta — Natural Language MTG Card Search';
    };
  }, []);

  const sorted = [...GUIDES].sort((a, b) => a.level - b.level);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />

      {/* Breadcrumb */}
      <nav className="container-main pt-4 sm:pt-6 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium">Guides</li>
        </ol>
      </nav>

      {/* Main */}
      <main className="flex-1 container-main py-8 sm:py-10 lg:py-12">
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10 min-w-0">
          {/* Hero */}
          <header className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2.5 text-primary">
              <BookOpen className="h-6 w-6" />
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-semibold text-foreground leading-tight">
              Search Guides
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              Learn how to search for Magic cards with OffMeta — from simple type searches to complex multi-constraint queries.
            </p>
            <p className="text-sm text-muted-foreground">
              10 guides • Beginner → Expert
            </p>
          </header>

          {/* Guide cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {sorted.map((guide) => {
              const label = LEVEL_LABELS[guide.level] || 'Beginner';
              const colorClass = LEVEL_COLORS[label] || LEVEL_COLORS.Beginner;

              return (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="group relative rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200 p-5 sm:p-6 flex flex-col min-w-0 overflow-hidden"
                >
                  {/* Level badge */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>
                      {label} • Level {guide.level}
                    </Badge>
                  </div>

                  {/* Title + subtitle */}
                  <h2 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5">
                    {guide.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    {guide.subheading}
                  </p>

                  {/* Example query */}
                  <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2 mb-4 min-w-0 overflow-hidden">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Example search</p>
                    <p className="text-sm font-mono text-foreground/80 truncate">
                      "{guide.searchQuery}"
                    </p>
                  </div>

                  {/* Read link */}
                  <div className="flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Read guide <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3 overflow-hidden">
            <h2 className="text-lg font-semibold text-foreground">Ready to search?</h2>
            <p className="text-sm text-muted-foreground">
              Try any of these searches — or make up your own. OffMeta translates natural language into Scryfall syntax.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Start Searching
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop threshold={400} />
    </div>
  );
}
