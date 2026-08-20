/**
 * Intent hub for search-first SEO.
 *
 * This is a lightweight landing page for high-value search intents:
 * "cards like X", budget searches, and hate cards.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Search,
  Sparkles,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { applySeoMeta, injectJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo';
import { useTranslation } from '@/lib/i18n';

export default function SearchIntentHub() {
  const { trackEvent } = useAnalytics();
  const { t } = useTranslation();

  const INTENTS = [
    {
      title: t('intents.hub.similar.title', 'Cards like X'),
      description: t(
        'intents.hub.similar.description',
        'Find alternatives, upgrades, and similar cards when you know one card already works.',
      ),
      example: 'cards similar to Seedborn Muse',
      href: '/search-intents/similar',
      icon: Sparkles,
    },
    {
      title: t('intents.hub.budget.title', 'Budget answers'),
      description: t(
        'intents.hub.budget.description',
        'Search for cheap removal, ramp, board wipes, and Commander staples under a price cap.',
      ),
      example: 'budget board wipes under $5',
      href: '/search-intents/budget',
      icon: Wallet,
    },
    {
      title: t('intents.hub.hate.title', 'Hate cards'),
      description: t(
        'intents.hub.hate.description',
        'Target treasure decks, graveyards, tokens, lifegain, artifacts, and other common plans.',
      ),
      example: 'cards that punish treasure decks',
      href: '/search-intents/hate',
      icon: ShieldAlert,
    },
  ] as const;

  useEffect(() => {
    const cleanupMeta = applySeoMeta({
      title: 'Search Intent Hub | OffMeta',
      description:
        'Browse high-value MTG search intents like cards like X, budget searches, and hate cards. Start with plain English and jump straight into search.',
      url: 'https://offmeta.app/search-intents',
      type: 'website',
    });

    const cleanupJsonLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        buildBreadcrumbJsonLd([
          { name: 'OffMeta', url: 'https://offmeta.app/' },
          { name: 'Search Intents', url: 'https://offmeta.app/search-intents' },
        ]),
        {
          '@type': 'CollectionPage',
          name: 'Search Intent Hub',
          description:
            'A compact hub for the most useful MTG search intents on OffMeta.',
          url: 'https://offmeta.app/search-intents',
          inLanguage: 'en',
          isPartOf: {
            '@type': 'WebSite',
            name: 'OffMeta',
            url: 'https://offmeta.app/',
          },
        },
      ],
    });

    return () => {
      cleanupMeta();
      cleanupJsonLd();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
        <nav
          className="mb-6 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                OffMeta
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground">{t('intents.hub.breadcrumb', 'Search Intents')}</li>
          </ol>
        </nav>

        <section className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent shadow-sm">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            {t('intents.hub.badge', 'High-value search intents')}
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {t('intents.hub.heading', 'Find the kind of card you mean, then jump straight into search.')}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('intents.hub.intro', 'OffMeta works best when you start from a job to be done. Use these intent patterns to get to the right cards faster, then refine the query in the editable search bar.')}
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {INTENTS.map(({ title, description, example, href, icon: Icon }) => (
            <Link
              key={title}
              to={href}
              onClick={() =>
                trackEvent('search_intent_hub_clicked', {
                  action: title,
                  placement: 'search_intent_hub',
                  cta: href,
                })
              }
              className="group rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-colors hover:border-accent/30 hover:bg-card"
            >
              <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
              <div className="mt-4 rounded-xl border border-border/50 bg-background/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t('intents.example', 'Example')}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  "{example}"
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                {t('intents.openInSearch', 'Open in search')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('intents.hub.bestFor', 'Best for')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link
              to="/guides"
              onClick={() =>
                trackEvent('search_intent_hub_clicked', {
                  action: 'Learn the syntax',
                  placement: 'search_intent_hub_footer',
                  cta: '/guides',
                })
              }
              className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-foreground transition-colors hover:border-accent/30 hover:bg-accent/5"
            >
              {t('intents.hub.learnSyntax', 'Learn the syntax')}
            </Link>
            <Link
              to="/about"
              onClick={() =>
                trackEvent('search_intent_hub_clicked', {
                  action: 'Why OffMeta',
                  placement: 'search_intent_hub_footer',
                  cta: '/about',
                })
              }
              className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-foreground transition-colors hover:border-accent/30 hover:bg-accent/5"
            >
              {t('intents.hub.whyOffMeta', 'Why OffMeta')}
            </Link>
            <Link
              to="/"
              onClick={() =>
                trackEvent('search_intent_hub_clicked', {
                  action: 'Start searching',
                  placement: 'search_intent_hub_footer',
                  cta: '/',
                })
              }
              className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-foreground transition-colors hover:border-accent/30 hover:bg-accent/5"
            >
              {t('intents.hub.startSearching', 'Start searching')}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
