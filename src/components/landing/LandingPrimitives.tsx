/**
 * Reusable editorial primitives for the OffMeta landing page system.
 * Typography, hairlines and whitespace — no feature cards, no pills.
 */

import { Link, useNavigate } from 'react-router-dom';
import { searchHref } from '@/lib/landing/searchHref';
import { useTranslation } from '@/lib/i18n';
import type {
  AdjacentConcept,
  IntentPath,
  RelatedPageLink,
} from '@/lib/landing/types';

const pad = (value: number) => String(value).padStart(2, '0');


/** 01 — index / breadcrumb notation. */
export function IndexHeader({
  trail,
  crumbs,
}: {
  trail: string[];
  crumbs: Array<{ label: string; href?: string }>;
}) {
  const { t } = useTranslation();
  return (
    <nav aria-label="Breadcrumb" className="pt-8">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <li>
          <Link to="/" className="transition-colors hover:text-foreground">
            {t('landing.offMeta', 'OffMeta')}
          </Link>
        </li>
        {crumbs.map((crumb, index) => (
          <li key={crumb.label} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            {crumb.href && index < crumbs.length - 1 ? (
              <Link
                to={crumb.href}
                className="transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
      <p className="sr-only">{trail.join(' / ')}</p>
    </nav>
  );
}

/** 02 — editorial hero. */
export function EditorialHero({
  headline,
  emphasis,
  lede,
  meta,
}: {
  headline: string;
  emphasis?: string;
  lede: string;
  meta?: string;
}) {
  return (
    <header className="grid gap-6 border-b border-border/60 pb-10 pt-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-8">
        <h1 className="font-display text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.88] tracking-tight text-foreground">
          {headline}
          {emphasis ? (
            <span className="block font-editorial text-[0.92em] font-normal normal-case italic tracking-normal text-accent">
              {emphasis}
            </span>
          ) : null}
        </h1>
      </div>
      <div className="lg:col-span-4 lg:self-end">
        <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
          {lede}
        </p>
        {meta ? (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/80">
            {meta}
          </p>
        ) : null}
      </div>
    </header>
  );
}

/** 04 — intent paths: different ways of meaning the same search. */
export function IntentPaths({
  title,
  paths,
  onNavigate,
}: {
  title?: string;
  paths: readonly IntentPath[];
  onNavigate?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('landing.explore', 'Explore');

  return (
    <section className="border-b border-border/50 py-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {resolvedTitle}
      </h2>
      <ul className="mt-4">
        {paths.map((path, index) => (
          <li key={path.label}>
            <button
              type="button"
              onClick={() => {
                onNavigate?.(path.query);
                navigate(searchHref(path.query));
              }}
              className="group grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b border-border/40 py-4 text-left outline-none transition-[border-color,transform] duration-200 first:border-t hover:border-foreground/40 focus-visible:border-foreground/60 motion-safe:hover:translate-x-[3px] motion-safe:focus-visible:translate-x-[3px]"
            >
              <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground">
                {pad(index + 1)}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold uppercase tracking-tight text-foreground/85 transition-colors group-hover:text-foreground group-focus-visible:text-foreground">
                  {path.label}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground transition-colors group-hover:text-foreground/80 group-focus-visible:text-foreground/80">
                  {path.description}
                </span>
                <span className="mt-2 block break-words font-mono text-xs text-foreground/75 underline decoration-border underline-offset-[6px] transition-colors group-hover:text-foreground group-hover:decoration-foreground group-focus-visible:text-foreground group-focus-visible:decoration-foreground">
                  "{path.query}"
                </span>
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/50 transition-colors group-hover:text-foreground group-focus-visible:text-foreground">
                {t('landing.searchThis', 'Search this')}{' '}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1"
                >
                  →
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 05b — technical summary line between the intent explorer and results. */
export function TechnicalSummary({ parts }: { parts: readonly string[] }) {
  if (parts.length === 0) return null;

  return (
    <p className="border-b border-border/50 py-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 ? <span className="mx-2 text-border">/</span> : null}
          <span className={index === 0 ? 'text-foreground' : undefined}>
            {part}
          </span>
        </span>
      ))}
    </p>
  );
}

/** 06 — editorial explanation. */
export function EditorialExplanation({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <section className="grid gap-6 border-b border-border/50 py-10 lg:grid-cols-12">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground lg:col-span-4">
        {title}
      </h2>
      <div className="max-w-2xl space-y-4 lg:col-span-8">
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 32)}
            className="text-base leading-relaxed text-foreground/85"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

/** 07 — related searches as flat mono links. */
export function RelatedSearches({ queries }: { queries: readonly string[] }) {
  const { t } = useTranslation();
  return (
    <section className="border-b border-border/50 py-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {t('landing.moreLikeThis', 'More like this →')}
      </h2>
      <ul className="mt-4 space-y-2">
        {queries.map((query) => (
          <li key={query}>
            <Link
              to={searchHref(query)}
              className="break-words font-mono text-sm text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground"
            >
              "{query}"
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 07 — adjacent concepts. Each row is a neighbouring problem with its own
 * natural-language query; the row leads into an intentional landing page when
 * one exists, otherwise straight into the search.
 */
export function AdjacentConcepts({
  concepts,
}: {
  concepts: readonly AdjacentConcept[];
}) {
  const { t } = useTranslation();
  if (concepts.length === 0) return null;

  return (
    <section className="border-b border-border/50 py-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {t('landing.moreLikeThis', 'More like this →')}
      </h2>
      <ul className="mt-4">
        {concepts.map((concept, index) => (
          <li key={concept.label}>
            <Link
              to={concept.href ?? searchHref(concept.query)}
              className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b border-border/40 py-4 outline-none transition-[border-color,transform] duration-200 first:border-t hover:border-foreground/40 focus-visible:border-foreground/60 motion-safe:hover:translate-x-[3px] motion-safe:focus-visible:translate-x-[3px]"
            >
              <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground transition-colors group-hover:text-foreground">
                {pad(index + 1)}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold uppercase tracking-tight text-foreground/85 transition-colors group-hover:text-foreground">
                  {concept.label}
                </span>
                <span className="mt-2 block break-words font-mono text-xs text-foreground/70 underline decoration-border underline-offset-[6px] transition-colors group-hover:text-foreground group-hover:decoration-foreground">
                  "{concept.query}"
                </span>
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/50 transition-colors group-hover:text-foreground">
                {concept.href
                  ? t('landing.openIndex', 'Open index')
                  : t('landing.searchThis', 'Search this')}{' '}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform motion-safe:group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 08 — related index pages. */
export function RelatedIndexPages({
  pages,
}: {
  pages: readonly RelatedPageLink[];
}) {
  const { t } = useTranslation();
  return (
    <section className="border-b border-border/50 py-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {t('landing.relatedIndex', 'Related index')}
      </h2>
      <ul className="mt-4">
        {pages.map((page) => (
          <li key={page.href}>
            <Link
              to={page.href}
              className="group flex items-baseline justify-between gap-6 border-b border-border/40 py-3 first:border-t"
            >
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold uppercase tracking-tight text-foreground">
                  {page.label}
                </span>
                {page.note ? (
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {page.note}
                  </span>
                ) : null}
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
    </section>
  );
}
