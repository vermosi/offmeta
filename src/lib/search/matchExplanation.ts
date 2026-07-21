/**
 * Generate short, human-readable "why this matches" reasons for a card
 * based on the parsed SearchIntent from the translation pipeline.
 * @module lib/search/matchExplanation
 */

import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';

const COLOR_NAMES: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
  C: 'colorless',
};

function cardText(card: ScryfallCard): string {
  const parts: string[] = [];
  if (card.oracle_text) parts.push(card.oracle_text);
  if (card.card_faces) {
    for (const face of card.card_faces) {
      if (face.oracle_text) parts.push(face.oracle_text);
    }
  }
  return parts.join(' \n ').toLowerCase();
}

function cardTypeLine(card: ScryfallCard): string {
  const parts: string[] = [];
  if (card.type_line) parts.push(card.type_line);
  if (card.card_faces) {
    for (const face of card.card_faces) {
      if (face.type_line) parts.push(face.type_line);
    }
  }
  return parts.join(' // ').toLowerCase();
}

function cardCmc(card: ScryfallCard): number | undefined {
  return typeof card.cmc === 'number' ? card.cmc : undefined;
}

function compare(op: string, a: number, b: number): boolean {
  switch (op) {
    case '<': return a < b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '>=': return a >= b;
    case '=':
    case ':':
    case '==': return a === b;
    default: return false;
  }
}

/**
 * Extract short reason strings describing why a card matches the parsed intent.
 * Returns an empty array when no intent is provided or nothing matched.
 */
export function explainCardMatch(
  card: ScryfallCard,
  intent: SearchIntent | null | undefined,
): string[] {
  if (!intent) return [];

  const reasons: string[] = [];
  const cardColors = new Set(card.color_identity ?? card.colors ?? []);
  const oracle = cardText(card);
  const types = cardTypeLine(card);
  const cmc = cardCmc(card);

  // Colors
  if (intent.colors && intent.colors.values.length > 0) {
    const wanted = intent.colors.values;
    const matched = wanted.filter((c) => cardColors.has(c));
    if (matched.length > 0) {
      const names = matched.map((c) => COLOR_NAMES[c] ?? c).join('/');
      reasons.push(intent.colors.isIdentity ? `Color identity: ${names}` : `Color: ${names}`);
    }
  }

  // Types
  if (intent.types.length > 0) {
    const matched = intent.types.filter((t) => types.includes(t.toLowerCase()));
    if (matched.length > 0) {
      reasons.push(`Type: ${matched.join(', ')}`);
    }
  }

  // Mana value
  if (intent.cmc && typeof cmc === 'number' && compare(intent.cmc.op, cmc, intent.cmc.value)) {
    reasons.push(`Mana value ${intent.cmc.op}${intent.cmc.value} (this is ${cmc})`);
  }

  // Power / toughness
  const pow = card.power ? Number(card.power) : NaN;
  const tou = card.toughness ? Number(card.toughness) : NaN;
  if (intent.power && !Number.isNaN(pow) && compare(intent.power.op, pow, intent.power.value)) {
    reasons.push(`Power ${intent.power.op}${intent.power.value}`);
  }
  if (intent.toughness && !Number.isNaN(tou) && compare(intent.toughness.op, tou, intent.toughness.value)) {
    reasons.push(`Toughness ${intent.toughness.op}${intent.toughness.value}`);
  }

  // Oracle patterns (approximate: substring or regex-safe token match)
  for (const raw of intent.oraclePatterns) {
    if (!raw) continue;
    const clean = raw.replace(/^o:/i, '').replace(/^"|"$/g, '').trim().toLowerCase();
    if (!clean) continue;
    if (oracle.includes(clean)) {
      const label = clean.length > 40 ? `${clean.slice(0, 37)}…` : clean;
      reasons.push(`Oracle text: "${label}"`);
    }
  }

  // Tags (Scryfall function/oracle tags — no direct card field, so we surface as "matched tag")
  for (const tag of intent.tags) {
    if (!tag) continue;
    const clean = tag.replace(/^otag:|^oracletag:|^functionality:/i, '').trim();
    if (clean) reasons.push(`Matched concept: ${clean}`);
  }

  return reasons;
}
