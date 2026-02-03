/**
 * Printings list component for CardModal.
 * Displays all printings of a card with prices.
 * @module components/CardModal/CardModalPrintings
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CardModalPrintingsProps } from './types';

export function CardModalPrintings({
  printings,
  isLoading,
  selectedPrintingId,
  cardId,
  onSelectPrinting,
  isMobile = false,
}: CardModalPrintingsProps) {
  const maxItems = isMobile ? 8 : 15;

  if (isMobile) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Printings ({printings.length})
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {printings.slice(0, maxItems).map((printing) => (
              <button
                key={printing.id}
                onClick={() => onSelectPrinting(printing)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-muted/50 text-sm transition-colors',
                  (selectedPrintingId === printing.id ||
                    (!selectedPrintingId && cardId === printing.id)) &&
                    'bg-primary/10 ring-1 ring-primary/30',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full flex-shrink-0',
                      printing.rarity === 'mythic' && 'bg-orange-500',
                      printing.rarity === 'rare' && 'bg-amber-500',
                      printing.rarity === 'uncommon' && 'bg-slate-400',
                      printing.rarity === 'common' && 'bg-slate-600',
                    )}
                  />
                  <span className="truncate text-foreground text-xs">
                    {printing.set_name}
                  </span>
                </div>
                <span className="text-xs font-medium text-emerald-500">
                  {printing.prices.usd
                    ? `$${printing.prices.usd}`
                    : printing.prices.eur
                      ? `€${printing.prices.eur}`
                      : '—'}
                </span>
              </button>
            ))}
            {printings.length > maxItems && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{printings.length - maxItems} more
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop layout with full price columns
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Printings ({printings.length})
      </h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : printings.length === 0 ? (
        <p className="text-muted-foreground text-center py-4 text-sm">
          No printings found
        </p>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_40px_40px_40px_40px_35px] gap-1 px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
            <span>Set</span>
            <span className="text-right">USD</span>
            <span className="text-right">Foil</span>
            <span className="text-right">EUR</span>
            <span className="text-right">Foil</span>
            <span className="text-right">Tix</span>
          </div>

          {printings.slice(0, maxItems).map((printing) => (
            <button
              key={printing.id}
              onClick={() => onSelectPrinting(printing)}
              className={cn(
                'grid grid-cols-[1fr_40px_40px_40px_40px_35px] gap-1 px-2 py-2 rounded-lg hover:bg-muted/50 text-sm items-center w-full text-left transition-colors',
                (selectedPrintingId === printing.id ||
                  (!selectedPrintingId && cardId === printing.id)) &&
                  'bg-primary/10 ring-1 ring-primary/30',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full flex-shrink-0',
                    printing.rarity === 'mythic' && 'bg-orange-500',
                    printing.rarity === 'rare' && 'bg-amber-500',
                    printing.rarity === 'uncommon' && 'bg-slate-400',
                    printing.rarity === 'common' && 'bg-slate-600',
                  )}
                />
                <span className="truncate text-foreground text-xs">
                  {printing.set_name}
                  <span className="text-muted-foreground ml-1">
                    #{printing.collector_number}
                  </span>
                </span>
              </div>
              <span className="text-right font-medium text-emerald-500 text-xs">
                {printing.prices.usd ? `$${printing.prices.usd}` : '—'}
              </span>
              <span className="text-right font-medium text-purple-500 text-xs">
                {printing.prices.usd_foil
                  ? `$${printing.prices.usd_foil}`
                  : '—'}
              </span>
              <span className="text-right font-medium text-blue-500 text-xs">
                {printing.prices.eur ? `€${printing.prices.eur}` : '—'}
              </span>
              <span className="text-right font-medium text-indigo-400 text-xs">
                {printing.prices.eur_foil
                  ? `€${printing.prices.eur_foil}`
                  : '—'}
              </span>
              <span className="text-right font-medium text-amber-500 text-xs">
                {printing.prices.tix ? printing.prices.tix : '—'}
              </span>
            </button>
          ))}

          {printings.length > maxItems && (
            <p className="text-xs text-muted-foreground text-center py-2">
              +{printings.length - maxItems} more printings
            </p>
          )}
        </div>
      )}
    </div>
  );
}
