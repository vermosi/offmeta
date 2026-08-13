/**
 * Research desk header for the search results route.
 *
 * Editorial/technical composition that answers four questions above the fold:
 *  1. What did the user ask for (intent line + H1)
 *  2. How was it interpreted (deterministic constraint readout)
 *  3. What was actually executed (Scryfall query, copyable, editable)
 *  4. What came back (result count, translation source, confidence)
 *
 * Pure presentation: all state and actions are owned by the search route.
 * @module components/SearchDeskHeader
 */

import { useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/core/utils';
import type { SearchIntent } from '@/types/search';

interface SearchDeskHeaderProps {
  /** Plain-English query typed by the user. */
  originalQuery: string;
  /** Executed Scryfall query. */
  scryfallQuery: string;
  /** Parsed intent used to build the interpretation readout. */
  intent?: SearchIntent | null;
  /** Total cards reported by Scryfall. */
  totalCards: number;
  /** Cards currently rendered after client filters. */
  shownCards: number;
  /** Human label for the translation path (deterministic, AI, cache…). */
  sourceLabel?: string;
  /** Translation confidence 0–1. */
  confidence?: number | null;
  /** Translation warnings / validation issues. */
  warnings?: string[];
  /** Editable query bar rendered inside the EDIT QUERY drawer. */
  editor?: ReactNode;
}

interface Constraint {
  kind: string;
  value: string;
}

const COLOR_NAMES: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
  C: 'colorless',
};

/** Turn the parsed intent into a readable constraint list. */
export function buildInterpretation(intent?: SearchIntent | null): Constraint[] {
  if (!intent) return [];
  const out: Constraint[] = [];

  if (intent.colors?.values?.length) {
    const names = intent.colors.values
      .map((c) => COLOR_NAMES[c.toUpperCase()] ?? c.toLowerCase())
      .join(intent.colors.isOr ? ' or ' : ' + ');
    out.push({
      kind: intent.colors.isIdentity ? 'color identity' : 'colors',
      value: intent.colors.isExact ? `exactly ${names}` : names,
    });
  }

  for (const type of intent.types ?? []) {
    out.push({ kind: 'type', value: type.toLowerCase() });
  }

  if (intent.cmc) {
    out.push({ kind: 'mana value', value: `${intent.cmc.op} ${intent.cmc.value}` });
  }
  if (intent.power) {
    out.push({ kind: 'power', value: `${intent.power.op} ${intent.power.value}` });
  }
  if (intent.toughness) {
    out.push({ kind: 'toughness', value: `${intent.toughness.op} ${intent.toughness.value}` });
  }

  for (const tag of intent.tags ?? []) {
    out.push({ kind: 'function tag', value: tag.replace(/^otag:/, '').replace(/-/g, ' ') });
  }
  for (const phrase of intent.oraclePatterns ?? []) {
    out.push({ kind: 'oracle text', value: `“${phrase}”` });
  }

  return out.slice(0, 12);
}

export function SearchDeskHeader({
  originalQuery,
  scryfallQuery,
  intent,
  totalCards,
  shownCards,
  sourceLabel,
  confidence,
  warnings,
  editor,
}: SearchDeskHeaderProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  const constraints = buildInterpretation(intent);
  const query = scryfallQuery.trim();
  const activeWarnings = (warnings ?? []).filter(Boolean);

  const handleCopy = async () => {
    if (!query) return;
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      aria-labelledby="search-desk-heading"
      className="animate-reveal border-y border-border/50"
    >
      <div className="grid gap-x-10 gap-y-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:py-8">
        {/* Left — the ask */}
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            OFFMETA / SEARCH
          </p>
          <h1
            id="search-desk-heading"
            className="mt-3 font-display text-2xl font-extrabold uppercase leading-[1.05] tracking-tight text-foreground sm:text-3xl lg:text-4xl"
          >
            {originalQuery || query}
          </h1>

          {constraints.length > 0 && (
            <>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                {t('search.desk.interpreted', 'Interpreted as')}
              </p>
              <dl className="mt-2 divide-y divide-border/40 border-t border-border/40">
                {constraints.map((c, i) => (
                  <div
                    key={`${c.kind}-${c.value}-${i}`}
                    className="flex items-baseline gap-4 py-1.5"
                  >
                    <dt className="w-32 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {c.kind}
                    </dt>
                    <dd className="min-w-0 flex-1 text-sm text-foreground">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {activeWarnings.length > 0 && (
            <ul className="mt-4 space-y-1">
              {activeWarnings.map((w) => (
                <li
                  key={w}
                  className="border-l-2 border-destructive/50 pl-3 font-mono text-[11px] text-muted-foreground"
                >
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right — the execution record */}
        <div className="min-w-0 lg:border-l lg:border-border/40 lg:pl-10">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              {t('search.desk.executed', 'Executed query')}
            </p>
            {sourceLabel && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {sourceLabel}
                {typeof confidence === 'number'
                  ? ` / ${Math.round(confidence * 100)}%`
                  : ''}
              </p>
            )}
          </div>

          <code className="mt-2 block max-h-40 overflow-auto border-y border-border/40 bg-foreground/[0.03] px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground">
            {query || '—'}
          </code>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground focus-ring"
            >
              {copied ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              {copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
            </button>

            {editor && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                aria-expanded={editing}
                aria-controls="search-desk-editor"
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.24em] transition-colors focus-ring',
                  editing ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t('search.desk.editQuery', 'Edit query')}
              </button>
            )}

            {query && (
              <a
                href={`https://scryfall.com/search?q=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground focus-ring"
              >
                Scryfall
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>

          {editing && editor && (
            <div id="search-desk-editor" className="mt-3 border-t border-border/40 pt-3">
              {editor}
            </div>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border/40 pt-4">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {t('search.desk.matches', 'Matches')}
              </dt>
              <dd className="mt-0.5 font-display text-xl font-extrabold tabular-nums text-foreground">
                {totalCards.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {t('search.desk.shown', 'Shown')}
              </dt>
              <dd className="mt-0.5 font-display text-xl font-extrabold tabular-nums text-foreground">
                {shownCards.toLocaleString()}
              </dd>
            </div>
          </dl>

          <a
            href="#search-results"
            className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground focus-ring"
          >
            {t('search.desk.jump', 'Jump to results')} →
          </a>
        </div>
      </div>
    </section>
  );
}
