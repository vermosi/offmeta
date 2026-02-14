/**
 * Root guides index page — lists all 10 guides as visual cards.
 * Guides are ordered from basic (level 1) to complex (level 10).
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GUIDES } from '@/data/guides';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl" role="banner">
        <div className="container-main py-4 flex items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-2.5 focus-ring rounded-lg -ml-2 px-2 py-1"
            aria-label="OffMeta - Home"
          >
            <svg viewBox="0 0 32 32" className="h-8 w-8 transition-transform duration-200 group-hover:scale-105" aria-hidden="true">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(300, 90%, 60%)" />
                  <stop offset="100%" stopColor="hsl(195, 95%, 55%)" />
                </linearGradient>
              </defs>
              <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="url(#logoGrad)" opacity="0.15" />
              <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" />
              <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" stroke="url(#logoGrad)" strokeWidth="1.25" fill="none" />
              <circle cx="16" cy="16" r="2" fill="url(#logoGrad)" />
            </svg>
            <span className="text-lg font-semibold tracking-tight">OffMeta</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="container-main pt-4 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium">Guides</li>
        </ol>
      </nav>

      {/* Main */}
      <main className="flex-1 container-main py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Hero */}
          <header className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2.5 text-primary">
              <BookOpen className="h-6 w-6" />
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground leading-tight">
              Search Guides
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
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
                  className="group relative rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200 p-5 sm:p-6 flex flex-col"
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
                  <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2 mb-4">
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
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
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
