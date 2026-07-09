/**
 * AI-optimized landing page for programmatic SEO.
 * Renders structured, LLM-friendly content from the seo_pages table.
 * @module pages/AiPage
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { applySeoMeta, injectJsonLd } from '@/lib/seo';
import { useNoIndex } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowRight, ExternalLink, Copy, Check } from 'lucide-react';
import { cardNameToSlug } from '@/lib/card-slug';
import { useTranslation } from '@/lib/i18n';

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
  const { t } = useTranslation();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
      aria-label={copied ? t('ai.copied') : t('ai.copyAnswer')}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t('ai.copied') : t('ai.copyAnswer')}
    </button>
  );
}

function CardEntity({ card }: { card: SeoPageContent['cards'][0] }) {
  const slug = cardNameToSlug(card.name);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();

  const onEnter = useCallback(() => {
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
    <li className="border-b border-border/30 py-3 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="relative min-w-0 flex-1" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <Link to={`/cards/${slug}`} className="font-semibold text-foreground transition-colors hover:text-accent">
            {card.name}
          </Link>
          <span className="ml-2 font-mono text-xs text-muted-foreground">{card.manaCost}</span>
          <p className="mt-0.5 text-sm text-muted-foreground">{card.typeLine}</p>
          <p className="mt-1 text-sm">{card.description}</p>
          {hovered && imgUrl && (
            <span
              className="pointer-events-none absolute right-0 top-0 z-50 overflow-hidden rounded-xl border border-border shadow-2xl"
              style={{ width: 146, height: 204 }}
            >
              <img
                src={imgUrl}
                alt={card.name}
                width={146}
                height={204}
                className="block h-full w-full object-cover"
                loading="lazy"
              />
            </span>
          )}
        </div>
        <Link
          to={`/cards/${slug}`}
          className="shrink-0 text-muted-foreground transition-colors hover:text-accent"
          aria-label={t('ai.viewCardDetails', { name: card.name })}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </li>
  );
}

export default function AiPage() {
  const { t } = useTranslation();
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
      if (!data) throw new Error(t('ai.pageNotFound'));

      return data as unknown as SeoPage;
    },
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const content = page?.content_json;

  useEffect(() => {
    if (!page || !content) return;

    const canonicalUrl = `https://offmeta.app/ai/${page.slug}`;
    const desc = content.tldr.slice(0, 160);

    const cleanupMeta = applySeoMeta({
      title: t('ai.seoTitle', { query: page.query }),
      description: desc,
      url: canonicalUrl,
      type: 'article',
    });

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
            { '@type': 'ListItem', position: 1, name: t('ai.breadcrumbHome'), item: 'https://offmeta.app' },
            { '@type': 'ListItem', position: 2, name: t('ai.breadcrumbAiGuides'), item: 'https://offmeta.app/ai' },
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
  }, [page, content, t]);

  useNoIndex(!page && !isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-semibold">{t('ai.pageNotFoundTitle')}</h1>
          <p className="text-muted-foreground">{t('ai.pageNotFoundDesc')}</p>
          <Link to="/" className="text-accent hover:underline">
            {t('ai.searchForCards')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <nav className="mb-6 text-sm text-muted-foreground" aria-label={t('ai.breadcrumbLabel')}>
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                {t('ai.breadcrumbHome')}
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/ai" className="transition-colors hover:text-foreground">
                {t('ai.breadcrumbAiGuides')}
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground">{page.query}</li>
          </ol>
        </nav>

        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{page.query}</h1>

        <section className="mb-8 rounded-lg border border-accent/20 bg-accent/5 p-5 sm:p-6" aria-label={t('ai.quickAnswer')}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">{t('ai.tldr')}</span>
            <CopyAnswerButton text={content.tldr} />
          </div>
          <p className="text-base leading-relaxed sm:text-lg">{content.tldr}</p>
        </section>

        <section className="prose prose-invert mb-10 max-w-none">
          {content.explanation.split('\n\n').map((paragraph, i) => (
            <p key={i} className="mb-4 text-base leading-relaxed text-foreground/90">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold sm:text-2xl">{t('ai.topCards', { query: page.query })}</h2>
          <ul className="divide-y-0">
            {content.cards.map((card) => (
              <CardEntity key={card.name} card={card} />
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold sm:text-2xl">{t('ai.whyTheseWork')}</h2>
          <p className="text-base leading-relaxed text-foreground/90">{content.whyTheseWork}</p>
        </section>

        {content.relatedQueries.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">{t('ai.relatedSearches')}</h2>
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
                    className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-sm transition-colors hover:border-accent/30 hover:text-accent"
                  >
                    {rq}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {content.faqs.length > 0 && (
          <section className="mb-10" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="mb-4 text-xl font-semibold sm:text-2xl">
              {t('ai.faqTitle')}
            </h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {content.faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="rounded-lg border border-border/50 bg-card/50 px-4 transition-colors hover:border-accent/20 sm:px-6"
                >
                  <AccordionTrigger className="py-4 text-left text-base font-medium hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        <footer className="mt-12 border-t border-border/30 pt-6 text-sm text-muted-foreground">
          <p>
            {t('ai.sourceLabel')}{' '}
            <Link to="/" className="text-accent hover:underline">
              {t('ai.breadcrumbHome')}
            </Link>{' '}
            {t('ai.sourceDescription')}
          </p>
          <p className="mt-1">
            {t('ai.cardDataSource')}{' '}
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {t('ai.scryfall')}
            </a>
            {t('ai.priceNote')}
          </p>
        </footer>
      </article>
    </div>
  );
}
