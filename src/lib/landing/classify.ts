/**
 * Landing page result classification.
 *
 * A landing page declares a small intent taxonomy (the same paths shown in the
 * intent explorer). Every representative card is checked against that taxonomy
 * using its own oracle text, so a card is only shown — and only labelled —
 * when the page can actually defend why it belongs there.
 *
 * Nothing here guesses: if no intent matches, the card is dropped rather than
 * given a vague label, and counts reported to the UI are counts of real
 * matches in the fetched result set.
 */

import type { ScryfallCard } from '@/types/card';
import type { IntentPath } from './types';

export interface ClassifiedCard {
  card: ScryfallCard;
  /** Uppercase taxonomy label, e.g. "PUNISH SACRIFICE". */
  label: string;
  /** Index of the matched intent path, used to spread labels across results. */
  intentIndex: number;
}

export interface ClassificationSummary {
  /** Cards selected for display, in presentation order. */
  selected: ClassifiedCard[];
  /** How many cards in the whole fetched set matched the taxonomy. */
  matchCount: number;
  /** Size of the fetched set the match count was measured against. */
  scannedCount: number;
}

/** Oracle text of a card, including both faces of a DFC. */
export function cardText(card: ScryfallCard): string {
  const faces = card.card_faces?.map((face) => face.oracle_text ?? '') ?? [];
  return [card.oracle_text ?? '', ...faces, card.type_line ?? '']
    .join(' \n ')
    .toLowerCase();
}

/**
 * Match a single card against the taxonomy. Returns the first matching intent,
 * so intent order in the config is also priority order.
 */
export function classifyCard(
  card: ScryfallCard,
  paths: readonly IntentPath[],
): ClassifiedCard | null {
  const text = cardText(card);

  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];
    if (!path.match?.length) continue;
    if (path.match.some((phrase) => text.includes(phrase.toLowerCase()))) {
      return { card, label: path.label.toUpperCase(), intentIndex: index };
    }
  }

  return null;
}

/**
 * Classify a result set and pick the cards worth showing.
 *
 * Selection favours defensibility and breadth over filling the row: one card
 * per intent first, then the strongest leftovers, and never more than `max`.
 * A short row of four is an acceptable — often better — outcome.
 */
export function classifyResults(
  cards: readonly ScryfallCard[],
  paths: readonly IntentPath[],
  max = 6,
): ClassificationSummary {
  const hasTaxonomy = paths.some((path) => path.match?.length);
  if (!hasTaxonomy) {
    return { selected: [], matchCount: 0, scannedCount: cards.length };
  }

  const matched: ClassifiedCard[] = [];
  const seenNames = new Set<string>();

  for (const card of cards) {
    const classified = classifyCard(card, paths);
    if (!classified) continue;
    // Scryfall can return several printings of the same card.
    if (seenNames.has(card.name)) continue;
    seenNames.add(card.name);
    matched.push(classified);
  }

  const selected: ClassifiedCard[] = [];
  const usedIntents = new Set<number>();

  for (const entry of matched) {
    if (selected.length >= max) break;
    if (usedIntents.has(entry.intentIndex)) continue;
    usedIntents.add(entry.intentIndex);
    selected.push(entry);
  }

  // Fill remaining slots, but never let one intent dominate the row.
  const perIntent = new Map<number, number>(
    selected.map((entry) => [entry.intentIndex, 1]),
  );
  for (const entry of matched) {
    if (selected.length >= max) break;
    if (selected.includes(entry)) continue;
    const used = perIntent.get(entry.intentIndex) ?? 0;
    if (used >= 2) continue;
    perIntent.set(entry.intentIndex, used + 1);
    selected.push(entry);
  }

  return {
    selected,
    matchCount: matched.length,
    scannedCount: cards.length,
  };
}
