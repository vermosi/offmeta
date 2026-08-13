/**
 * WHY IT MATCHES — the signature explanation block.
 *
 * Renders the deterministic match report for a single card in OffMeta's
 * editorial/technical notation: mono labels, hairline rules, no scores.
 * Every line is derived from the parsed intent and the card's own text, so
 * the block states only what can be substantiated.
 *
 * @module components/WhyItMatches
 */

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WhyItMatches as WhyItMatchesReport } from '@/lib/search/whyItMatches';

interface WhyItMatchesProps {
  report: WhyItMatchesReport;
  /** Optional one-click refine using a matched concept token. */
  onRefineWithMatch?: (token: string, label: string) => void;
  /** Max concept rows rendered (default 4). */
  limit?: number;
  className?: string;
}

/** Convert a snake_case key into display words, used as an i18n fallback. */
function humanize(key: string): string {
  return key.replace(/_/g, ' ');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 border-t border-border/40 pt-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-foreground truncate">
        {value}
      </span>
    </div>
  );
}

export function WhyItMatches({
  report,
  onRefineWithMatch,
  limit = 4,
  className,
}: WhyItMatchesProps) {
  const { t } = useTranslation();

  const directnessLabel =
    report.directness === 'direct'
      ? t('whyItMatches.direct', 'Direct')
      : t('whyItMatches.structural', 'Structural');

  const heading = [report.concept, directnessLabel]
    .filter(Boolean)
    .join(' / ')
    .toUpperCase();

  const conceptReasons = report.reasons.filter((r) => r.token).slice(0, limit);

  return (
    <section
      className={cn('space-y-2', className)}
      aria-label={t('whyItMatches.title', 'Why it matches')}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
        {t('whyItMatches.title', 'Why it matches')}
      </p>

      {heading && (
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-foreground">
          {heading}
        </p>
      )}

      {report.summary && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {report.summary}
        </p>
      )}

      <div className="space-y-1.5 pt-0.5">
        {report.role && (
          <Row
            label={t('whyItMatches.role', 'Role')}
            value={t(`whyItMatches.roleValue.${report.role}`, humanize(report.role))}
          />
        )}
        {report.method && (
          <Row
            label={t('whyItMatches.method', 'Method')}
            value={t(
              `whyItMatches.methodValue.${report.method}`,
              humanize(report.method),
            )}
          />
        )}
      </div>

      {conceptReasons.length > 0 && (
        <ul className="space-y-1 border-t border-border/40 pt-2">
          {conceptReasons.map((reason, index) => {
            const canRefine = !!(onRefineWithMatch && reason.token);
            if (!canRefine) {
              return (
                <li
                  key={`${index}-${reason.label}`}
                  className="text-[11px] leading-snug text-foreground"
                >
                  {reason.label}
                </li>
              );
            }
            return (
              <li key={`${index}-${reason.label}`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    onRefineWithMatch?.(reason.token!, reason.label);
                  }}
                  className="group flex w-full min-h-9 items-start gap-2 border-l border-transparent pl-2 text-left text-[11px] leading-snug text-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:border-foreground"
                  aria-label={t(
                    'whyItMatches.refineWith',
                    'Refine search with {label}',
                  ).replace('{label}', reason.label)}
                >
                  <span
                    aria-hidden="true"
                    className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground"
                  >
                    +
                  </span>
                  <span className="flex-1">{reason.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
