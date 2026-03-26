/**
 * About page — conversion-focused and SEO-aware product positioning.
 * Clearly differentiates OffMeta from decklist/content brands and black-box tools.
 * @module pages/About
 */

import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';
import { Search, WandSparkles, Code2, ArrowRight } from 'lucide-react';

const ABOUT_META = {
  title:
    'About OffMeta — Transparent AI MTG Search Tool for Real Scryfall Queries',
  description:
    'OffMeta is a transparent AI-powered MTG search engine. Search Magic cards in plain English, see the real Scryfall query instantly, and edit it yourself.',
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

function setMeta(attr: 'property' | 'name', key: string, value: string) {
  let el = document.querySelector(
    `meta[${attr}="${key}"]`,
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(url: string) {
  let el = document.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

export default function About() {
  useEffect(() => {
    const prev = {
      title: document.title,
      description:
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') ?? '',
      canonical:
        document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
        '',
    };

    document.title = ABOUT_META.title;
    setCanonical(ABOUT_META.url);

    setMeta('name', 'description', ABOUT_META.description);
    setMeta('property', 'og:title', ABOUT_META.title);
    setMeta('property', 'og:description', ABOUT_META.description);
    setMeta('property', 'og:url', ABOUT_META.url);
    setMeta('property', 'og:image', ABOUT_META.image);
    setMeta('property', 'og:type', 'website');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', ABOUT_META.title);
    setMeta('name', 'twitter:description', ABOUT_META.description);
    setMeta('name', 'twitter:url', ABOUT_META.url);
    setMeta('name', 'twitter:image', ABOUT_META.image);

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
      document.getElementById('about-breadcrumb-jsonld')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:bg-primary focus:text-primary-foreground focus:outline-none"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main-content" className="flex-1">
        <section className="relative py-20 sm:py-28 px-4 border-b border-border/40">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[620px] h-[320px] rounded-full bg-accent/10 blur-3xl" />
          </div>
          <div className="relative max-w-4xl mx-auto text-center">
            <p className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-6">
              About OffMeta
            </p>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
              Search Magic cards in plain English.{' '}
              <br className="hidden sm:block" />
              <span className="text-accent">
                Get a real Scryfall query you can edit.
              </span>
            </h1>
            <p className="max-w-3xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10">
              OffMeta is a transparent AI-powered MTG search tool, not a
              decklist site, not an EDH content brand, and not a black-box AI
              toy. We help you search the way you naturally think, then show the
              exact Scryfall syntax behind the result so you stay in control.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Search className="h-4 w-4" />
                Try OffMeta Search
              </Link>
              <a
                href="https://scryfall.com/docs/syntax"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-card/80 transition-colors"
              >
                <Code2 className="h-4 w-4" />
                Learn Scryfall Syntax
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 border-b border-border/30">
          <div className="max-w-3xl mx-auto space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              What OffMeta does
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              OffMeta turns natural language MTG search into production-ready
              Scryfall search. Type a request like, “cheap red instants that
              deal damage and can hit any target,” and OffMeta translates it
              into a structured query immediately. You can run it, refine it,
              and iterate without memorizing every operator first.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 border-b border-border/30 bg-card/20">
          <div className="max-w-3xl mx-auto space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Why OffMeta exists
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Magic card search is powerful, but syntax can slow down discovery.
              OffMeta exists to remove that friction for brewers, grinders, and
              curious players who think in game concepts first and filters
              second. It gives you faster first results while still respecting
              the precision that makes Scryfall great.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 border-b border-border/30">
          <div className="max-w-3xl mx-auto space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              What makes it different
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Most AI Magic card search experiences hide their logic. OffMeta
              does the opposite. You can always see the generated Scryfall
              query, edit it directly, and understand why results appeared. That
              transparency is the moat: better speed from AI, better trust from
              visible syntax, and better control for power users.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              OffMeta is designed as a layer on top of Scryfall, not a
              replacement for it. We help you get to the right query faster,
              then hand control back to you.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 border-b border-border/30 bg-card/20">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Plain English in, real Scryfall query out
            </h2>
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Natural language input
                </p>
                <p className="text-foreground font-medium">
                  “Blue and white creatures with flying or vigilance, mana value
                  3 or less.”
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Generated query
                </p>
                <code className="block text-sm sm:text-base text-foreground bg-secondary rounded-lg px-3 py-2 overflow-x-auto">
                  (c:wu) t:creature (o:flying or o:vigilance) mv&lt;=3
                </code>
              </div>
              <p className="text-sm text-muted-foreground">
                Then edit it however you want: add legality, narrow text, or
                tune mana cost. The query is yours.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 border-b border-border/30">
          <div className="max-w-3xl mx-auto space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Who it is for
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              OffMeta is for players who want fast, accurate Magic card search
              without giving up control. If you brew often, test weird ideas,
              compare options across formats, or just want an AI Magic card
              search tool that shows its work, OffMeta is built for you.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 border-b border-border/30 bg-card/20">
          <div className="max-w-3xl mx-auto space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Where we are going
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Our focus is simple: keep improving natural language MTG search
              while staying transparent. We are investing in better query
              translation, clearer explanations, and tighter workflows for
              players who move from idea to card pool fast. The long-term vision
              is an MTG search engine that feels effortless for new users and
              precise for experts.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-5">
              <WandSparkles className="h-7 w-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              A clearer way to search Magic cards
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              If you are looking for an MTG search tool, a dependable Magic card
              search workflow, or a practical way to bridge AI with Scryfall
              search, OffMeta gives you all three: natural language in,
              transparent query out, full control in your hands.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Start searching now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
