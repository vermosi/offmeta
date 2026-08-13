/**
 * Reusable editorial primitives for the OffMeta landing page system.
 * Typography, hairlines and whitespace — no feature cards, no pills.
 */

import { Link, useNavigate } from 'react-router-dom';
import { queryToSlug } from '@/lib/search-slug';
import type { IntentPath, RelatedPageLink } from '@/lib/landing/types';

const pad = (value: number) => String(value).padStart(2, '0');

export function searchHref(query: string): string {
  return `/search/${queryToSlug(query)}`;
}

/** 01 — index / breadcrumb notation. */
export function IndexHeader({
  trail,
  crumbs,
}: {
  trail: string[];
  crumbs: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="pt-8">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <li>
          <Link to="/" className="transition-colors hover:text-foreground">
            OffMeta
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
  title = 'Explore',
  paths,
  onNavigate,
}: {
  title?: string;
  paths: readonly IntentPath[];
  onNavigate?: (query: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <section className="border-b border-border/50 py-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {title}
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
              className="group grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b border-border/40 py-4 text-left transition-colors first:border-t hover:bg-foreground/[0.03]"
            >
              <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground">
                {pad(index + 1)}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold uppercase tracking-tight text-foreground">
                  {path.label}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {path.description}
                </span>
                <span className="mt-2 block break-words font-mono text-xs text-foreground/80 underline decoration-border underline-offset-[6px] group-hover:decoration-foreground">
                  "{path.query}"
                </span>
              </span>
              <span
                aria-hidden="true"
                className="font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
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
  return (
    <section className="border-b border-border/50 py-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        More like this →
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

/** 08 — related index pages. */
export function RelatedIndexPages({
  pages,
}: {
  pages: readonly RelatedPageLink[];
}) {
  return (
    <section className="border-b border-border/50 py-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Index
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
