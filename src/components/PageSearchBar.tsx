/**
 * PageSearchBar — compact, persistent natural-language search bar
 * shown on long-tail content pages (cards, guides, combos) to convert
 * inbound SEO traffic into additional searches.
 */

import { useState, useId, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';

interface PageSearchBarProps {
  placeholder?: string;
  /** Optional pre-filled query suggestion */
  initialValue?: string;
  className?: string;
}

export function PageSearchBar({
  placeholder = 'Search Magic cards in plain English…',
  initialValue = '',
  className,
}: PageSearchBarProps) {
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
    navigate(`/?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={
        'flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all ' +
        (className ?? '')
      }
    >
      <Search
        className="h-4 w-4 text-muted-foreground shrink-0"
        aria-hidden="true"
      />
      <label htmlFor={inputId} className="sr-only">
        Search Magic cards
      </label>
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors focus-ring"
      >
        Search
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}
