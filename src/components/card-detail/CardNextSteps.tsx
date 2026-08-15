/**
 * Card page "next steps" rail.
 *
 * Gives every card page three concrete ways to keep searching: cheaper
 * alternatives, cards that get played alongside it (card_cooccurrence), and
 * the role searches that surface it (card_ontology). Every item is a real
 * query link, and every click reports a `card_page_exit_action` event so we
 * can tell whether the rail actually moves people onward.
 *
 * @module components/card-detail/CardNextSteps
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Coins, Users, Compass } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getRelatedCards } from '@/services/discovery';
import { cardNameToSlug } from '@/lib/card-slug';
import { logger } from '@/lib/core/logger';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';

interface CardNextStepsProps {
  card: ScryfallCard;
}

type ExitGroup = 'cheaper' | 'plays_with' | 'role_search';

const MAX_PLAYS_WITH = 6;
const MAX_ROLE_SEARCHES = 5;

interface OntologyRow {
  oracle_id: string;
  label: string | null;
  dimension: string | null;
  priority: number | null;
}

async function fetchRoleLabels(oracleId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_card_ontology', {
    p_oracle_ids: [oracleId],
  });
  if (error) {
    logger.warn('[card-next-steps] ontology lookup failed', error.message);
    return [];
  }
  const rows = (data ?? []) as OntologyRow[];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const row of rows) {
    const label = row.label?.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length >= MAX_ROLE_SEARCHES) break;
  }
  return labels;
}

function searchHref(query: string): string {
  return `/?q=${encodeURIComponent(query)}`;
}

export function CardNextSteps({ card }: CardNextStepsProps) {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const oracleId = card.oracle_id ?? '';

  const { data: related = [] } = useQuery({
    queryKey: ['card-next-steps', 'plays-with', oracleId],
    queryFn: () => getRelatedCards(oracleId, { limit: MAX_PLAYS_WITH }),
    enabled: Boolean(oracleId),
    staleTime: 30 * 60 * 1000,
  });

  const { data: roleLabels = [] } = useQuery({
    queryKey: ['card-next-steps', 'roles', oracleId],
    queryFn: () => fetchRoleLabels(oracleId),
    enabled: Boolean(oracleId),
    staleTime: 30 * 60 * 1000,
  });

  const cheaperQueries = useMemo(
    () => [
      t('card.nextSteps.cheaperAlternatives', 'budget alternatives to {name}', {
        name: card.name,
      }),
      t('card.nextSteps.cheaperUnderFive', 'cards like {name} under $5', {
        name: card.name,
      }),
    ],
    [card.name, t],
  );

  const playsWith = useMemo(
    () =>
      related
        .filter((rel) => rel.cardName && rel.oracleId !== oracleId)
        .slice(0, MAX_PLAYS_WITH),
    [related, oracleId],
  );

  const handleExit = (group: ExitGroup, target: string) => {
    trackEvent('card_page_exit_action', {
      card_name: card.name,
      group,
      target,
    });
  };

  const hasAnything =
    cheaperQueries.length > 0 || playsWith.length > 0 || roleLabels.length > 0;
  if (!hasAnything) return null;

  const linkClass =
    'inline-flex min-h-9 items-center rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent';

  return (
    <section
      aria-label={t('card.nextSteps.ariaLabel', 'Next steps')}
      className="grid gap-4 md:grid-cols-3"
    >
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Coins className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {t('card.nextSteps.cheaperTitle', 'Cheaper alternatives')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {cheaperQueries.map((query) => (
            <Link
              key={query}
              to={searchHref(query)}
              className={linkClass}
              onClick={() => handleExit('cheaper', query)}
            >
              {query}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {t('card.nextSteps.playsWithTitle', 'Plays well with')}
        </h2>
        {playsWith.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {playsWith.map((rel) => (
              <Link
                key={rel.oracleId}
                to={`/cards/${cardNameToSlug(rel.cardName)}`}
                className={linkClass}
                onClick={() => handleExit('plays_with', rel.cardName)}
              >
                {rel.cardName}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t(
              'card.nextSteps.playsWithEmpty',
              'No co-play data for this card yet.',
            )}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Compass className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {t('card.nextSteps.rolesTitle', 'Searches that surface it')}
        </h2>
        {roleLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {roleLabels.map((label) => (
              <Link
                key={label}
                to={searchHref(label)}
                className={linkClass}
                onClick={() => handleExit('role_search', label)}
              >
                {label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t(
              'card.nextSteps.rolesEmpty',
              'This card has no role tags yet.',
            )}
          </p>
        )}
      </div>
    </section>
  );
}
