/**
 * Resolves natural-language set references ("hobbit", "the hobbit set",
 * "bloomburrow cards") into Scryfall set queries.
 *
 * Without this, a query like "hobbit" falls through to the card-name path and
 * returns `name:hobbit` — seven old cards — instead of the 300+ cards in the
 * upcoming The Hobbit sets. Matching is deterministic and driven entirely by
 * the generated set vocabulary, so the same input always yields the same query.
 */
import { SCRYFALL_SETS, type ScryfallSetEntry } from './set-vocabulary.ts';

/** Words that carry no meaning when someone names a set. */
const FILLER_WORDS = new Set([
  'a',
  'all',
  'an',
  'and',
  'block',
  'card',
  'cards',
  'edition',
  'expansion',
  'from',
  'in',
  'me',
  'new',
  'of',
  'preview',
  'previews',
  'set',
  'sets',
  'show',
  'spoiler',
  'spoilers',
  'the',
  'upcoming',
]);

/** Common English words that also happen to be set codes — never code-match these. */
const AMBIGUOUS_CODES = new Set([
  'all',
  'and',
  'big',
  'box',
  'cmd',
  'end',
  'fun',
  'led',
  'me',
  'new',
  'one',
  'pip',
  'sir',
  'sld',
  'sta',
  'sun',
  'top',
  'war',
  'who',
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Strips filler words so "the hobbit set cards" and "hobbit" normalize alike. */
function contentWords(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((word) => word && !FILLER_WORDS.has(word));
}

function signature(value: string): string {
  return contentWords(value).join(' ');
}

export interface SetMatch {
  /** Sets to search, ordered by release date then code. */
  sets: ScryfallSetEntry[];
  /** Rendered Scryfall clause, e.g. `(e:hob or e:hoc)`. */
  query: string;
  /** How the match was made — useful for telemetry and explanations. */
  reason: 'exact-name' | 'exact-code';
}

function renderQuery(sets: ScryfallSetEntry[]): string {
  const codes = sets.map((set) => `e:${set.code}`);
  return codes.length === 1 ? codes[0] : `(${codes.join(' or ')})`;
}

function byRelease(a: ScryfallSetEntry, b: ScryfallSetEntry): number {
  if (a.releasedAt && b.releasedAt && a.releasedAt !== b.releasedAt) {
    return a.releasedAt < b.releasedAt ? -1 : 1;
  }
  return a.code.localeCompare(b.code);
}

/**
 * Matches a full user query against the set vocabulary.
 *
 * Only whole-query matches are returned: "hobbit" resolves to the set, while
 * "frodo hobbit ring" does not, so card-level searches are never hijacked.
 * When a base set matches, its supplemental children (commander/eternal decks
 * printed alongside it) are included so the whole product is searchable.
 */
export function matchSetQuery(rawQuery: string): SetMatch | null {
  const querySignature = signature(rawQuery);
  if (!querySignature) return null;

  const nameMatches = SCRYFALL_SETS.filter(
    (set) => signature(set.name) === querySignature,
  );

  if (nameMatches.length > 0) {
    const codes = new Set(nameMatches.map((set) => set.code));
    const children = SCRYFALL_SETS.filter(
      (set) => set.parentSetCode && codes.has(set.parentSetCode) && !codes.has(set.code),
    );
    const sets = [...nameMatches, ...children].sort(byRelease);
    return { sets, query: renderQuery(sets), reason: 'exact-name' };
  }

  // Bare set codes ("hob", "blb") — only when unambiguous and explicit.
  if (!querySignature.includes(' ') && !AMBIGUOUS_CODES.has(querySignature)) {
    const codeMatch = SCRYFALL_SETS.find((set) => set.code === querySignature);
    if (codeMatch) {
      const children = SCRYFALL_SETS.filter((set) => set.parentSetCode === codeMatch.code);
      const sets = [codeMatch, ...children].sort(byRelease);
      return { sets, query: renderQuery(sets), reason: 'exact-code' };
    }
  }

  return null;
}
