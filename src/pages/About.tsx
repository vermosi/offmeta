/**
 * About page — conversion-focused and SEO-aware product positioning.
 * Clearly differentiates OffMeta from decklist/content brands and black-box tools.
 * @module pages/About
 */

import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';

import { useTranslation } from '@/lib/i18n';

const ABOUT_META = {
  title: 'About OffMeta — Transparent AI MTG Card Search',
  description:
    'OffMeta is a transparent AI-powered MTG search engine. Search Magic cards in plain English, see the real Scryfall query, and edit it yourself.',
  url: 'https://offmeta.app/about',
  image: 'https://offmeta.app/og-image.png',
} as const;

const DEFAULT_META = {
  title: 'Search Magic cards in plain English | OffMeta',
  description:
    'Find Magic cards by typing what you mean. No syntax required.',
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
  const { t } = useTranslation();

  useEffect(() => {
    const prev = {
      title: document.title,
      description:
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') ?? '',
      canonical:
        document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
    };

    document.title = ABOUT_META.title;
    setCanonical(ABOUT_META.url);

    setMeta('name', 'description', ABOUT_META.description);
    setMeta('property', 'og:title', ABOUT_META.title);
    setMeta('property', 'og:description', ABOUT_META.description);
    setMeta('property', 'og:url', ABOUT_META.url);
    setMeta('property', 'og:image', ABOUT_META.image);
    setMeta(
      'property',
      'og:image:alt',
      'OffMeta — search Magic cards by intent, see the real Scryfall query',
    );
    setMeta(
      'name',
      'twitter:image:alt',
      'OffMeta — search Magic cards by intent, see the real Scryfall query',
    );
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
      '@graph': [
        {
          '@type': 'Organization',
          '@id': 'https://offmeta.app/#organization',
          name: 'OffMeta',
          url: 'https://offmeta.app/',
          logo: 'https://offmeta.app/offmeta-logo.png',
          description:
            'Transparent AI-powered natural language search engine for Magic: The Gathering cards.',
        },
        {
          '@type': 'AboutPage',
          '@id': 'https://offmeta.app/about#aboutpage',
          url: 'https://offmeta.app/about',
          name: ABOUT_META.title,
          description: ABOUT_META.description,
          inLanguage: 'en',
          isPartOf: { '@type': 'WebSite', name: 'OffMeta', url: 'https://offmeta.app/' },
          about: { '@id': 'https://offmeta.app/#organization' },
          primaryImageOfPage: { '@type': 'ImageObject', url: ABOUT_META.image },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
            { '@type': 'ListItem', position: 2, name: 'About', item: 'https://offmeta.app/about' },
          ],
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
        {t('common.skipToMain', 'Skip to main content')}
      </a>

      <Header />

      <main id="main-content" className="container-main flex-1 pb-20 pt-8">
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                OffMeta
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">About</li>
          </ol>
        </nav>

        <header className="border-b border-border/60 pb-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <h1 className="font-display text-[clamp(2.25rem,5.6vw,4.25rem)] font-extrabold uppercase leading-[0.88] tracking-tight text-foreground lg:col-span-7">
              Search Magic
              <br />
              <span className="font-editorial text-[0.94em] font-normal normal-case italic tracking-normal text-accent">
                the way you think.
              </span>
            </h1>
            <div className="space-y-4 lg:col-span-5 lg:pb-2">
              <p className="max-w-md text-base leading-snug text-muted-foreground sm:text-lg">
                Not the way a query language expects you to.
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Search by intent / See the real query / Stay in control
              </p>
            </div>
          </div>
        </header>

        <section className="border-b border-border/50 py-12">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                01 / The problem
              </p>
            </div>
            <div className="space-y-4 lg:col-span-9">
              <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground sm:text-2xl">
                Scryfall is extraordinarily powerful.
              </h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                {t(
                  'about.whyBody',
                  'Magic card search is powerful, but syntax can slow down discovery. OffMeta exists to remove that friction for brewers, grinders, and curious players who think in game concepts first and filters second. It gives you faster first results while still respecting the precision that makes Scryfall great.',
                )}
              </p>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                {t(
                  'about.whatDoesBody',
                  'OffMeta turns natural language MTG search into production-ready Scryfall search. Type a request like, "cheap red instants that deal damage and can hit any target," and OffMeta translates it into a structured query immediately. You can run it, refine it, and iterate without memorizing every operator first.',
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border/50 py-12">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                02 / The translation
              </p>
            </div>
            <div className="lg:col-span-9">
              <div className="space-y-8">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    You say
                  </p>
                  <p className="mt-2 font-display text-lg font-bold uppercase leading-tight tracking-tight text-foreground sm:text-2xl">
                    “Blue and white creatures with flying or vigilance, mana
                    value 3 or less”
                  </p>
                </div>

                <div
                  aria-hidden="true"
                  className="font-mono text-sm text-muted-foreground/60"
                >
                  ↓
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    OffMeta reads
                  </p>
                  <dl className="mt-3 max-w-lg">
                    {[
                      ['Color', 'WU'],
                      ['Type', 'Creature'],
                      ['Ability', 'Flying or vigilance'],
                      ['MV', '≤ 3'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-baseline justify-between gap-6 border-b border-border/50 py-2 first:border-t"
                      >
                        <dt className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="font-mono text-sm text-foreground">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div
                  aria-hidden="true"
                  className="font-mono text-sm text-muted-foreground/60"
                >
                  ↓
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    Scryfall gets
                  </p>
                  <code className="mt-2 block overflow-x-auto border-l-2 border-accent/60 py-1 pl-4 font-mono text-sm text-foreground sm:text-base">
                    (c:wu) t:creature (o:flying or o:vigilance) mv&lt;=3
                  </code>
                  <Link
                    to="/search/blue%20and%20white%20creatures%20with%20flying%20or%20vigilance%20mana%20value%203%20or%20less"
                    className="mt-5 inline-block font-mono text-[11px] uppercase tracking-[0.26em] text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground"
                  >
                    Try this search →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border/50 py-12">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                03 / The principle
              </p>
            </div>
            <div className="space-y-4 lg:col-span-9">
              <h2 className="font-display text-2xl font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-3xl">
                Search help should be visible.
                <br />
                <span className="font-editorial text-[0.9em] font-normal normal-case italic tracking-normal text-accent">
                  not hidden behind the search.
                </span>
              </h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                {t(
                  'about.differentBody',
                  'Most AI Magic card search experiences hide their logic. OffMeta does the opposite. You can always see the generated Scryfall query, edit it directly, and understand why results appeared. That transparency is the moat: better speed from AI, better trust from visible syntax, and better control for power users.',
                )}
              </p>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                {t(
                  'about.whoBody',
                  'OffMeta is for players who want fast, accurate Magic card search without giving up control. If you brew often, test weird ideas, compare options across formats, or just want an AI Magic card search tool that shows its work, OffMeta is built for you.',
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border/50 py-12">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                04 / The relationship
              </p>
            </div>
            <div className="space-y-4 lg:col-span-9">
              <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground sm:text-2xl">
                A layer on top of Scryfall, not a replacement for it.
              </h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                {t(
                  'about.differentBody2',
                  'OffMeta is designed as a layer on top of Scryfall, not a replacement for it. We help you get to the right query faster, then hand control back to you.',
                )}
              </p>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                {t(
                  'about.roadmapBody',
                  'Our focus is simple: keep improving natural language MTG search while staying transparent. We are investing in better query translation, clearer explanations, and tighter workflows for players who move from idea to card pool fast. The long-term vision is an MTG search engine that feels effortless for new users and still satisfies advanced deckbuilders.',
                )}
              </p>
              <a
                href="https://scryfall.com/docs/syntax"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground underline decoration-border underline-offset-[6px] transition-colors hover:text-foreground"
              >
                Scryfall syntax reference ↗
              </a>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                05 / Keep exploring
              </p>
            </div>
            <ul className="lg:col-span-9">
              {[
                {
                  to: '/guides',
                  title: 'Field guide',
                  copy: 'Learn how to search better.',
                },
                {
                  to: '/combos',
                  title: 'Combos',
                  copy: 'Explore interactions and engines.',
                },
                {
                  to: '/browse-searches',
                  title: 'Curated searches',
                  copy: 'Start with useful ideas.',
                },
              ].map((row) => (
                <li key={row.to}>
                  <Link
                    to={row.to}
                    className="group flex items-baseline justify-between gap-6 border-b border-border/50 py-5 transition-colors first:border-t hover:bg-foreground/[0.02]"
                  >
                    <span className="min-w-0">
                      <span className="font-display text-base font-bold uppercase tracking-tight text-foreground">
                        {row.title}
                      </span>
                      <span className="ml-3 text-sm text-muted-foreground">
                        {row.copy}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>


      <Footer />
    </div>
  );
}
