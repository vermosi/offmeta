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

/**
 * Set names that double as ordinary Magic vocabulary. Matching these inside a
 * larger query would hijack functional searches ("red dwarf commander"), so
 * they only resolve when the user types them as the entire query.
 */
const RESERVED_PHRASE_NAMES = new Set([
  'commander',
  'conspiracy',
  'archenemy',
  'planechase',
  'vanguard',
  'legends',
  'invasion',
  'foundations',
  'starter',
  'battlebond',
  'portal',
  'mystery booster',
  'jumpstart',
  'unlimited',
  'revised',
  'alliances',
  'prophecy',
  'nemesis',
  'exodus',
  'stronghold',
  'tempest',
  'visions',
  'homelands',
  'chronicles',
  'apocalypse',
  'judgment',
  'torment',
  'odyssey',
  'onslaught',
  'legions',
  'scourge',
  'eventide',
  'morningtide',
  'conflux',
  'worldwake',
  'planeshift',
]);

export interface SetPhraseMatch extends SetMatch {
  /** The words of the original query that named the set. */
  matchedPhrase: string;
  /** Everything else the user typed, with the set phrase removed. */
  remainder: string;
}

/**
 * Finds a set name *inside* a longer query so mixed intents still work:
 * "the hobbit red dwarf" → `(e:hob or e:hoc)` plus the leftover "red dwarf",
 * which the normal deterministic parser turns into `c:r t:dwarf`.
 *
 * Deliberately conservative: only full set names match (never bare codes),
 * single-word names must be at least five characters, and names that are also
 * everyday Magic vocabulary are excluded.
 */
export function matchSetPhrase(rawQuery: string): SetPhraseMatch | null {
  const tokens = normalize(rawQuery).split(' ').filter(Boolean);
  if (tokens.length < 2) return null;

  for (let size = Math.min(tokens.length - 1, 6); size >= 1; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const window = tokens.slice(start, start + size);
      const windowSignature = window.filter((word) => !FILLER_WORDS.has(word)).join(' ');
      if (!windowSignature) continue;
      if (RESERVED_PHRASE_NAMES.has(windowSignature)) continue;
      if (!windowSignature.includes(' ') && windowSignature.length < 5) continue;

      const nameMatches = SCRYFALL_SETS.filter(
        (set) => signature(set.name) === windowSignature,
      );
      if (nameMatches.length === 0) continue;

      const remainder = [...tokens.slice(0, start), ...tokens.slice(start + size)]
        .filter((word) => !FILLER_WORDS.has(word))
        .join(' ')
        .trim();
      if (!remainder) continue;

      const codes = new Set(nameMatches.map((set) => set.code));
      const children = SCRYFALL_SETS.filter(
        (set) => set.parentSetCode && codes.has(set.parentSetCode) && !codes.has(set.code),
      );
      const sets = [...nameMatches, ...children].sort(byRelease);
      return {
        sets,
        query: renderQuery(sets),
        reason: 'exact-name',
        matchedPhrase: window.join(' '),
        remainder,
      };
    }
  }

  return null;
}
