/**
 * Explanation panel — enhanced card explanation using shared meta context.
 * Shows a simplified "Explain This Card" when a specific card is detected.
 * @module components/ExplanationPanel
 */

import type { ScryfallCard } from '@/types/card';
import { BookOpen } from 'lucide-react';
import { ManaSymbol } from '@/components/ManaSymbol';
import { formatManaSymbols } from '@/lib/scryfall/client';
import { useTranslation } from '@/lib/i18n';
import { CardExplainabilitySummary } from '@/components/CardExplainabilitySummary';

interface ExplanationPanelProps {
  card: ScryfallCard | null | undefined;
  isLoading?: boolean;
}

export function ExplanationPanel({ card, isLoading: externalLoading }: ExplanationPanelProps) {
  const { t } = useTranslation();

  if (externalLoading || !card) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {t('explanation.searchPrompt')}
        </p>
      </div>
    );
  }

  const manaSymbols = formatManaSymbols(card.mana_cost || '');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5" />
        <span>{t('explanation.whyPlayed')}</span>
      </div>
      {/* Card header */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">{card.name}</h3>
            <p className="text-sm text-muted-foreground">{card.type_line}</p>
          </div>
          {manaSymbols.length > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {manaSymbols.map((symbol, i) => (
                <ManaSymbol key={i} symbol={symbol} size="md" />
              ))}
            </div>
          )}
        </div>

      {card.oracle_text && (
        <p className="text-sm leading-relaxed text-foreground/80 mt-3 whitespace-pre-line">
          {card.oracle_text}
        </p>
      )}
    </div>
      <CardExplainabilitySummary card={card} title={t('explanation.whyPlayed')} />
    </div>
  );
}
