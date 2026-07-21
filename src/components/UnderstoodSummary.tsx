/**
 * "What OffMeta understood" — client-side preview of the structured
 * interpretation of a natural-language query, shown while a search is
 * in flight so users see how their wording is being parsed before results load.
 *
 * Signal chips are interactive: users can click any chip to exclude it from
 * the interpreted intent, then apply the adjustment to re-run the search
 * against a refined Scryfall query without waiting for the pending results.
 * @module components/UnderstoodSummary
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { buildClientFallbackQuery } from '@/lib/search/fallback';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface UnderstoodSummaryProps {
  originalQuery: string;
  /**
   * Called when the user removes one or more chips and applies the
   * adjustment. Receives the refined Scryfall query string. When omitted,
   * chips remain informational only.
   */
  onAdjust?: (refinedScryfallQuery: string) => void;
}

interface Signal {
  label: string;
  token: string;
}

/** Turn a raw Scryfall token into a human-readable signal chip. */
function tokenToSignal(token: string, t: (k: string, f?: string) => string): Signal | null {
  if (!token) return null;
  const lower = token.toLowerCase();

  if (lower.startsWith('c:') || lower.startsWith('c=') || lower.startsWith('ci:') || lower.startsWith('ci=')) {
    return { label: t('understood.colors', 'Colors'), token };
  }
  if (lower.startsWith('t:') || lower.startsWith('-t:')) {
    return { label: t('understood.type', 'Type'), token };
  }
  if (lower.startsWith('mv') || lower.startsWith('cmc')) {
    return { label: t('understood.manaValue', 'Mana value'), token };
  }
  if (lower.startsWith('pow')) {
    return { label: t('understood.power', 'Power'), token };
  }
  if (lower.startsWith('tou')) {
    return { label: t('understood.toughness', 'Toughness'), token };
  }
  if (lower.startsWith('usd') || lower.startsWith('eur') || lower.startsWith('tix')) {
    return { label: t('understood.price', 'Price'), token };
  }
  if (lower.startsWith('r:') || lower.startsWith('rarity')) {
    return { label: t('understood.rarity', 'Rarity'), token };
  }
  if (lower.startsWith('f:') || lower.startsWith('format')) {
    return { label: t('understood.format', 'Format'), token };
  }
  if (lower.startsWith('is:') || lower.startsWith('not:')) {
    return { label: t('understood.property', 'Property'), token };
  }
  if (lower.startsWith('o:') || lower.startsWith('-o:') || lower.startsWith('otag:') || lower.startsWith('oracle')) {
    return { label: t('understood.oracle', 'Oracle text'), token };
  }
  if (lower.startsWith('!"')) {
    return { label: t('understood.card', 'Card name'), token };
  }
  return { label: t('understood.filter', 'Filter'), token };
}

/**
 * Split a raw Scryfall query into balanced tokens, keeping quoted phrases together.
 */
function splitTokens(query: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of query) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (ch === ' ' && !inQuotes) {
      if (current) tokens.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

export function UnderstoodSummary({ originalQuery, onAdjust }: UnderstoodSummaryProps) {
  const { t } = useTranslation();

  const { preview, signals } = useMemo(() => {
    const preview = buildClientFallbackQuery(originalQuery).trim();
    if (!preview) return { preview: '', signals: [] as Signal[] };
    const seen = new Set<string>();
    const signals: Signal[] = [];
    for (const raw of splitTokens(preview)) {
      const sig = tokenToSignal(raw, t);
      if (!sig) continue;
      const key = `${sig.label}:${sig.token}`;
      if (seen.has(key)) continue;
      seen.add(key);
      signals.push(sig);
    }
    return { preview, signals };
  }, [originalQuery, t]);

  // Track which chips the user has excluded before results arrive.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  // Reset exclusions whenever the underlying query changes (new search).
  useEffect(() => {
    setExcluded(new Set());
  }, [originalQuery]);

  const interactive = typeof onAdjust === 'function';

  const refinedQuery = useMemo(() => {
    if (!excluded.size) return preview;
    return splitTokens(preview)
      .filter((tok) => !excluded.has(tok))
      .join(' ')
      .trim();
  }, [preview, excluded]);

  const toggleChip = (token: string) => {
    if (!interactive) return;
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  };

  const applyAdjustment = () => {
    if (!interactive || !refinedQuery || refinedQuery === preview) return;
    onAdjust?.(refinedQuery);
  };

  if (!originalQuery.trim()) return null;

  const hasChanges = excluded.size > 0 && refinedQuery.length > 0;

  return (
    <section
      className="animate-reveal rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl px-4 py-3 sm:px-5 sm:py-4 shadow-sm"
      aria-live="polite"
      aria-label={t('understood.label', 'What OffMeta understood')}
    >
      <header className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('understood.heading', 'What OffMeta understood')}
        </span>
        <Loader2
          className="h-3 w-3 text-muted-foreground animate-spin ml-auto"
          aria-hidden="true"
        />
      </header>

      <p className="text-sm text-foreground mb-3 break-words">
        <span className="text-muted-foreground">
          {t('understood.you', 'You said:')}{' '}
        </span>
        <span className="font-medium">{originalQuery}</span>
      </p>

      {signals.length > 0 ? (
        <>
          {interactive && (
            <p className="text-[11px] text-muted-foreground mb-2">
              {t(
                'understood.adjustHint',
                'Not quite right? Tap a chip to drop it, then apply to refine the search.',
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {signals.map((sig, i) => {
              const isExcluded = excluded.has(sig.token);
              const base =
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors';
              const state = isExcluded
                ? 'border-dashed border-border/60 bg-background/40 opacity-60 line-through'
                : 'border-border/60 bg-background/70 hover:bg-background';
              return interactive ? (
                <button
                  type="button"
                  key={`${sig.label}-${sig.token}-${i}`}
                  onClick={() => toggleChip(sig.token)}
                  aria-pressed={isExcluded}
                  aria-label={
                    isExcluded
                      ? t('understood.restore', 'Restore {label} {token}')
                          .replace('{label}', sig.label)
                          .replace('{token}', sig.token)
                      : t('understood.remove', 'Remove {label} {token}')
                          .replace('{label}', sig.label)
                          .replace('{token}', sig.token)
                  }
                  className={`${base} ${state} min-h-9 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background`}
                >
                  <span className="text-muted-foreground">{sig.label}</span>
                  <span className="font-mono text-foreground">{sig.token}</span>
                  <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                </button>
              ) : (
                <span
                  key={`${sig.label}-${sig.token}-${i}`}
                  className={`${base} ${state}`}
                >
                  <span className="text-muted-foreground">{sig.label}</span>
                  <span className="font-mono text-foreground">{sig.token}</span>
                </span>
              );
            })}
          </div>

          {interactive && hasChanges && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Button
                type="button"
                size="sm"
                onClick={applyAdjustment}
                className="h-8"
              >
                {t('understood.applyAdjust', 'Apply adjustments & search')}
              </Button>
              <button
                type="button"
                onClick={() => setExcluded(new Set())}
                className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {t('understood.resetAdjust', 'Reset')}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground mb-3 italic">
          {t(
            'understood.aiFallback',
            'No deterministic signals matched — asking the AI translator for a full interpretation…',
          )}
        </p>
      )}

      {preview && (
        <div className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            {hasChanges
              ? t('understood.refinedQuery', 'Refined Scryfall query')
              : t('understood.previewQuery', 'Preview Scryfall query')}
          </p>
          <p className="font-mono text-xs text-foreground break-words">
            {hasChanges ? refinedQuery : preview}
          </p>
        </div>
      )}
    </section>
  );
}
