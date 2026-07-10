/**
 * Docs landing page - indexes guides, FAQ, and syntax cheat sheet.
 */

import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GUIDE_SUMMARIES as GUIDES } from '@/data/guide-summaries';
import { BookOpen, FileText, Sparkles, ChevronRight, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SkipLinks } from '@/components/SkipLinks';
import { applySeoMeta, injectJsonLd } from '@/lib/seo';

export default function DocsIndex() {
  const { t } = useTranslation();

  useEffect(() => {
    const cleanupSeo = applySeoMeta({
      title: 'OffMeta Docs - MTG Search Guides & Syntax',
      description:
        'OffMeta MTG search reference - guides, Scryfall syntax cheat sheet, and FAQ for natural-language Magic: The Gathering card search.',
      url: 'https://offmeta.app/docs',
      type: 'website',
      section: 'Docs',
      keywords: [
        'OffMeta docs',
        'MTG search documentation',
        'Scryfall syntax cheat sheet',
        'natural language MTG search',
        'Magic: The Gathering search reference',
        'MTG deckbuilder docs',
      ],
    });
    const cleanupLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
        { '@type': 'ListItem', position: 2, name: 'Docs', item: 'https://offmeta.app/docs' },
      ],
    });
    return () => {
      cleanupSeo();
      cleanupLd();
    };
  }, []);

  const sections = useMemo(
    () => [
      {
        title: t('docs.syntaxTitle', 'Search Syntax Cheat Sheet'),
        description: t('docs.syntaxDesc', 'Translate common natural phrases into Scryfall operators.'),
        href: '/docs/syntax',
        icon: Sparkles,
      },
      {
        title: t('nav.guides', 'Guides'),
        description: `${GUIDES.length} ${t('docs.guidesDesc', 'progressive guides')}`,
        href: '/guides',
        icon: BookOpen,
      },
      {
        title: t('docs.archetypesTitle', 'Archetypes & Metagame'),
        description: t(
          'docs.archetypesDesc',
          'Browse MTG archetypes across formats with meta share percentages and signature cards.',
        ),
        href: '/archetypes',
        icon: BookOpen,
      },
      {
        title: t('docs.marketTrendsTitle', 'Market Trends'),
        description: t(
          'docs.marketTrendsDesc',
          'Track daily and weekly MTG card price movers - biggest gainers and losers.',
        ),
        href: '/market',
        icon: TrendingUp,
      },
      {
        title: t('docs.deckBuilderTitle', 'Deck Builder'),
        description: t(
          'docs.deckBuilderDesc',
          'Build, save, and share MTG decks with full format validation and card suggestions.',
        ),
        href: '/deckbuilder',
        icon: FileText,
      },
      {
        title: t('docs.communityDecksTitle', 'Browse Community Decks'),
        description: t(
          'docs.communityDecksDesc',
          'Explore tournament and community-submitted decks across all formats.',
        ),
        href: '/decks',
        icon: BookOpen,
      },
      {
        title: t('docs.comboFinderTitle', 'Combo Finder'),
        description: t(
          'docs.comboFinderDesc',
          'Discover card combos and synergy packages for your deck or commander.',
        ),
        href: '/combos',
        icon: Sparkles,
      },
      {
        title: t('docs.faqTitle'),
        description: t('docs.faqDesc'),
        href: '/#faq',
        icon: FileText,
      },
    ],
    [t],
  );

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
              {t('docs.pageTitle', 'OffMeta Documentation')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              {t('docs.subtitle')}
            </p>
          </header>

          <section className="prose prose-sm prose-invert max-w-none text-muted-foreground space-y-3 text-sm leading-relaxed border-b border-border/30 pb-8">
            <p>
              {t(
                'docs.intro1',
                'OffMeta is a natural language Magic: The Gathering card search engine. Instead of learning Scryfall\'s query syntax, you describe what you need in plain English -',
              )}{' '}
              <em>
                {t(
                  'docs.introExamples',
                  '"cheap green ramp spells," "blue flying creatures under $2," "commander-legal board wipes"',
                )}
              </em>{' '}
              {t(
                'docs.intro1Tail',
                'and OffMeta translates it into a valid Scryfall query and returns real card results instantly.',
              )}
            </p>
            <p>
              {t(
                'docs.intro2',
                'This documentation covers everything you need to get the most out of OffMeta: a full Search Syntax Cheat Sheet mapping natural phrases to Scryfall operators,',
              )}{' '}
              <strong>{GUIDES.length} {t('docs.progressiveGuides', 'progressive search guides')}</strong>{' '}
              {t(
                'docs.intro2Tail',
                'from beginner creature-type searches to expert multi-constraint queries, and a FAQ answering common questions about how the translation engine works.',
              )}
            </p>
            <p>
              {t(
                'docs.intro3',
                'Whether you are building a Commander deck, looking for budget staples, searching by keyword ability, or hunting for tribal synergy pieces, the guides below teach you the patterns OffMeta understands - so your natural language searches get more accurate results.',
              )}
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

          <section className="space-y-3 border-t border-border/30 pt-8 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-base font-semibold text-foreground">
              {t('docs.howItWorksTitle', 'How OffMeta Search Works')}
            </h2>
            <p>
              {t(
                'docs.howItWorksBody1',
                'OffMeta uses a combination of deterministic rule matching and AI translation to convert your natural language input into valid',
              )}{' '}
              <a
                href="https://scryfall.com/docs/syntax"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t('docs.scryfallSyntaxLink', 'Scryfall search syntax')}
              </a>
              {t(
                'docs.howItWorksBody1Tail',
                '. Common patterns - colors, creature types, formats, price ranges, keywords - are resolved instantly using a curated rule set, with no AI latency. Complex or ambiguous queries fall back to AI translation so results remain accurate even for unusual requests.',
              )}
            </p>
            <p>
              {t(
                'docs.howItWorksBody2',
                'Scryfall is the most comprehensive Magic: The Gathering card database available, covering every card ever printed including oracle text, rulings, prices, legalities, and alternate art printings. OffMeta acts as the natural language layer on top of Scryfall - you describe what you need, OffMeta writes the Scryfall query, and Scryfall returns the matching cards.',
              )}
            </p>
            <p>
              {t(
                'docs.howItWorksBody3',
                'The search guides cover the most common MTG search patterns: finding cards by creature type, filtering by color identity, setting budget price limits, checking format legality, searching by keyword ability, finding ramp and card draw effects, building tribal synergy packages, and combining multiple constraints in a single query.',
              )}
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
