/**
 * SEO-optimized guide page component.
 * Renders pre-built guide content with structured data, internal links, and a CTA to search.
 */

import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getGuideBySlug, GUIDES } from '@/data/guides';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Search, ArrowRight, Lightbulb, HelpCircle, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const guide = slug ? getGuideBySlug(slug) : undefined;

  // Update document head for SEO
  useEffect(() => {
    if (!guide) return;
    document.title = guide.metaTitle;

    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta('description', guide.metaDescription);
    setMeta('og:title', guide.metaTitle, 'property');
    setMeta('og:description', guide.metaDescription, 'property');
    setMeta('og:url', `https://offmeta.app/guides/${guide.slug}`, 'property');
    setMeta('twitter:title', guide.metaTitle);
    setMeta('twitter:description', guide.metaDescription);

    // Add canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `https://offmeta.app/guides/${guide.slug}`;

    return () => {
      document.title = 'OffMeta — Natural Language MTG Card Search';
      if (canonical) canonical.href = 'https://offmeta.app/';
    };
  }, [guide]);

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Guide not found</h1>
            <Link to="/" className="text-primary hover:underline">
              ← Back to search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const relatedGuides = guide.relatedGuides
    .map((s) => GUIDES.find((g) => g.slug === s))
    .filter(Boolean);

  const handleSearchClick = () => {
    navigate(`/?q=${encodeURIComponent(guide.searchQuery)}`);
  };

  // JSON-LD structured data for this guide
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.metaTitle,
    description: guide.metaDescription,
    url: `https://offmeta.app/guides/${guide.slug}`,
    author: { '@type': 'Organization', name: 'OffMeta' },
    publisher: { '@type': 'Organization', name: 'OffMeta' },
    mainEntityOfPage: `https://offmeta.app/guides/${guide.slug}`,
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Header />

      {/* Breadcrumb */}
      <nav className="container-main pt-4 sm:pt-6 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/guides" className="hover:text-foreground transition-colors">Guides</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium truncate">{guide.title}</li>
        </ol>
      </nav>

      {/* Main content */}
      <main className="flex-1 container-main py-8 sm:py-10 lg:py-12">
        <article className="max-w-2xl mx-auto space-y-8 sm:space-y-10 min-w-0">
          {/* Hero */}
          <header className="space-y-4">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-semibold text-foreground leading-tight">
              {guide.heading}
            </h1>
            <p className="text-lg text-muted-foreground">{guide.subheading}</p>
          </header>

          {/* CTA - Search this */}
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3 overflow-hidden">
            <p className="text-sm text-muted-foreground">Search these cards instantly on OffMeta:</p>
            <Button
              onClick={handleSearchClick}
              className="w-full sm:w-auto gap-2 max-w-full !whitespace-normal text-left"
              size="lg"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">Search "{guide.searchQuery}"</span>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Button>
          </div>

          {/* Intro */}
          <section className="prose-section">
            <p className="text-base leading-relaxed text-foreground/90">{guide.intro}</p>
          </section>

          {/* How OffMeta Helps */}
          {'howOffmetaHelps' in guide && guide.howOffmetaHelps && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">How OffMeta Helps</h2>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <span>You type:</span>
                  <code className="px-2 py-0.5 rounded bg-muted text-foreground font-mono text-xs truncate max-w-full">
                    {guide.searchQuery}
                  </code>
                </div>
                {'translatedQuery' in guide && (
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <span>OffMeta generates:</span>
                    <code className="px-2 py-0.5 rounded bg-muted text-foreground font-mono text-xs break-all">
                      {(guide as { translatedQuery: string }).translatedQuery}
                    </code>
                  </div>
                )}
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {guide.howOffmetaHelps}
                </p>
              </div>
            </section>
          )}

          {/* Tips */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Tips & Strategy</h2>
            </div>
            <ul className="space-y-3">
              {guide.tips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground/85 leading-relaxed">
                  <span className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {guide.faq.map((f, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <h3 className="font-medium text-foreground">{f.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Related Guides */}
          {relatedGuides.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Related Guides</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedGuides.map((rg) => rg && (
                  <Link
                    key={rg.slug}
                    to={`/guides/${rg.slug}`}
                    className="group rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                  >
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {rg.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{rg.subheading}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Bottom CTA */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Ready to find your cards?</h2>
            <p className="text-sm text-muted-foreground">
              Search for any Magic cards using natural language — no syntax needed.
            </p>
            <Button onClick={() => navigate('/')} size="lg" className="gap-2">
              <Search className="h-4 w-4" />
              Start Searching
            </Button>
          </div>
        </article>
      </main>

      <Footer />
      <ScrollToTop threshold={400} />
    </div>
  );
}
