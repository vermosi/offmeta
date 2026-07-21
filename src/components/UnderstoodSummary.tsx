/**
 * "What OffMeta understood" — client-side preview of the structured
 * interpretation of a natural-language query, shown while a search is
 * in flight so users see how their wording is being parsed before results load.
 * @module components/UnderstoodSummary
 */

import { useMemo } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { buildClientFallbackQuery } from '@/lib/search/fallback';
import { useTranslation } from '@/lib/i18n';

interface UnderstoodSummaryProps {
  originalQuery: string;
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

export function UnderstoodSummary({ originalQuery }: UnderstoodSummaryProps) {
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

  if (!originalQuery.trim()) return null;

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
        <div className="flex flex-wrap gap-1.5 mb-3">
          {signals.map((sig, i) => (
            <span
              key={`${sig.label}-${sig.token}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px]"
            >
              <span className="text-muted-foreground">{sig.label}</span>
              <span className="font-mono text-foreground">{sig.token}</span>
            </span>
          ))}
        </div>
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
            {t('understood.previewQuery', 'Preview Scryfall query')}
          </p>
          <p className="font-mono text-xs text-foreground break-words">{preview}</p>
        </div>
      )}
    </section>
  );
}
