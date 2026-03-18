/**
 * AI-optimized landing page for programmatic SEO.
 * Renders structured, LLM-friendly content from the seo_pages table.
 * @module pages/AiPage
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { applySeoMeta, injectJsonLd } from '@/lib/seo';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowRight, ExternalLink, Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cardNameToSlug } from '@/lib/card-slug';

interface SeoPageContent {
  tldr: string;
  explanation: string;
  cards: Array<{
    name: string;
    manaCost: string;
    typeLine: string;
    description: string;
  }>;
  whyTheseWork: string;
  relatedQueries: string[];
  faqs: Array<{ question: string; answer: string }>;
}

interface SeoPage {
  id: string;
  query: string;
  slug: string;
  content_json: SeoPageContent;
  published_at: string | null;
  updated_at: string;
}

function CopyAnswerButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/50 bg-card/50 text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors"
      aria-label="Copy answer"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy Answer'}
    </button>
  );
}

function CardEntity({ card }: { card: SeoPageContent['cards'][0] }) {
  const slug = cardNameToSlug(card.name);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = useCallback(async () => {
    timerRef.current = setTimeout(async () => {
      setHovered(true);
      if (imgUrl !== null) return;
      try {
        const { data } = await supabase
          .from('cards')
          .select('image_url')
          .eq('name', card.name)
          .maybeSingle();
        setImgUrl(data?.image_url ?? '');
      } catch {
        setImgUrl('');
      }
    }, 300);
  }, [card.name, imgUrl]);

  const onLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovered(false);
  }, []);

  return (
    <li className="py-3 border-b border-border/30 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <Link
            to={`/cards/${slug}`}
            className="font-semibold text-foreground hover:text-accent transition-colors"
          >
            {card.name}
          </Link>
          <span className="ml-2 text-xs text-muted-foreground font-mono">
            {card.manaCost}
          </span>
          <p className="text-sm text-muted-foreground mt-0.5">{card.typeLine}</p>
          <p className="text-sm mt-1">{card.description}</p>
          {/* Card image hover preview */}
          {hovered && imgUrl && (
            <span
              className="pointer-events-none absolute right-0 top-0 z-50 rounded-xl shadow-2xl border border-border overflow-hidden"
              style={{ width: 146, height: 204 }}
            >
              <img src={imgUrl} alt={card.name} width={146} height={204} className="block object-cover w-full h-full" loading="lazy" />
            </span>
          )}
        </div>
        <Link
          to={`/cards/${slug}`}
          className="shrink-0 text-muted-foreground hover:text-accent transition-colors"
          aria-label={`View ${card.name} details`}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </li>
  );
}

export default function AiPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['seo-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('slug', slug ?? '')
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Page not found');

      return data as unknown as SeoPage;
    },
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const content = page?.content_json;

  // SEO meta + JSON-LD
  useEffect(() => {
    if (!page || !content) return;

    const canonicalUrl = `https://offmeta.app/ai/${page.slug}`;
    const desc = content.tldr.slice(0, 160);

    const cleanupMeta = applySeoMeta({
      title: `${page.query} — MTG Card Guide | OffMeta`,
      description: desc,
      url: canonicalUrl,
      type: 'article',
    });

    // FAQPage + Article JSON-LD
    const jsonLdData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: page.query,
          description: desc,
          url: canonicalUrl,
          author: { '@type': 'Organization', name: 'OffMeta' },
          publisher: {
            '@type': 'Organization',
            name: 'OffMeta',
            url: 'https://offmeta.app',
          },
          datePublished: page.published_at,
          dateModified: page.updated_at,
          mainEntityOfPage: canonicalUrl,
        },
        {
          '@type': 'FAQPage',
          mainEntity: content.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app' },
            { '@type': 'ListItem', position: 2, name: 'AI Guides', item: 'https://offmeta.app/ai' },
            { '@type': 'ListItem', position: 3, name: page.query, item: canonicalUrl },
          ],
        },
      ],
    };

    const cleanupJsonLd = injectJsonLd(jsonLdData);

    return () => {
      cleanupMeta();
      cleanupJsonLd();
    };
  }, [page, content]);

  useNoIndex(!page && !isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  if (error || !page || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Page Not Found</h1>
          <p className="text-muted-foreground">This guide doesn't exist yet.</p>
          <Link to="/" className="text-accent hover:underline">
            Search for cards →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav
          className="text-sm text-muted-foreground mb-6"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-foreground transition-colors">
                OffMeta
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground">{page.query}</li>
          </ol>
        </nav>

        {/* H1 — exact query */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-6">
          {page.query}
        </h1>

        {/* TL;DR Answer Block */}
        <section
          className="rounded-lg border border-accent/20 bg-accent/5 p-5 sm:p-6 mb-8"
          aria-label="Quick answer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              TL;DR
            </span>
            <CopyAnswerButton text={content.tldr} />
          </div>
          <p className="text-base sm:text-lg leading-relaxed">{content.tldr}</p>
        </section>

        {/* Expanded Explanation */}
        <section className="prose prose-invert max-w-none mb-10">
          {content.explanation.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-base leading-relaxed text-foreground/90 mb-4">
              {paragraph}
            </p>
          ))}
        </section>

        {/* Card List */}
        <section className="mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">
            Top Cards for "{page.query}"
          </h2>
          <ul className="divide-y-0">
            {content.cards.map((card) => (
              <CardEntity key={card.name} card={card} />
            ))}
          </ul>
        </section>

        {/* Why These Work */}
        <section className="mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">
            Why These Cards Work
          </h2>
          <p className="text-base leading-relaxed text-foreground/90">
            {content.whyTheseWork}
          </p>
        </section>

        {/* Related Queries */}
        {content.relatedQueries.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              Related Searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {content.relatedQueries.map((rq) => {
                const rqSlug = rq
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, '')
                  .trim()
                  .replace(/\s+/g, '-')
                  .slice(0, 80);
                return (
                  <Link
                    key={rq}
                    to={`/search/${rqSlug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border/50 bg-card/50 text-sm hover:border-accent/30 hover:text-accent transition-colors"
                  >
                    {rq}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {content.faqs.length > 0 && (
          <section className="mb-10" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-xl sm:text-2xl font-semibold mb-4"
            >
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {content.faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="border border-border/50 rounded-lg px-4 sm:px-6 bg-card/50 hover:border-accent/20 transition-colors"
                >
                  <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm sm:text-base pb-4 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {/* Citation footer */}
        <footer className="mt-12 pt-6 border-t border-border/30 text-sm text-muted-foreground">
          <p>
            Source:{' '}
            <Link to="/" className="text-accent hover:underline">
              OffMeta
            </Link>{' '}
            — AI-powered MTG card search and discovery.
          </p>
          <p className="mt-1">
            Card data sourced from{' '}
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Scryfall
            </a>
            . Prices are approximate and subject to change.
          </p>
        </footer>
      </article>
    </div>
  );
}
