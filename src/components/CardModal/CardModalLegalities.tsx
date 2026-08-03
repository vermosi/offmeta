/**
 * Format legalities display component for CardModal.
 * Shows which formats the card is legal, restricted, or not legal in.
 * @module components/CardModal/CardModalLegalities
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/core/utils';
import { formatFormatName, type CardModalLegalitiesProps } from './types';
import { useTranslation } from '@/lib/i18n';

type LegalityStatus = 'legal' | 'not_legal' | 'banned' | 'restricted';

function localizeStatus(
  status: LegalityStatus,
  t: (key: string, fallback?: string) => string,
): string {
  switch (status) {
    case 'legal':
      return t('card.statusLegal', 'legal');
    case 'not_legal':
      return t('card.statusNotLegal', 'not legal');
    case 'banned':
      return t('card.statusBanned', 'banned');
    case 'restricted':
      return t('card.statusRestricted', 'restricted');
  }
}


function statusBadgeClass(status: LegalityStatus): string {
  return cn(
    'text-[10px] capitalize h-5 shrink-0 whitespace-nowrap',
    status === 'legal' && 'bg-success/10 text-success border-success/30',
    (status === 'not_legal' || status === 'banned') &&
      'bg-destructive/10 text-destructive border-destructive/30',
    status === 'restricted' && 'bg-warning/10 text-warning border-warning/30',
  );
}

function FormatGroup({
  title,
  formats,
  status,
  t,
}: {
  title: string;
  formats: [string, LegalityStatus][];
  status: LegalityStatus;
  t: (key: string, fallback?: string) => string;
}) {
  if (formats.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-1">
        {formats.map(([format, formatStatus]) => (
          <div
            key={format}
            className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/30 border border-border/30"
          >
            <span className="text-xs text-foreground truncate mr-2">
              {formatFormatName(format)}
            </span>
            <Badge variant="outline" className={statusBadgeClass(formatStatus)}>
              {localizeStatus(formatStatus, t)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardModalLegalities({
  legalities,
  isMobile = false,
}: CardModalLegalitiesProps) {
  const { t } = useTranslation();

  const entries = Object.entries(legalities) as [string, LegalityStatus][];
  const legal = entries.filter(([, status]) => status === 'legal');
  const restricted = entries.filter(([, status]) => status === 'restricted');
  const notLegal = entries.filter(
    ([, status]) => status === 'not_legal' || status === 'banned',
  );

  if (isMobile) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('card.formatLegality', 'Format Legality')}
        </h3>
        {legal.length === 0 && restricted.length === 0 && notLegal.length === 0 && (
          <span className="text-xs text-muted-foreground">
            {t('card.notLegalInAny', 'Not legal in any format')}
          </span>
        )}
        <div className="space-y-2">
          <FormatGroup
            title={t('card.legalIn', 'Legal In')}
            formats={legal}
            status="legal"
            t={t}
          />
          <FormatGroup
            title={t('card.statusRestricted', 'restricted')}
            formats={restricted}
            status="restricted"
            t={t}
          />
          <FormatGroup
            title={t('card.statusNotLegal', 'not legal')}
            formats={notLegal}
            status="not_legal"
            t={t}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {t('card.formatLegality', 'Format Legality')}
      </h3>
      <div className="space-y-2">
        <FormatGroup
          title={t('card.legalIn', 'Legal In')}
          formats={legal}
          status="legal"
          t={t}
        />
        <FormatGroup
          title={t('card.statusRestricted', 'restricted')}
          formats={restricted}
          status="restricted"
          t={t}
        />
        <FormatGroup
          title={t('card.statusNotLegal', 'not legal')}
          formats={notLegal}
          status="not_legal"
          t={t}
        />
      </div>
    </div>
  );
}

