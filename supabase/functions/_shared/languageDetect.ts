/**
 * Lightweight, dependency-free non-English detection for search queries.
 *
 * The pre-translation stage used to rely on non-Latin scripts, accented
 * characters, or the UI locale. That misses the common case of a Spanish (or
 * French / German / Italian / Portuguese) query typed with plain ASCII while
 * the UI locale is English — e.g. "las mejores cartas para sephiroth".
 *
 * @module _shared/languageDetect
 */

/** Function words that are strong signals of a specific non-English language. */
const STOPWORDS: Record<string, string[]> = {
  es: [
    'las', 'los', 'una', 'unos', 'unas', 'del', 'para', 'como', 'que', 'con',
    'mejores', 'mejor', 'cartas', 'carta', 'baratas', 'barato', 'baratos',
    'busco', 'buscar', 'quiero', 'sin', 'todas', 'todos', 'menos', 'más',
    'criaturas', 'criatura', 'hechizos', 'mazo', 'azules', 'rojas', 'negras',
    'verdes', 'blancas',
  ],
  pt: [
    'melhores', 'melhor', 'cartas', 'carta', 'para', 'com', 'sem', 'como',
    'baratas', 'barato', 'criaturas', 'feitiços', 'baralho', 'que', 'uma',
  ],
  fr: [
    'les', 'des', 'une', 'pour', 'avec', 'sans', 'meilleures', 'meilleur',
    'cartes', 'carte', 'creatures', 'sorts', 'pas', 'cher', 'qui', 'dans',
  ],
  de: [
    'die', 'der', 'das', 'und', 'mit', 'ohne', 'beste', 'besten', 'karten',
    'karte', 'kreaturen', 'zauber', 'billige', 'für', 'nicht',
  ],
  it: [
    'migliori', 'migliore', 'carte', 'carta', 'per', 'con', 'senza',
    'creature', 'magie', 'economiche', 'che', 'della', 'delle',
  ],
};

/**
 * English words that also appear in the lists above (or are so common in MTG
 * queries) that they must never count as a non-English signal.
 */
const ENGLISH_SAFE = new Set([
  'card', 'cards', 'best', 'that', 'with', 'without', 'for', 'like', 'die',
  'dies', 'les', 'per', 'che', 'las', 'sin', 'con',
]);

const MIN_SIGNAL_WORDS = 2;

export interface NonEnglishSignal {
  isNonEnglish: boolean;
  /** Best-guess language code, when one list clearly dominates. */
  language?: string;
  /** Matched function words, for logging. */
  matches: string[];
}

/**
 * Detect a likely non-English query using function-word signals.
 *
 * Requires at least two distinct matches from the same language so that a
 * single ambiguous token (a card name such as "Las Vegas" or "Per Bast")
 * cannot flip an English query into the translation path.
 */
export function detectNonEnglishQuery(query: string): NonEnglishSignal {
  const words = query
    .toLowerCase()
    .normalize('NFC')
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);

  if (words.length < 2) return { isNonEnglish: false, matches: [] };

  let best: { language: string; matches: string[] } | null = null;

  for (const [language, list] of Object.entries(STOPWORDS)) {
    const set = new Set(list);
    const matches = [
      ...new Set(words.filter((w) => set.has(w) && !ENGLISH_SAFE.has(w))),
    ];
    if (!best || matches.length > best.matches.length) {
      best = { language, matches };
    }
  }

  if (best && best.matches.length >= MIN_SIGNAL_WORDS) {
    return { isNonEnglish: true, language: best.language, matches: best.matches };
  }

  return { isNonEnglish: false, matches: best?.matches ?? [] };
}

/**
 * Scripts used by the non-English locales OffMeta ships (ja, ko, ru, zhs/zht)
 * plus other common non-Latin scripts. A single character is enough: these
 * scripts never appear in an English query.
 */
const NON_LATIN_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}]/u;

/** True when the query contains characters from a non-Latin script. */
export function hasNonLatinScript(query: string): boolean {
  return NON_LATIN_SCRIPT.test(query);
}
