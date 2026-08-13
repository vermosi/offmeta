/**
 * Deterministic readout of a parsed search intent as human constraints.
 * Extracted from SearchDeskHeader so the component file only exports components.
 * @module lib/search/interpretation
 */

import type { SearchIntent } from '@/types/search';

export interface Constraint {
  kind: string;
  value: string;
}

const COLOR_NAMES: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
  C: 'colorless',
};

/** Turn the parsed intent into a readable constraint list. */
export function buildInterpretation(intent?: SearchIntent | null): Constraint[] {
  if (!intent) return [];
  const out: Constraint[] = [];

  if (intent.colors?.values?.length) {
    const names = intent.colors.values
      .map((c) => COLOR_NAMES[c.toUpperCase()] ?? c.toLowerCase())
      .join(intent.colors.isOr ? ' or ' : ' + ');
    out.push({
      kind: intent.colors.isIdentity ? 'color identity' : 'colors',
      value: intent.colors.isExact ? `exactly ${names}` : names,
    });
  }

  for (const type of intent.types ?? []) {
    out.push({ kind: 'type', value: type.toLowerCase() });
  }

  if (intent.cmc) {
    out.push({ kind: 'mana value', value: `${intent.cmc.op} ${intent.cmc.value}` });
  }
  if (intent.power) {
    out.push({ kind: 'power', value: `${intent.power.op} ${intent.power.value}` });
  }
  if (intent.toughness) {
    out.push({ kind: 'toughness', value: `${intent.toughness.op} ${intent.toughness.value}` });
  }

  for (const tag of intent.tags ?? []) {
    out.push({ kind: 'function tag', value: tag.replace(/^otag:/, '').replace(/-/g, ' ') });
  }
  for (const phrase of intent.oraclePatterns ?? []) {
    const cleaned = phrase
      .replace(/^(?:o|oracle|fo):/i, '')
      .replace(/^"|"$/g, '')
      .trim();
    if (cleaned) out.push({ kind: 'oracle text', value: `“${cleaned}”` });
  }

  return out.slice(0, 12);
}
