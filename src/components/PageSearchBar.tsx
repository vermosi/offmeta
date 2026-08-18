/**
 * PageSearchBar — compact, persistent natural-language search bar
 * shown on long-tail content pages (cards, guides, combos) to convert
 * inbound SEO traffic into additional searches.
 */

import { useState, useId, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { queryToSlug } from '@/lib/search-slug';
import { useTranslation } from '@/lib/i18n';

interface PageSearchBarProps {
  /** Localized placeholder; defaults to a translated string. */
  placeholder?: string;
  /** Optional pre-filled query suggestion */
  initialValue?: string;
  className?: string;
  /** 'lg' gives the field more vertical presence on landing pages. */
  size?: 'default' | 'lg';
}

export function PageSearchBar({
  placeholder,
  initialValue = '',
  className,
  size = 'default',
}: PageSearchBarProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  const inputId = useId();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      navigate('/');
      return;
    }
    navigate(`/search/${queryToSlug(q)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={
        'flex items-center gap-3 border border-border/70 bg-background focus-within:border-foreground/60 transition-colors ' +
        (size === 'lg' ? 'px-5 py-5 sm:px-6 sm:py-6 ' : 'px-4 py-3 ') +
        (className ?? '')
      }
    >
      <Search
        className={
          (size === 'lg' ? 'h-5 w-5 ' : 'h-4 w-4 ') +
          'text-muted-foreground shrink-0'
        }
        aria-hidden="true"
      />
      <label htmlFor={inputId} className="sr-only">
        {t('pageSearch.label', 'Search Magic cards')}
      </label>
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          placeholder ??
          t('pageSearch.placeholder', 'Search Magic cards in plain English…')
        }
        className={
          'flex-1 min-w-0 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground ' +
          (size === 'lg' ? 'text-base sm:text-lg' : 'text-sm')
        }
      />
      <button
        type="submit"
        className={
          'shrink-0 inline-flex items-center gap-1 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.24em] hover:bg-foreground/90 transition-colors focus-ring ' +
          (size === 'lg' ? 'px-5 py-3' : 'px-4 py-2')
        }
      >
        {t('pageSearch.submit', 'Search')}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}
