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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Loader2, Sparkles, X } from 'lucide-react';
import { buildClientFallbackQuery } from '@/lib/search/fallback';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Translate = (k: string, f?: string) => string;

/**
 * Keyword catalogs used to explain *why* a signal chip was inferred.
 * Each entry maps a category to the natural-language triggers that produce
 * the corresponding Scryfall token, so we can surface the specific words from
 * the user's query that led to the inference.
 */
const RATIONALE_KEYWORDS: Record<string, string[]> = {
  colors: [
    'white', 'blue', 'black', 'red', 'green', 'colorless', 'multicolor', 'multicolored',
    'mono', 'wubrg', 'azorius', 'dimir', 'rakdos', 'gruul', 'selesnya', 'orzhov',
    'izzet', 'golgari', 'boros', 'simic', 'bant', 'esper', 'grixis', 'jund', 'naya',
    'mardu', 'temur', 'abzan', 'jeskai', 'sultai',
  ],
  type: [
    'creature', 'creatures', 'artifact', 'artifacts', 'enchantment', 'enchantments',
    'instant', 'instants', 'sorcery', 'sorceries', 'planeswalker', 'planeswalkers',
    'land', 'lands', 'battle', 'battles', 'tribal', 'legendary', 'token', 'tokens',
    'dragon', 'goblin', 'elf', 'zombie', 'angel', 'demon', 'wizard', 'knight',
    'saga', 'equipment', 'aura', 'vehicle',
  ],
  manaValue: [
    'mana value', 'cmc', 'converted mana cost', 'cheap', 'expensive', 'costs',
    'one mana', 'two mana', 'three mana', 'four mana', 'five mana', 'six mana',
    'low cost', 'high cost', 'mv', 'free',
  ],
  power: ['power', 'attack', 'strong', 'big creature', 'beefy'],
  toughness: ['toughness', 'defensive', 'wall'],
  price: [
    'budget', 'cheap', 'affordable', 'under $', 'under 5', 'expensive',
    'dollar', 'dollars', 'usd', 'eur', 'price', 'cost',
  ],
  rarity: ['common', 'uncommon', 'rare', 'mythic', 'rarity'],
  format: [
    'commander', 'edh', 'standard', 'modern', 'legacy', 'vintage', 'pioneer',
    'pauper', 'brawl', 'historic', 'penny', 'oathbreaker', 'legal',
  ],
  property: [
    'foil', 'promo', 'reprint', 'reserved', 'digital', 'paper', 'first printing',
    'nonfoil', 'unique', 'oldschool',
  ],
  oracle: [
    'draw', 'discard', 'sacrifice', 'destroy', 'exile', 'counter', 'ramp',
    'treasure', 'token', 'lifelink', 'flying', 'trample', 'haste', 'vigilance',
    'first strike', 'double strike', 'menace', 'reach', 'deathtouch', 'hexproof',
    'ward', 'flash', 'defender', 'indestructible', 'protection', 'etb',
    'enters the battlefield', 'dies', 'attack', 'blocks', 'tutor', 'search your library',
    'gain life', 'lose life', 'mill', 'proliferate', 'scry',
  ],
  card: ['named', 'card named', 'the card'],
};

/**
 * Human-readable summary of what each Scryfall category means, shown in the
 * tooltip alongside the specific keywords detected in the user's query.
 */
function categoryDescription(key: string, t: Translate): string {
  switch (key) {
    case 'colors':
      return t('understood.rationale.colors', 'Colors or color identity that cards must match.');
    case 'type':
      return t('understood.rationale.type', 'Card type line filter (creature, artifact, etc.).');
    case 'manaValue':
      return t('understood.rationale.manaValue', 'Converted mana cost / mana value constraint.');
    case 'power':
      return t('understood.rationale.power', 'Creature power constraint.');
    case 'toughness':
      return t('understood.rationale.toughness', 'Creature toughness constraint.');
    case 'price':
      return t('understood.rationale.price', 'Price ceiling or budget constraint.');
    case 'rarity':
      return t('understood.rationale.rarity', 'Card rarity constraint.');
    case 'format':
      return t('understood.rationale.format', 'Format legality filter.');
    case 'property':
      return t('understood.rationale.property', 'Card property flag (foil, promo, reprint, etc.).');
    case 'oracle':
      return t('understood.rationale.oracle', 'Oracle-text keyword or ability the card must mention.');
    case 'card':
      return t('understood.rationale.card', 'Exact card name lookup.');
    default:
      return t('understood.rationale.filter', 'General Scryfall filter derived from your wording.');
  }
}

/** Map a token to its rationale category key (matches RATIONALE_KEYWORDS). */
function tokenCategory(token: string): string {
  const lower = token.toLowerCase();
  if (lower.startsWith('c:') || lower.startsWith('c=') || lower.startsWith('ci:') || lower.startsWith('ci=')) return 'colors';
  if (lower.startsWith('t:') || lower.startsWith('-t:')) return 'type';
  if (lower.startsWith('mv') || lower.startsWith('cmc')) return 'manaValue';
  if (lower.startsWith('pow')) return 'power';
  if (lower.startsWith('tou')) return 'toughness';
  if (lower.startsWith('usd') || lower.startsWith('eur') || lower.startsWith('tix')) return 'price';
  if (lower.startsWith('r:') || lower.startsWith('rarity')) return 'rarity';
  if (lower.startsWith('f:') || lower.startsWith('format')) return 'format';
  if (lower.startsWith('is:') || lower.startsWith('not:')) return 'property';
  if (lower.startsWith('o:') || lower.startsWith('-o:') || lower.startsWith('otag:') || lower.startsWith('oracle')) return 'oracle';
  if (lower.startsWith('!"')) return 'card';
  return 'filter';
}

/**
 * Find which words from the original query most likely triggered this token,
 * plus the literal value the token filters on (e.g. `treasure` for `o:treasure`).
 */
function extractRationale(token: string, originalQuery: string): {
  category: string;
  triggers: string[];
  value: string | null;
} {
  const category = tokenCategory(token);
  const lowerQuery = ` ${originalQuery.toLowerCase()} `;
  const triggers = new Set<string>();

  // Match category-wide keywords.
  const keywordPool = RATIONALE_KEYWORDS[category] ?? [];
  for (const kw of keywordPool) {
    if (lowerQuery.includes(` ${kw} `) || lowerQuery.includes(` ${kw},`) || lowerQuery.includes(` ${kw}.`)) {
      triggers.add(kw);
    }
  }

  // Extract the literal value inside the token so users understand *what* it filters on.
  const valueMatch = token.match(/[:=<>!](.+)$/);
  const rawValue = valueMatch ? valueMatch[1].replace(/^"|"$/g, '') : null;

  // If the literal token value itself appears in the query, surface it too.
  if (rawValue && rawValue.length > 1 && lowerQuery.includes(rawValue.toLowerCase())) {
    triggers.add(rawValue.toLowerCase());
  }

  return {
    category,
    triggers: Array.from(triggers).slice(0, 4),
    value: rawValue,
  };
}


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
  const { trackEvent } = useAnalytics();

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
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const expandedChipsRef = useRef<Set<string>>(new Set());

  // Reset exclusions whenever the underlying query changes (new search).
  useEffect(() => {
    setExcluded(new Set());
    setCopied(false);
    expandedChipsRef.current = new Set();
  }, [originalQuery]);

  // Fire a one-time "view" event per unique query so we can measure how often
  // the summary is actually surfaced to users.
  const viewedQueryRef = useRef<string | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!originalQuery.trim()) return;
    const node = sectionRef.current;
    if (!node) return;
    if (viewedQueryRef.current === originalQuery) return;
    if (typeof IntersectionObserver === 'undefined') {
      viewedQueryRef.current = originalQuery;
      trackEvent('understood_summary_view', {
        query: originalQuery,
        signal_count: signals.length,
        preview,
      });
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && viewedQueryRef.current !== originalQuery) {
            viewedQueryRef.current = originalQuery;
            trackEvent('understood_summary_view', {
              query: originalQuery,
              signal_count: signals.length,
              preview,
            });
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [originalQuery, signals.length, preview, trackEvent]);

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
      const wasExcluded = next.has(token);
      if (wasExcluded) next.delete(token);
      else next.add(token);
      trackEvent('understood_summary_changed', {
        query: originalQuery,
        token,
        action: wasExcluded ? 'restore' : 'remove',
        excluded_count: next.size,
        signal_count: signals.length,
      });
      return next;
    });
  };

  const applyAdjustment = () => {
    if (!interactive || !refinedQuery || refinedQuery === preview) return;
    trackEvent('understood_summary_accepted', {
      query: originalQuery,
      original_preview: preview,
      refined_query: refinedQuery,
      excluded_count: excluded.size,
      signal_count: signals.length,
    });
    onAdjust?.(refinedQuery);
  };

  if (!originalQuery.trim()) return null;

  const hasChanges = excluded.size > 0 && refinedQuery.length > 0;

  return (
    <section
      ref={sectionRef}
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
              const rationale = extractRationale(sig.token, originalQuery);
              const description = categoryDescription(rationale.category, t);
              const triggersLine =
                rationale.triggers.length > 0
                  ? t('understood.rationale.matched', 'Matched from: {words}').replace(
                      '{words}',
                      rationale.triggers.map((w) => `"${w}"`).join(', '),
                    )
                  : t(
                      'understood.rationale.default',
                      'Inferred from the overall wording of your query.',
                    );
              const trigger = interactive ? (
                <button
                  type="button"
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
                  tabIndex={0}
                  className={`${base} ${state} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background`}
                >
                  <span className="text-muted-foreground">{sig.label}</span>
                  <span className="font-mono text-foreground">{sig.token}</span>
                </span>
              );
              return (
                <Tooltip
                  key={`${sig.label}-${sig.token}-${i}`}
                  delayDuration={150}
                  onOpenChange={(open) => {
                    if (!open) return;
                    const key = `${originalQuery}::${sig.token}`;
                    if (expandedChipsRef.current.has(key)) return;
                    expandedChipsRef.current.add(key);
                    trackEvent('understood_summary_chip_expanded', {
                      query: originalQuery,
                      token: sig.token,
                      label: sig.label,
                      category: rationale.category,
                      trigger_count: rationale.triggers.length,
                    });
                  }}
                >

                  <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                    <p className="font-medium mb-1">
                      {sig.label}
                      <span className="font-mono ml-1 text-muted-foreground">{sig.token}</span>
                    </p>
                    <p className="text-muted-foreground mb-1">{description}</p>
                    <p className="text-muted-foreground">{triggersLine}</p>
                  </TooltipContent>
                </Tooltip>
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

      {preview && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            aria-expanded={showRaw}
            aria-controls="understood-raw-interpretation"
            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground min-h-9"
          >
            {showRaw
              ? t('understood.hideRaw', 'Hide raw interpretation')
              : t('understood.showRaw', 'Show raw interpretation')}
          </button>

          {showRaw && (
            <div
              id="understood-raw-interpretation"
              className="mt-2 space-y-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
            >
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  {t('understood.rawSignals', 'Parsed signals')}
                </p>
                <pre className="font-mono text-[11px] text-foreground whitespace-pre-wrap break-words">
{JSON.stringify(
  signals.map((s) => {
    const r = extractRationale(s.token, originalQuery);
    return {
      label: s.label,
      token: s.token,
      category: r.category,
      value: r.value,
      triggers: r.triggers,
      excluded: excluded.has(s.token),
    };
  }),
  null,
  2,
)}
                </pre>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  {t('understood.rawDerived', 'Final derived Scryfall query')}
                </p>
                <p className="font-mono text-[11px] text-foreground break-words">
                  {refinedQuery || preview}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
