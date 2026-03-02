/**
 * About page — showcases OffMeta's 7-phase product journey.
 * Cinematic narrative from v1 search translator to meta-intelligence platform.
 * @module pages/About
 */

import { useEffect } from 'react';
import { useTypewriterCycle } from '@/hooks/useTypewriterCycle';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StatCounters } from '@/components/about/StatCounters';
import { PhaseTimeline } from '@/components/about/PhaseTimeline';
import { EvolutionArc } from '@/components/about/EvolutionArc';
import { NextPhaseCards } from '@/components/about/NextPhaseCards';
import { Link } from 'react-router-dom';
import { Search, Layers, Swords } from 'lucide-react';

const ABOUT_META = {
  title: 'The OffMeta Story — 7 Phases from Search to Meta Intelligence',
  description:
    "Follow OffMeta's journey: from natural language MTG card search to a full Meta Intelligence Platform \u2014 AI deck tools, combo discovery, and more.",
  url: 'https://offmeta.app/about',
  image: 'https://offmeta.app/og-image.png',
} as const;

const DEFAULT_META = {
  title: 'OffMeta — Natural Language MTG Card Search',
  description:
    'Type what you mean and find Magic cards instantly. No syntax required.',
  url: 'https://offmeta.app/',
  image: 'https://offmeta.app/og-image.png',
} as const;

/** Set or update a <meta> tag by property or name attribute. */
function setMeta(attr: 'property' | 'name', key: string, value: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/** Set or update the canonical <link> tag. */
function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

const TAGLINE_PHRASES = [
  'Find the card.',
  'Build the deck.',
  'Discover the combo.',
  'Search smarter.',
] as const;

export default function About() {
  const tagline = useTypewriterCycle(TAGLINE_PHRASES);

  useEffect(() => {
    const prev = {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
    };

    // Page title
    document.title = ABOUT_META.title;

    // Canonical
    setCanonical(ABOUT_META.url);

    // Standard meta
    setMeta('name', 'description', ABOUT_META.description);

    // Open Graph
    setMeta('property', 'og:title', ABOUT_META.title);
    setMeta('property', 'og:description', ABOUT_META.description);
    setMeta('property', 'og:url', ABOUT_META.url);
    setMeta('property', 'og:image', ABOUT_META.image);
    setMeta('property', 'og:type', 'website');

    // Twitter/X Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', ABOUT_META.title);
    setMeta('name', 'twitter:description', ABOUT_META.description);
    setMeta('name', 'twitter:url', ABOUT_META.url);
    setMeta('name', 'twitter:image', ABOUT_META.image);

    // JSON-LD BreadcrumbList — helps Google display "OffMeta > About" in results
    const breadcrumb = document.createElement('script');
    breadcrumb.type = 'application/ld+json';
    breadcrumb.id = 'about-breadcrumb-jsonld';
    breadcrumb.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'OffMeta',
          item: 'https://offmeta.app/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'About',
          item: 'https://offmeta.app/about',
        },
      ],
    });
    document.head.appendChild(breadcrumb);

    return () => {
      // Restore defaults when leaving the page
      document.title = prev.title;
      setCanonical(prev.canonical);
      setMeta('name', 'description', prev.description);
      setMeta('property', 'og:title', DEFAULT_META.title);
      setMeta('property', 'og:description', DEFAULT_META.description);
      setMeta('property', 'og:url', DEFAULT_META.url);
      setMeta('property', 'og:image', DEFAULT_META.image);
      setMeta('name', 'twitter:title', DEFAULT_META.title);
      setMeta('name', 'twitter:description', DEFAULT_META.description);
      setMeta('name', 'twitter:url', DEFAULT_META.url);
      setMeta('name', 'twitter:image', DEFAULT_META.image);
      // Remove breadcrumb script on unmount
      document.getElementById('about-breadcrumb-jsonld')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* SkipLinks for a11y keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:bg-primary focus:text-primary-foreground focus:outline-none"
      >
        Skip to main content
      </a>
      <Header />

      <main id="main-content" className="flex-1">
        {/* ── Hero ── */}
        <section className="relative py-20 sm:py-32 px-4 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-accent/5 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4 border border-border/50 rounded-full px-3 py-1">
              The OffMeta Story
            </span>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Built for players who{' '}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                think in text
              </span>
            </h1>

            {/* Animated cycling tagline */}
            <div
              aria-live="polite"
              aria-atomic="true"
              className="h-10 mb-6 flex items-center justify-center"
            >
              <span className="text-2xl sm:text-3xl font-semibold text-foreground/90 tracking-tight">
                {tagline}
                <span
                  className="inline-block w-0.5 h-7 sm:h-8 ml-0.5 align-middle bg-accent animate-pulse"
                  aria-hidden="true"
                />
              </span>
            </div>

            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
              OffMeta started as a simple question: <em>"What if you could find Magic cards just by describing what you want?"</em> 
              Seven phases later, it's becoming something much bigger.
            </p>

            <StatCounters />
          </div>
        </section>

        {/* ── Phase Timeline ── */}
        <div className="border-t border-border/30">
          <PhaseTimeline />
        </div>

        {/* ── Evolution Arc ── */}
        <div className="border-t border-border/30 bg-card/20">
          <EvolutionArc />
        </div>

        {/* ── Phase 7 Next Cards ── */}
        <div className="border-t border-border/30">
          <NextPhaseCards />
        </div>

        {/* ── CTA ── */}
        <section className="border-t border-border/30 bg-card/20 py-16 sm:py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to search smarter?
            </h2>
            <p className="text-muted-foreground text-sm mb-10 max-w-lg mx-auto">
              Every phase brought OffMeta closer to the tool serious Magic players deserve. 
              Try it now — all of it is free.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Search className="h-4 w-4" />
                Try the Search
              </Link>
              <Link
                to="/deckbuilder"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card/50 text-foreground text-sm font-medium hover:bg-card transition-colors"
              >
                <Layers className="h-4 w-4" />
                Open Deck Builder
              </Link>
              <Link
                to="/combos"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card/50 text-foreground text-sm font-medium hover:bg-card transition-colors"
              >
                <Swords className="h-4 w-4" />
                Find Combos
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
