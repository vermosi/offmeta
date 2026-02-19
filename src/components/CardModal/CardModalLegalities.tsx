/**
 * Format legalities display component for CardModal.
 * Shows which formats the card is legal/banned/restricted in.
 * @module components/CardModal/CardModalLegalities
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/core/utils';
import { formatFormatName, type CardModalLegalitiesProps } from './types';
import { useTranslation } from '@/lib/i18n';

function localizeStatus(status: string, t: (key: string, fallback?: string) => string): string {
  switch (status) {
    case 'legal': return t('card.statusLegal', 'legal');
    case 'not_legal': return t('card.statusNotLegal', 'not legal');
    case 'banned': return t('card.statusBanned', 'banned');
    case 'restricted': return t('card.statusRestricted', 'restricted');
    default: return status.replace('_', ' ');
  }
}

export function CardModalLegalities({
  legalities,
  isMobile = false,
}: CardModalLegalitiesProps) {
  const { t } = useTranslation();
  const legalFormats = Object.entries(legalities).filter(
    ([, status]) => status === 'legal',
  );

  if (isMobile) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('card.legalIn', 'Legal In')}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {legalFormats.map(([format]) => (
            <Badge
              key={format}
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
            >
              {formatFormatName(format)}
            </Badge>
          ))}
          {legalFormats.length === 0 && (
            <span className="text-xs text-muted-foreground">
              {t('card.notLegalInAny', 'Not legal in any format')}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout - shows all formats with status
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {t('card.formatLegality', 'Format Legality')}
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {Object.entries(legalities).map(([format, status]) => (
          <div
            key={format}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/30"
          >
            <span className="text-xs text-foreground">
              {formatFormatName(format)}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] capitalize h-5',
                status === 'legal' &&
                  'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
                status === 'not_legal' &&
                  'bg-muted text-muted-foreground border-border',
                status === 'banned' &&
                  'bg-red-500/10 text-red-500 border-red-500/30',
                status === 'restricted' &&
                  'bg-amber-500/10 text-amber-500 border-amber-500/30',
              )}
            >
              {localizeStatus(status, t)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
