/**
 * Docs landing page — indexes guides, FAQ, and syntax cheat sheet.
 */

import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GUIDES } from '@/data/guides';
import { BookOpen, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SkipLinks } from '@/components/SkipLinks';

export default function DocsIndex() {
  const { t } = useTranslation();

  useEffect(() => {
    const prev = document.title;
    document.title = 'OffMeta Docs — MTG Search Guides & Syntax Reference';
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'docs-jsonld';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
        { '@type': 'ListItem', position: 2, name: 'Docs', item: 'https://offmeta.app/docs' },
      ],
    });
    document.head.appendChild(s);
    return () => {
      document.title = prev;
      document.getElementById('docs-jsonld')?.remove();
    };
  }, []);

  const sections = useMemo(() => [
    {
      title: t('docs.syntaxTitle'),
      description: t('docs.syntaxDesc'),
      href: '/docs/syntax',
      icon: Sparkles,
    },
    {
      title: t('nav.guides'),
      description: `${GUIDES.length} ${t('docs.guidesDesc')}`,
      href: '/guides',
      icon: BookOpen,
    },
    {
      title: t('docs.faqTitle'),
      description: t('docs.faqDesc'),
      href: '/#faq',
      icon: FileText,
    },
  ], [t]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <SkipLinks />
      <Header />

      <main id="main-content" className="flex-1 container-main py-10 sm:py-14 lg:py-20">
        <div className="max-w-2xl mx-auto space-y-10">
          <header className="space-y-4 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground">
              OffMeta Documentation
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              {t('docs.subtitle')}
            </p>
          </header>

          {/* Substantive intro — gives Googlebot enough prose to assess page quality */}
          <section className="prose prose-sm max-w-none text-muted-foreground space-y-3 text-sm leading-relaxed border-b border-border/30 pb-8">
            <p>
              OffMeta is a natural language Magic: The Gathering card search engine. Instead of
              learning Scryfall's query syntax, you describe what you need in plain English —
              <em> "cheap green ramp spells," "blue flying creatures under $2," "commander-legal
              board wipes"</em> — and OffMeta translates it into a valid Scryfall query and
              returns real card results instantly.
            </p>
            <p>
              This documentation covers everything you need to get the most out of OffMeta: a
              full <strong>Search Syntax Cheat Sheet</strong> mapping natural phrases to Scryfall
              operators, <strong>{GUIDES.length} progressive search guides</strong> from beginner
              creature-type searches to expert multi-constraint queries, and a{' '}
              <strong>FAQ</strong> answering common questions about how the translation engine
              works.
            </p>
            <p>
              Whether you are building a Commander deck, looking for budget staples, searching
              by keyword ability, or hunting for tribal synergy pieces, the guides below teach
              you the patterns OffMeta understands — so your natural language searches get more
              accurate results.
            </p>
          </section>

          <div className="grid gap-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.href}
                  to={section.href}
                  className="group flex items-start gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="mt-0.5 flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors mt-1 flex-shrink-0" />
                </Link>
              );
            })}
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t('docs.allGuides')}</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {GUIDES.map((guide) => (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <span>{t(`guide.title.${guide.slug}`, guide.title)}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Additional substantive content for search indexing */}
          <section className="space-y-3 border-t border-border/30 pt-8 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-base font-semibold text-foreground">How OffMeta Search Works</h2>
            <p>
              OffMeta uses a combination of deterministic rule matching and AI translation to
              convert your natural language input into valid{' '}
              <a
                href="https://scryfall.com/docs/syntax"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Scryfall search syntax
              </a>
              . Common patterns — colors, creature types, formats, price ranges, keywords — are
              resolved instantly using a curated rule set, with no AI latency. Complex or
              ambiguous queries fall back to AI translation so results remain accurate even for
              unusual requests.
            </p>
            <p>
              Scryfall is the most comprehensive Magic: The Gathering card database available,
              covering every card ever printed including oracle text, rulings, prices, legalities,
              and alternate art printings. OffMeta acts as the natural language layer on top of
              Scryfall — you describe what you need, OffMeta writes the Scryfall query, and
              Scryfall returns the matching cards.
            </p>
            <p>
              The search guides cover the most common MTG search patterns: finding cards by{' '}
              <strong>creature type</strong>, filtering by <strong>color identity</strong>,
              setting <strong>budget price limits</strong>, checking <strong>format
              legality</strong>, searching by <strong>keyword ability</strong>, finding{' '}
              <strong>ramp and card draw</strong> effects, building <strong>tribal
              synergy</strong> packages, and combining multiple constraints in a single query.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
