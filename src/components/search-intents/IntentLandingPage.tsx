import { useEffect, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { applySeoMeta, buildBreadcrumbJsonLd, injectJsonLd } from '@/lib/seo';
import { Header } from '@/components/Header';

export type IntentSearchLink = {
  title: string;
  query: string;
  href: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

export type IntentLandingPageProps = {
  title: string;
  description: string;
  url: string;
  breadcrumbLabel: string;
  badgeLabel: string;
  heading: string;
  intro: string;
  searchSource: string;
  searches: readonly IntentSearchLink[];
  commonTitle: string;
  commonSections: Array<{
    title: string;
    description: string;
  }>;
};

export function IntentLandingPage({
  title,
  description,
  url,
  breadcrumbLabel,
  badgeLabel,
  heading,
  intro,
  searchSource,
  searches,
  commonTitle,
  commonSections,
}: IntentLandingPageProps) {
  const BadgeIcon = searches[0]?.icon;

  useEffect(() => {
    const cleanupMeta = applySeoMeta({
      title,
      description,
      url,
      type: 'website',
    });

    const cleanupLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        buildBreadcrumbJsonLd([
          { name: 'OffMeta', url: 'https://offmeta.app/' },
          { name: 'Search Intents', url: 'https://offmeta.app/search-intents' },
          { name: breadcrumbLabel, url },
        ]),
        {
          '@type': 'CollectionPage',
          name: breadcrumbLabel,
          description,
          url,
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
      cleanupLd();
    };
  }, [breadcrumbLabel, description, title, url]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
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
            <li>
              <Link
                to="/search-intents"
                className="transition-colors hover:text-foreground"
              >
                Search Intents
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground">{breadcrumbLabel}</li>
          </ol>
        </nav>

        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent">
            {BadgeIcon ? (
              <BadgeIcon className="h-3.5 w-3.5" aria-hidden={true} />
            ) : null}
            {badgeLabel}
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {heading}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {intro}
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {searches.map(({ title: searchTitle, query, href, icon: Icon }) => (
            <Link
              key={searchTitle}
              to={href}
              onClick={() => {
                try {
                  sessionStorage.setItem('offmeta_search_source', searchSource);
                } catch {
                  // ignore storage failures
                }
              }}
              className="group rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-colors hover:border-accent/30 hover:bg-card"
            >
              <Icon className="h-5 w-5 text-accent" aria-hidden={true} />
              <h2 className="mt-3 text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                {searchTitle}
              </h2>
              <div className="mt-4 rounded-xl border border-border/50 bg-background/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Example
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  "{query}"
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Open in search
                <ArrowRight className="h-4 w-4" aria-hidden={true} />
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {commonTitle}
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {commonSections.map((section) => (
              <div
                key={section.title}
                className="rounded-xl border border-border/50 bg-background/60 p-4"
              >
                <h2 className="text-sm font-semibold text-foreground">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
