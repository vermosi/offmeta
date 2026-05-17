/**
 * Lightweight homepage shell.
 * Keeps the first paint free of search/auth/database bundles; the full search
 * experience is imported after idle, on search-field interaction, or when the
 * user navigates to /search/:slug.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { queryToSlug } from '@/lib/search-slug';
import { useTranslation } from '@/lib/i18n';

let searchExperiencePreloaded = false;

/**
 * Lazy-load the search bundle. Only ever fired by direct user intent
 * (focus / pointerdown on the search input, or pointerenter on a nav link
 * that needs the full app). We intentionally do NOT idle-preload it: the
 * critical first-paint path stays minimal and the ~chunk-search /
 * AppRoutes bundles only download when the user signals they want them.
 */
export function preloadSearchExperience() {
  if (searchExperiencePreloaded) return;
  searchExperiencePreloaded = true;
  void import('./SearchExperience');
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 text-accent" aria-hidden="true">
      <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="currentColor" opacity="0.15" />
      <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  );
}

export default function Index() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // No idle preload: the search bundle is only fetched on direct user intent
  // (input focus/pointerdown, or hover on a CTA that needs it).

  const handleSearchIntent = useCallback(() => {
    preloadSearchExperience();
  }, []);

  const submitSearch = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        inputRef.current?.focus();
        return;
      }

      preloadSearchExperience();
      navigate(`/search/${queryToSlug(trimmed)}`);
    },
    [navigate, query],
  );

  const startSearching = useCallback(() => {
    handleSearchIntent();
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [handleSearchIntent]);

  return (
    <div className="min-h-screen min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <header className="relative z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <nav className="container-main flex h-[72px] items-center justify-between gap-4" aria-label={t('a11y.mainNavigation', 'Main navigation')}>
          <Link to="/" className="flex items-center gap-3 font-semibold text-foreground" aria-label={t('header.home', 'OffMeta home')}>
            <BrandMark />
            <span>OffMeta</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link className="transition-colors hover:text-foreground" to="/guides">{t('header.guides', 'Guides')}</Link>
            <Link className="transition-colors hover:text-foreground" to="/combos">{t('nav.combos', 'Combos')}</Link>
            <Link className="transition-colors hover:text-foreground" to="/about">{t('header.about', 'About')}</Link>
          </div>

          <button
            type="button"
            onClick={startSearching}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-border/70 px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('search.button', 'Search')}
          </button>
        </nav>
      </header>

      <main className="relative z-10" role="main">
        <section className="container-main pt-12 sm:pt-20 lg:pt-24 pb-4 text-center" aria-labelledby="hero-heading">
          <div className="flex justify-center mb-4 sm:mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent backdrop-blur-sm">
              <SparkleIcon />
              {t('hero.taglinePill', 'AI-powered MTG discovery engine')}
            </span>
          </div>

          <h1 id="hero-heading" className="mx-auto mb-3 sm:mb-5 max-w-5xl text-foreground text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.05]">
            {t('hero.title', 'Search Magic cards')}{' '}
            <span className="text-gradient-animated">{t('hero.titleAccent', 'in plain English')}</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-lg leading-relaxed text-muted-foreground">
            {t(
              'hero.subtitleCompact',
              'Describe the card you need. OffMeta translates intent into a real Scryfall search — instantly, transparently, and without the syntax.',
            )}
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={startSearching}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-accent-foreground shadow-lg shadow-accent/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('hero.ctaPrimary', 'Start searching')}
              <ArrowIcon />
            </button>

            <Link
              to="/archetypes"
              onPointerEnter={preloadSearchExperience}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border/80 bg-card/40 px-6 text-sm font-medium text-foreground backdrop-blur-md transition-all duration-200 hover:border-accent/40 hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('hero.ctaSecondary', 'Explore archetypes')}
            </Link>
          </div>
        </section>

        <section className="relative border-y border-border/50 bg-card/20 py-4 sm:py-6" aria-label={t('search.searchLabel', 'Search cards')}>
          <div className="container-main">
            <form
              onSubmit={submitSearch}
              className="mx-auto flex max-w-5xl flex-col gap-3 rounded-xl border border-border/80 bg-card/70 p-2 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center"
            >
              <label className="sr-only" htmlFor="search-input">{t('search.searchLabel', 'Search cards')}</label>
              <input
                ref={inputRef}
                id="search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={handleSearchIntent}
                onPointerDown={handleSearchIntent}
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                maxLength={500}
                placeholder={t('search.placeholder', 'cheap green ramp spells')}
                className="min-h-12 flex-1 rounded-lg border border-input bg-background/70 px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SearchIcon />
                {t('search.button', 'Search')}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span>{t('trust.free', 'Free to use')}</span>
              <span>{t('trust.scryfall', 'Powered by Scryfall')}</span>
              <span>{t('trust.noAccount', 'No account required')}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
