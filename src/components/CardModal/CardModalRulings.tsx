/**
 * Rulings display component for CardModal.
 * Collapsible section showing official card rulings.
 * @module components/CardModal/CardModalRulings
 */

import { OracleText } from '@/components/ManaSymbol';
import { Gavel, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { CardModalRulingsProps } from './types';

export function CardModalRulings({
  rulings,
  isLoading,
  showRulings,
  onToggleRulings,
}: CardModalRulingsProps) {
  if (rulings.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onToggleRulings}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
      >
        <Gavel className="h-3.5 w-3.5" />
        <span>Rulings ({rulings.length})</span>
        {showRulings ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>

      {showRulings && (
        <div className="space-y-2 pt-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            rulings.map((ruling, index) => (
              <div
                key={`${ruling.published_at}-${index}`}
                className="text-sm p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1"
              >
                <div className="text-foreground leading-relaxed">
                  <OracleText text={ruling.comment} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {ruling.source} •{' '}
                  {new Date(ruling.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
