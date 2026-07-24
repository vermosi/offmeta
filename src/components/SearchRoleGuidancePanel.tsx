/**
 * Aggregated role guidance for the current result set.
 * Uses deterministic oracle-text role extraction to summarize what the current
 * cards are good at, then offers one-click refinements for the dominant roles.
 */

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { extractRoles } from '@/lib/search/card-roles';
import type { ScryfallCard } from '@/types/card';

const ROLE_LABELS: Record<string, string> = {
  removal: 'Removal',
  board_wipe: 'Board wipes',
  counterspell: 'Countermagic',
  draw: 'Card draw',
  ramp: 'Ramp',
  tutor: 'Tutors',
  recursion: 'Recursion',
  sacrifice_outlet: 'Sac outlets',
  token_generator: 'Token makers',
  lifegain: 'Lifegain',
  protection: 'Protection',
  discard: 'Discard',
  mill: 'Mill',
  blink: 'Blink',
  pump: 'Pump',
  cost_reduction: 'Cost reduction',
  copy: 'Copy effects',
  land_destruction: 'Land destruction',
  equipment: 'Equipment',
  evasion: 'Evasion',
};

const ROLE_TOKENS: Record<string, string> = {
  removal: 'otag:removal',
  board_wipe: 'otag:boardwipe',
  counterspell: 'otag:counter',
  draw: 'otag:draw',
  ramp: 'otag:ramp',
  tutor: 'otag:tutor',
  recursion: 'otag:recursion',
  sacrifice_outlet: 'otag:sacrifice-outlet',
  token_generator: 'otag:token-generator',
  lifegain: 'otag:lifegain',
  protection: 'otag:protection',
  discard: 'otag:discard',
  mill: 'otag:mill',
  blink: 'otag:blink',
  pump: 'otag:pump',
  cost_reduction: 'otag:cost-reduction',
  copy: 'otag:copy',
  land_destruction: 'otag:land-destruction',
  equipment: 'otag:equipment',
  evasion: 'otag:evasion',
};

interface SearchRoleGuidancePanelProps {
  cards: ScryfallCard[];
  searchQuery: string;
  onRefine: (query: string) => void;
  maxChips?: number;
}

interface RoleFacet {
  key: string;
  label: string;
  token: string;
  count: number;
}

function hasToken(query: string, token: string): boolean {
  return query
    .toLowerCase()
    .split(/\s+/)
    .some((part) => part === token.toLowerCase());
}

function aggregateRoles(cards: ScryfallCard[]): RoleFacet[] {
  const counts = new Map<string, RoleFacet>();
  for (const card of cards.slice(0, 40)) {
    const text =
      card.oracle_text ??
      card.card_faces?.map((face) => face.oracle_text ?? '').join(' ') ??
      '';
    const roles = extractRoles(text);
    const seen = new Set<string>();
    for (const role of roles) {
      if (seen.has(role)) continue;
      seen.add(role);
      const token = ROLE_TOKENS[role];
      if (!token) continue;
      const existing = counts.get(role);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(role, {
          key: role,
          label: ROLE_LABELS[role] ?? role.replace(/_/g, ' '),
          token,
          count: 1,
        });
      }
    }
  }

  return Array.from(counts.values())
    .filter((role) => role.count >= 2)
    .sort((a, b) => b.count - a.count);
}

export function SearchRoleGuidancePanel({
  cards,
  searchQuery,
  onRefine,
  maxChips = 5,
}: SearchRoleGuidancePanelProps) {
  const { t } = useTranslation();

  const roles = useMemo(() => {
    return aggregateRoles(cards)
      .filter((role) => !hasToken(searchQuery, role.token))
      .slice(0, maxChips);
  }, [cards, searchQuery, maxChips]);

  const summary = useMemo(() => {
    if (roles.length === 0) return null;
    const labels = roles.slice(0, 2).map((role) => role.label.toLowerCase());
    if (labels.length === 1) {
      return t('results.roleSummarySingle', 'Mostly {label} cards').replace(
        '{label}',
        labels[0],
      );
    }
    return t('results.roleSummaryMulti', 'Mostly {first} and {second} cards')
      .replace('{first}', labels[0])
      .replace('{second}', labels[1]);
  }, [roles, t]);

  if (roles.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          {t('results.roleGuidance', 'This result set leans toward')}
        </h3>
      </div>
      {summary && <p className="mb-3 text-sm text-foreground/80">{summary}</p>}
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <Button
            key={role.key}
            type="button"
            size="sm"
            variant="outline"
            className="h-8 min-h-[36px] rounded-full px-3 text-xs"
            onClick={() => onRefine(role.token)}
            title={role.token}
          >
            <span>{role.label}</span>
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {role.count}
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
