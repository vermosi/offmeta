/**
 * Deterministic readout of a parsed search intent as human constraints.
 * Extracted from SearchDeskHeader so the component file only exports components.
 * @module lib/search/interpretation
 */

import type { SearchIntent } from '@/types/search';

export interface Constraint {
  kind: string;
  value: string;
  /** i18n key suffix for `kind` (e.g. `manaValue` → `search.constraint.manaValue`). */
  kindKey: string;
  /** Colour identifiers (`white`, `blue`, …) so the UI can localize the value. */
  colorKeys?: string[];
  /** Separator used between colour names. */
  colorJoin?: string;
  /** Whether the colour set is an exact match. */
  colorExact?: boolean;
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
    const colorKeys = intent.colors.values.map(
      (c) => COLOR_NAMES[c.toUpperCase()] ?? c.toLowerCase(),
    );
    const join = intent.colors.isOr ? ' or ' : ' + ';
    const names = colorKeys.join(join);
    out.push({
      kind: intent.colors.isIdentity ? 'color identity' : 'colors',
      kindKey: intent.colors.isIdentity ? 'colorIdentity' : 'colors',
      value: intent.colors.isExact ? `exactly ${names}` : names,
      colorKeys,
      colorJoin: join,
      colorExact: intent.colors.isExact,
    });
  }


  for (const type of intent.types ?? []) {
    out.push({ kind: 'type', kindKey: 'type', value: type.toLowerCase() });
  }

  if (intent.cmc) {
    out.push({
      kind: 'mana value',
      kindKey: 'manaValue',
      value: `${intent.cmc.op} ${intent.cmc.value}`,
    });
  }
  if (intent.power) {
    out.push({ kind: 'power', kindKey: 'power', value: `${intent.power.op} ${intent.power.value}` });
  }
  if (intent.toughness) {
    out.push({
      kind: 'toughness',
      kindKey: 'toughness',
      value: `${intent.toughness.op} ${intent.toughness.value}`,
    });
  }

  for (const tag of intent.tags ?? []) {
    out.push({
      kind: 'function tag',
      kindKey: 'functionTag',
      value: tag.replace(/^otag:/, '').replace(/-/g, ' '),
    });
  }
  for (const phrase of intent.oraclePatterns ?? []) {
    const cleaned = phrase
      .replace(/^(?:o|oracle|fo):/i, '')
      .replace(/^"|"$/g, '')
      .trim();
    if (cleaned) out.push({ kind: 'oracle text', kindKey: 'oracleText', value: `“${cleaned}”` });
  }


  return out.slice(0, 12);
}

/** Translate function shape compatible with i18next's `t`. */
type TranslateFn = (key: string, fallback?: string) => string;

/**
 * Render a constraint value in the active language. Only colour constraints
 * carry translatable tokens; everything else is data (numbers, oracle text).
 */
export function localizeConstraintValue(c: Constraint, t: TranslateFn): string {
  if (!c.colorKeys?.length) return c.value;
  const names = c.colorKeys
    .map((k) => t(`search.color.${k}`, k))
    .join(c.colorJoin ?? ' + ');
  return c.colorExact
    ? t('search.constraint.exactly', 'exactly {{names}}').replace('{{names}}', names)
    : names;
}
