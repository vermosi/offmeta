/**
 * Deterministic Translation – Pattern Parsers
 * Handles targeting, oracle text, mana production,
 * equipment, special patterns, and companions.
 * @module deterministic/parse-patterns
 */

import {
  COMPANION_RESTRICTIONS,
} from '../shared-mappings.ts';
import { KNOWN_OTAGS } from '../tags.ts';
import type { SearchIR } from './types.ts';

/**
 * Parse "targeting" patterns - cards that affect/destroy/exile/counter a type
 * CRITICAL: These patterns must be parsed BEFORE parseTypes() to prevent
 * the type word from being incorrectly added as t:[type]
 */
export function parseTargetingPatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  const removalTags: Record<string, string> = {
    artifact: 'otag:artifact-removal',
    enchantment: 'otag:enchantment-removal',
    creature: 'otag:creature-removal',
    planeswalker: 'otag:planeswalker-removal',
    land: 'o:"destroy" o:"land"',
    permanent: 'otag:removal',
  };

  const targetingPatterns = [
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*destroy\s+(artifact|enchantment|creature|planeswalker|land|permanent)s?\b/gi,
      extract: 1,
      effect: 'destroy',
    },
    {
      pattern:
        /\b(artifact|enchantment|creature|planeswalker|land|permanent)\s*destruction\b/gi,
      extract: 1,
      effect: 'destroy',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*exile\s+(artifact|enchantment|creature|planeswalker|land|permanent)s?\b/gi,
      extract: 1,
      effect: 'exile',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*remove\s+(artifact|enchantment|creature|planeswalker|land|permanent)s?\b/gi,
      extract: 1,
      effect: 'remove',
    },
    {
      pattern:
        /\b(artifact|enchantment|creature|planeswalker|land|permanent)\s*removal\b/gi,
      extract: 1,
      effect: 'remove',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*counter\s+(artifact|enchantment|creature|planeswalker|land|permanent)(?:\s*spell)?s?\b/gi,
      extract: 1,
      effect: 'counter',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*kill\s+(creature)s?\b/gi,
      extract: 1,
      effect: 'kill',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*deal\s+damage\s+to\s+(artifact|enchantment|creature|planeswalker|permanent)s?\b/gi,
      extract: 1,
      effect: 'damage',
    },
  ];

  for (const { pattern, extract, effect } of targetingPatterns) {
    let match;
    while ((match = pattern.exec(remaining)) !== null) {
      const targetType = match[extract].toLowerCase().replace(/s$/, '');

      if (
        effect === 'destroy' ||
        effect === 'remove' ||
        effect === 'kill' ||
        effect === 'damage'
      ) {
        const tag = removalTags[targetType];
        if (tag) {
          ir.specials.push(tag);
        }
      } else if (effect === 'exile') {
        ir.oracle.push(`o:"exile" o:"${targetType}"`);
      } else if (effect === 'counter') {
        if (targetType === 'creature') {
          ir.oracle.push(`o:"counter" o:"creature spell"`);
        } else {
          ir.oracle.push(`o:"counter" o:"${targetType}"`);
        }
      }

      remaining = remaining.replace(match[0], '').trim();
    }
    pattern.lastIndex = 0;
  }

  return remaining;
}

export function parseCompanions(query: string, ir: SearchIR): string {
  let remaining = query;
  const companionMatch = remaining.match(/\bcompanion\b/i);
  if (!companionMatch) return remaining;

  for (const [name, restrictions] of Object.entries(COMPANION_RESTRICTIONS)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(remaining)) {
      ir.specials.push(...restrictions);
      remaining = remaining.replace(regex, '').trim();
      remaining = remaining.replace(/\bcompanion\b/gi, '').trim();
      return remaining;
    }
  }

  ir.specials.push('is:companion');
  remaining = remaining.replace(/\bcompanion\b/gi, '').trim();
  return remaining;
}

/**
 * Frame, border, and print-treatment vocabulary.
 * "retro frame" must never fall through to the card-name heuristic
 * (which produced `name:retro name:frame`).
 */
const FRAME_PATTERNS: Array<[RegExp, string]> = [
  [/\b(?:retro|old|old[- ]school|vintage[- ]style)\s+(?:frame|border)s?\b/gi, 'is:retro'],
  [/\b(?:modern|new|current)\s+frames?\b/gi, 'frame:2015'],
  [/\b(?:future|futureshifted)\s+frames?\b/gi, 'frame:future'],
  [/\b(?:1993|alpha|original)\s+frames?\b/gi, 'frame:1993'],
  [/\b1997\s+frames?\b/gi, 'frame:1997'],
  [/\b2003\s+frames?\b/gi, 'frame:2003'],
  [/\b2015\s+frames?\b/gi, 'frame:2015'],
  [/\bextended[- ]art\b/gi, 'frame:extendedart'],
  [/\bborderless\b/gi, 'border:borderless'],
  [/\bwhite[- ]border(?:ed)?\b/gi, 'border:white'],
  [/\bsilver[- ]border(?:ed)?\b/gi, 'border:silver'],
  [/\bblack[- ]border(?:ed)?\b/gi, 'border:black'],
  [/\bfull[- ]art\b/gi, 'is:fullart'],
  [/\btextless\b/gi, 'is:textless'],
  [/\bshowcase(?:\s+frames?)?\b/gi, 'is:showcase'],


  // --- Localized print-treatment vocabulary (all 11 supported locales) ---
  // Non-Latin scripts and accented letters break `\b`, so these use explicit
  // letter lookarounds with the /u flag instead of word boundaries.
  // Retro / old frame
  [/レトロ\s*フレーム|旧枠|オールドフレーム/gu, 'is:retro'],
  [/레트로\s*(?:프레임|틀)|구\s*프레임/gu, 'is:retro'],
  [/复古边框|复古框|旧框|舊框|復古邊框|復古框/gu, 'is:retro'],
  [/(?<!\p{L})(?:ретро[-\s]?рамк\p{L}*|стар\p{L}+\s+рамк\p{L}*)(?!\p{L})/giu, 'is:retro'],
  [/(?<!\p{L})(?:marcos?|bordes?)\s+(?:retro|antiguos?)(?!\p{L})/giu, 'is:retro'],
  [/(?<!\p{L})(?:cadres?\s+r[ée]tro|ancien\s+cadre)(?!\p{L})/giu, 'is:retro'],
  [/(?<!\p{L})(?:retro[-\s]?rahmen|alte[rns]?\s+rahmen)(?!\p{L})/giu, 'is:retro'],
  [/(?<!\p{L})(?:cornice\s+retr[òo]|bordo\s+vecchio)(?!\p{L})/giu, 'is:retro'],
  [/(?<!\p{L})moldura\s+(?:retr[ôo]|antiga)(?!\p{L})/giu, 'is:retro'],
  // Modern / new frame
  [/(?:モダン|モダーン|現代|新)\s*(?:フレーム|枠)/gu, 'frame:2015'],
  [/(?:모던|현대|신|새)\s*(?:프레임|틀)/gu, 'frame:2015'],
  [/现代边框|現代邊框|现代框|現代框|新边框|新邊框|新框/gu, 'frame:2015'],
  [/(?<!\p{L})(?:современн\p{L}*|нов\p{L}+)\s+рамк\p{L}*(?!\p{L})/giu, 'frame:2015'],
  [/(?<!\p{L})(?:marcos?|bordes?)\s+(?:modernos?|nuevos?)(?!\p{L})/giu, 'frame:2015'],
  [/(?<!\p{L})(?:cadres?\s+moderne?s?|nouveau\s+cadre)(?!\p{L})/giu, 'frame:2015'],
  [/(?<!\p{L})(?:modern\p{L}*\s+rahmen|neue[rns]?\s+rahmen)(?!\p{L})/giu, 'frame:2015'],
  [/(?<!\p{L})cornice\s+(?:modern[ae]|nuova)(?!\p{L})/giu, 'frame:2015'],
  [/(?<!\p{L})moldura\s+(?:moderna|nova)(?!\p{L})/giu, 'frame:2015'],
  // Borderless

  [/ボーダーレス|枠なし/gu, 'border:borderless'],
  [/보더리스|테두리\s*없\p{L}*/gu, 'border:borderless'],
  [/无边框|無邊框|无框|無框/gu, 'border:borderless'],
  [/(?<!\p{L})(?:без\s*рам\p{L}*|безрамочн\p{L}*)(?!\p{L})/giu, 'border:borderless'],
  [/(?<!\p{L})sin\s+bordes?(?!\p{L})/giu, 'border:borderless'],
  [/(?<!\p{L})sans\s+bordures?(?!\p{L})/giu, 'border:borderless'],
  [/(?<!\p{L})(?:randlos\p{L}*|ohne\s+rand)(?!\p{L})/giu, 'border:borderless'],
  [/(?<!\p{L})senza\s+bordi?(?!\p{L})/giu, 'border:borderless'],
  [/(?<!\p{L})sem\s+bordas?(?!\p{L})/giu, 'border:borderless'],
  // Full art
  [/フルアート/gu, 'is:fullart'],
  [/풀\s*아트/gu, 'is:fullart'],
  [/全图|全圖|满图|滿圖/gu, 'is:fullart'],
  [/(?<!\p{L})(?:фулл[-\s]?арт\p{L}*|полн\p{L}+\s+иллюстрац\p{L}*)(?!\p{L})/giu, 'is:fullart'],
  [/(?<!\p{L})arte\s+complet[ao](?!\p{L})/giu, 'is:fullart'],
  [/(?<!\p{L})pleine\s+(?:illustration|page)(?!\p{L})/giu, 'is:fullart'],
  [/(?<!\p{L})(?:vollbild|ganzseitige[rs]?\s+illustration)(?!\p{L})/giu, 'is:fullart'],
  // Textless
  [/テキストレス|文章なし/gu, 'is:textless'],
  [/텍스트\s*없\p{L}*/gu, 'is:textless'],
  [/无文本|無文字|无字|無字/gu, 'is:textless'],
  [/(?<!\p{L})без\s*текст\p{L}*(?!\p{L})/giu, 'is:textless'],
  [/(?<!\p{L})sin\s+texto(?!\p{L})/giu, 'is:textless'],
  [/(?<!\p{L})sans\s+texte(?!\p{L})/giu, 'is:textless'],
  [/(?<!\p{L})ohne\s+text(?!\p{L})/giu, 'is:textless'],
  [/(?<!\p{L})senza\s+testo(?!\p{L})/giu, 'is:textless'],
  [/(?<!\p{L})sem\s+texto(?!\p{L})/giu, 'is:textless'],
  // Extended art
  [/拡張アート/gu, 'frame:extendedart'],
  [/확장\s*아트/gu, 'frame:extendedart'],
  [/扩展艺术|擴展藝術|延伸藝術/gu, 'frame:extendedart'],
  [/(?<!\p{L})расширенн\p{L}*\s+(?:арт\p{L}*|иллюстрац\p{L}*)(?!\p{L})/giu, 'frame:extendedart'],
  [/(?<!\p{L})arte\s+(?:extendid[ao]|estesa|estendida)(?!\p{L})/giu, 'frame:extendedart'],
  [/(?<!\p{L})art\s+[ée]tendu(?!\p{L})/giu, 'frame:extendedart'],
  [/(?<!\p{L})erweiterte[rsn]?\s+(?:kunst|artwork|rahmen)(?!\p{L})/giu, 'frame:extendedart'],
  // Showcase
  [/ショーケース/gu, 'is:showcase'],
  [/쇼케이스/gu, 'is:showcase'],
  [/展示框|展示邊框/gu, 'is:showcase'],
  [/(?<!\p{L})витринн\p{L}*(?!\p{L})/giu, 'is:showcase'],
  [/(?<!\p{L})(?:escaparate|vitrine|vetrina)(?!\p{L})/giu, 'is:showcase'],

  // Bare "retro" — last so compound and localized rules match first
  [/(?<!\p{L})retro(?!\p{L})/giu, 'is:retro'],
];


/**
 * Generic "card(s)" nouns across supported locales — ignored when deciding
 * whether a query is purely about print treatment.
 */
const CARD_NOUN_NOISE =
  /(?<!\p{L})(?:cards?|cartas?|cartes?|karten?|carte|magic|mtg|карт\p{L}*)(?!\p{L})|カード|カード類|カードの|카드|卡牌|卡片|卡|[のはをがでとな々]|的/giu;

/**
 * Long, distinctive print-treatment words that are safe to fuzzy-match.
 * Short words like "frame"/"retro" are excluded on purpose: they sit one edit
 * away from common MTG words ("flame", "hero"), so they use explicit typo
 * alternations below instead.
 */
const FUZZY_FRAME_VOCAB = ['borderless', 'textless', 'showcase'] as const;

/** Real MTG words that must never be rewritten by the fuzzy pass. */
const FUZZY_FRAME_DENYLIST = new Set(['bordering', 'boardless', 'shocase']);

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Repairs common misspellings and glued compounds so typos like "borderles",
 * "bordeless", or "retroframe" still resolve to print-treatment syntax.
 * Only touches ASCII-letter tokens, so localized vocabulary is untouched.
 */
export function normalizeFrameTypos(query: string): string {
  const out = query
    // Glued compounds: "retroframe", "oldborder", "showcaseframe"
    .replace(/\b(retro|old|new|modern|future|showcase|extended)(frames?|borders?)\b/gi, '$1 $2')
    .replace(/\bfullart\b/gi, 'full-art')
    // Explicit short-word typos (fuzzy matching is unsafe at this length)
    .replace(/\b(?:fram|framme|frme|frane)\b/gi, 'frame')
    .replace(/\b(?:frams|frammes|franes)\b/gi, 'frames')
    .replace(/(?<!\p{L})(?:retor|rerto|rertro)(?!\p{L})/giu, 'retro')
    .replace(/\b(?:boarder|bordr)\b/gi, 'border');

  return out.replace(/\b[a-z]{7,12}\b/gi, (word) => {
    const lower = word.toLowerCase();
    if (FUZZY_FRAME_DENYLIST.has(lower)) return word;
    if ((FUZZY_FRAME_VOCAB as readonly string[]).includes(lower)) return word;
    let best: string | null = null;
    let bestScore = Infinity;
    for (const candidate of FUZZY_FRAME_VOCAB) {
      if (Math.abs(candidate.length - lower.length) > 2) continue;
      const distance = levenshtein(lower, candidate);
      if (distance <= 2 && distance < bestScore) {
        best = candidate;
        bestScore = distance;
      }
    }
    return best ?? word;
  });
}


/**
 * Keywords that are commonly *granted* to other permanents rather than
 * possessed by the card itself.
 */
const GRANTABLE_KEYWORDS: Record<string, string> = {
  indestructible: 'indestructible',
  hexproof: 'hexproof',
  shroud: 'shroud',
  flying: 'flying',
  trample: 'trample',
  haste: 'haste',
  lifelink: 'lifelink',
  vigilance: 'vigilance',
  deathtouch: 'deathtouch',
  menace: 'menace',
  'first strike': 'first strike',
  'double strike': 'double strike',
  ward: 'ward',
  reach: 'reach',
  flash: 'flash',
  protection: 'protection',
};

const GRANT_VERB = '(?:gives?|granting|grants?|giving|gain(?:s|ing)?|get(?:s)?)';
const GRANT_SUBJECT =
  '(?:(?:all|your|my|our|their|each|every|target|other|the)\\s+)*(?:creatures?|permanents?|team|creature)?\\s*(?:you\\s+control\\s*)?';

/**
 * Parse "gives your creatures indestructible" style phrases into an oracle
 * grant clause instead of `kw:` (which would wrongly match cards that simply
 * *have* the keyword).
 */
export function parseKeywordGrants(query: string, ir: SearchIR): string {
  let remaining = query;

  for (const [phrase, keyword] of Object.entries(GRANTABLE_KEYWORDS)) {
    const escaped = phrase.replace(/\s+/g, '\\s+');
    const patterns = [
      new RegExp(`\\b${GRANT_VERB}\\s+${GRANT_SUBJECT}${escaped}\\b`, 'i'),
      new RegExp(
        `\\b(?:creatures?|permanents?)\\s+(?:you\\s+control\\s+)?(?:that\\s+)?gains?\\s+${escaped}\\b`,
        'i',
      ),
    ];

    for (const pattern of patterns) {
      const match = remaining.match(pattern);
      if (!match) continue;

      const matchedText = match[0].toLowerCase();
      const teamWide = /\b(your|my|our|their|you control|all|each|every|team)\b/.test(
        matchedText,
      );

      const clause =
        `(o:"gain ${keyword}" or o:"gains ${keyword}" or o:"have ${keyword}" or o:"has ${keyword}")`;
      if (!ir.specials.includes(clause)) ir.specials.push(clause);
      if (teamWide && !ir.specials.includes('o:"you control"')) {
        ir.specials.push('o:"you control"');
      }

      // A grant clause is far more specific than the generic anthem/lord tags
      // that "anthem"-style wording may have already added.
      const isAnthemToken = (token: string) =>
        token === 'otag:anthem' || token === 'otag:lord';
      ir.tags = ir.tags.filter((tag) => !isAnthemToken(tag));
      ir.specials = ir.specials.filter((token) => !isAnthemToken(token));

      remaining = remaining.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }

  return remaining;
}





export function parseFramePatterns(query: string, ir: SearchIR): string {
  let remaining = normalizeFrameTypos(query);
  for (const [pattern, token] of FRAME_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(remaining)) {
      if (!ir.specials.includes(token)) ir.specials.push(token);
      pattern.lastIndex = 0;
      remaining = remaining.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  return remaining;
}


/**
 * Whole-query print-treatment match ("retro frame", "レトロフレーム", "sin bordes").
 * Runs before the card-name heuristic so localized frame terms never become
 * `name:` tokens.
 */
export function matchFrameOnlyQuery(query: string): string | null {
  const specials: string[] = [];
  const remainder = parseFramePatterns(query, { specials } as unknown as SearchIR);
  if (specials.length === 0) return null;
  const leftover = remainder
    .replace(CARD_NOUN_NOISE, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (leftover.length > 0) return null;
  return specials.join(' ');
}


export function parseSpecialPatterns(query: string, ir: SearchIR): string {
  let remaining = query;


  // Legality status ("banned in commander", "restricted in vintage") must be
  // parsed BEFORE the commander format patterns, otherwise "in commander" is
  // consumed as f:commander and the ban filter is lost.
  const FORMAT_ALTERNATION =
    'standard|pioneer|modern|legacy|vintage|pauper|historic|timeless|oathbreaker|brawl|commander|edh|alchemy|gladiator|penny';

  const bannedPattern = new RegExp(
    `\\b(?:banned|illegal)\\s+(?:in|for|from)\\s+(?:the\\s+)?(${FORMAT_ALTERNATION})\\b|\\b(${FORMAT_ALTERNATION})\\s+(?:ban(?:ned)?)\\s*list\\b`,
    'gi',
  );
  const bannedMatch = bannedPattern.exec(remaining);
  if (bannedMatch) {
    const format = (bannedMatch[1] ?? bannedMatch[2]).toLowerCase();
    ir.specials.push(`banned:${format === 'edh' ? 'commander' : format}`);
    remaining = remaining.replace(bannedMatch[0], '').trim();
  }

  const restrictedPattern = new RegExp(
    `\\brestricted\\s+(?:in|for)\\s+(?:the\\s+)?(${FORMAT_ALTERNATION})\\b`,
    'gi',
  );
  const restrictedMatch = restrictedPattern.exec(remaining);
  if (restrictedMatch) {
    const format = restrictedMatch[1].toLowerCase();
    ir.specials.push(`restricted:${format === 'edh' ? 'commander' : format}`);
    remaining = remaining.replace(restrictedMatch[0], '').trim();
  }

  const hasLegalityStatus = ir.specials.some((s) =>
    s.startsWith('banned:') || s.startsWith('restricted:')
  );

  const commanderFormatPattern =
    /\bcommander(?:-|\s)?(deck|format|legal)\b|\blegal in commander\b|\bfor\s+(?:\w+\s+)*commander\b|\bin\s+commander\b|\bcommander\s+(staples?|cards?|playable|options?|picks?|pieces?|essentials?|must[- ]haves?)\b/gi;
  if (!hasLegalityStatus && commanderFormatPattern.test(remaining)) {
    ir.specials.push('f:commander');
    commanderFormatPattern.lastIndex = 0;
    remaining = remaining.replace(commanderFormatPattern, '').trim();
  }


  // "best/top commander [concept]" = format legality, not card property
  // e.g. "best commander board wipes", "commander card draw", "commander ramp"
  const commanderConceptPattern =
    /\b(?:best|top|good|great)?\s*commander\s+(?:board\s*wipes?|boardwipes?|card\s*draw|ramp|removal|counterspells?|tutors?|protection|sacrifice|sac\s*outlets?|stax|hate|graveyard|reanimation|mill|tokens?|wrath|wraths|sweepers?|finishers?|win\s*cons?|combos?|lands?|mana\s*(?:base|rocks?|dorks?|fixing)|recursion)\b/gi;
  if (!hasLegalityStatus && !ir.specials.includes('f:commander') && commanderConceptPattern.test(remaining)) {
    ir.specials.push('f:commander');
    commanderConceptPattern.lastIndex = 0;
    // Only strip "commander" from the match, keep the concept keyword
    remaining = remaining.replace(/\bcommanders?\b/gi, '').trim();
  }

  // If "commander" is still in the remaining text AND concept tags/oracle were
  // already consumed by earlier parsers (tag mappings, slang, etc.), treat it
  // as format intent rather than card property.
  // e.g. "best commander board wipes" → tag mappings consume "board wipes" first,
  // leaving "best commander" → should be f:commander, not is:commander.
  const CONCEPT_TAGS = ['otag:boardwipe', 'otag:draw', 'otag:ramp', 'otag:removal',
    'otag:counter', 'otag:tutor', 'otag:sacrifice-outlet', 'otag:reanimate',
    'otag:lifegain', 'otag:manarock', 'otag:mana-rock', 'otag:mana-dork',
    'otag:stax', 'otag:mill', 'otag:token-maker', 'otag:mass-removal',
    'otag:spot-removal', 'otag:graveyard-hate', 'otag:protection'];
  const hasConceptInIR = ir.tags.some(t => CONCEPT_TAGS.includes(t)) ||
    ir.oracle.length > 0;

  if (
    !hasLegalityStatus &&
    /\bcommander\b|\bis:commander\b|\bas commander\b|\bcommanders\b/i.test(
      remaining,
    )
  ) {
    if (!ir.specials.includes('f:commander') && hasConceptInIR) {
      // Concept already parsed — "commander" means format, not card property
      ir.specials.push('f:commander');
    } else {
      ir.specials.push('is:commander');
    }
    remaining = remaining.replace(/\b(?:as )?commanders?\b/gi, '').trim();
  }

  // Format parsing: "from modern", "in pioneer", "legal in standard", etc.
  const FORMAT_NAMES = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper', 'historic', 'timeless', 'oathbreaker', 'penny', 'alchemy', 'brawl', 'gladiator'];
  const formatPattern = new RegExp(
    `\\b(?:from|in|for|legal in|legal for)\\s+(${FORMAT_NAMES.join('|')})\\b`,
    'gi',
  );
  const formatMatch = formatPattern.exec(remaining);
  if (formatMatch) {
    const format = formatMatch[1].toLowerCase();
    if (!ir.specials.some(s => s === `f:${format}`)) {
      ir.specials.push(`f:${format}`);
    }
    remaining = remaining.replace(formatMatch[0], '').trim();
  }

  if (
    /\bmore than (?:one|1) color\b|\bmulticolor\b|\b(at least|two or more) colors?\b/i.test(
      remaining,
    )
  ) {
    ir.colorCountConstraint = { field: 'id', op: '>', value: 1 };
    remaining = remaining
      .replace(
        /\bmore than (?:one|1) color\b|\bmulticolor\b|\b(at least|two or more) colors?\b/gi,
        '',
      )
      .trim();
  }

  if (
    /\bblue\b/i.test(remaining) &&
    /\b(one of which|including|with)\b/i.test(remaining)
  ) {
    ir.specials.push('ci>=u');
    remaining = remaining
      .replace(/\b(one of which|including|with)\b/gi, '')
      .trim();
    remaining = remaining.replace(/\bblue\b/gi, '').trim();
  }

  // "phyrexian mana" / "cards with phyrexian mana" → m:/P/
  if (/\bphyrexian\s+mana\b/i.test(remaining)) {
    ir.specials.push('m:/P/');
    remaining = remaining.replace(/\bphyrexian\s+mana\b/gi, '').trim();
  }

  return remaining;
}

export function parseEquipmentPatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  const equipMatch = remaining.match(
    /\bequip(?:s)?(?: cost)?(?: for)?\s*(\d+)\b/i,
  );
  if (equipMatch) {
    const equipCost = Number(equipMatch[1]);
    if (!Number.isNaN(equipCost)) {
      const isAtMost = /\bor less\b/i.test(remaining);
      if (isAtMost) {
        ir.oracle.push(`o:/equip \\{[0-${equipCost}]\\}/`);
      } else {
        ir.oracle.push(`o:"equip {${equipCost}}"`);
      }
      remaining = remaining.replace(equipMatch[0], '').trim();
    }
  }

  return remaining;
}

export function parseOraclePatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  // Extra combat phases ("combat doubler", "additional combat phase")
  const extraCombatPattern =
    /\b(?:extra|additional|another|second)\s+combat(?:\s+phases?)?\b|\bcombat(?:\s+phase)?\s+doublers?\b|\bdouble\s+combat(?:\s+phases?)?\b/gi;
  if (extraCombatPattern.test(remaining)) {
    ir.oracle.push('o:"additional combat phase"');
    extraCombatPattern.lastIndex = 0;
    remaining = remaining.replace(extraCombatPattern, '').trim();
  }

  // Free casts / "cheating" spells into play ("cheat mana costs",
  // "cast without paying its mana cost", "put onto the battlefield free")
  const freeCastPattern =
    /\bcheat(?:ing)?\s+(?:in\s+)?(?:mana\s+)?costs?\b|\bcheat\s+(?:cards?|creatures?|spells?)\s+(?:in|into\s+play)\b|\bcast(?:ing)?\s+(?:spells?\s+)?(?:for\s+free|without\s+paying(?:\s+(?:its|their))?(?:\s+mana\s+costs?)?)\b|\bfree\s+(?:spell\s+)?casts?\b/gi;
  if (freeCastPattern.test(remaining)) {
    ir.oracle.push(
      '(o:"without paying its mana cost" or o:"without paying their mana costs")',
    );
    freeCastPattern.lastIndex = 0;
    remaining = remaining.replace(freeCastPattern, '').trim();
  }

  // Finishers / game-enders → win condition payoffs
  const finisherPattern =
    /\bgame[-\s]?enders?\b|\bfinishers?\b|\bwin\s*cons?\b|\bwin\s+conditions?\b/gi;
  if (finisherPattern.test(remaining)) {
    ir.tags.push(
      KNOWN_OTAGS.has('win-condition') ? 'otag:win-condition' : 'otag:finisher',
    );
    finisherPattern.lastIndex = 0;
    remaining = remaining.replace(finisherPattern, '').trim();
  }



  if (/\b(?:draw cards?|card\s+draw)\b/i.test(remaining)) {
    if (KNOWN_OTAGS.has('draw')) {
      ir.tags.push('otag:draw');
    } else {
      ir.oracle.push('o:/draw (a|two|three|\\d+) cards?/');
    }
    remaining = remaining.replace(/\b(?:draw cards?|card\s+draw)\b/gi, '').trim();
  }

  if (
    /\bdraws?\s+(?:a|one|1)\s+card\b/i.test(remaining) ||
    /\bdraw\s+a\s+card\b/i.test(remaining)
  ) {
    if (KNOWN_OTAGS.has('draw')) {
      ir.tags.push('otag:draw');
    } else {
      ir.oracle.push('o:"draw a card"');
    }
    remaining = remaining
      .replace(/\bdraws?\s+(?:a|one|1)\s+card\b/gi, '')
      .replace(/\bdraw\s+a\s+card\b/gi, '')
      .trim();
  }

  if (/\bdraws?\s+(?:two|2)\s+cards?\b/i.test(remaining)) {
    if (KNOWN_OTAGS.has('draw')) {
      ir.tags.push('otag:draw');
    } else {
      ir.oracle.push('o:"draw two cards"');
    }
    remaining = remaining.replace(/\bdraws?\s+(?:two|2)\s+cards?\b/gi, '').trim();
  }

  if (/\bdraws?\s+(?:three|3)\s+cards?\b/i.test(remaining)) {
    if (KNOWN_OTAGS.has('draw')) {
      ir.tags.push('otag:draw');
    } else {
      ir.oracle.push('o:"draw three cards"');
    }
    remaining = remaining.replace(/\bdraws?\s+(?:three|3)\s+cards?\b/gi, '').trim();
  }

  if (
    /\bpower\s+(?:greater\s+than|more\s+than|over|above)\s+toughness\b/i.test(
      remaining,
    )
  ) {
    ir.specials.push('pow>tou');
    remaining = remaining
      .replace(
        /\bpower\s+(?:greater\s+than|more\s+than|over|above)\s+toughness\b/gi,
        '',
      )
      .trim();
  }

  if (
    /\btoughness\s+(?:greater\s+than|more\s+than|over|above)\s+power\b/i.test(
      remaining,
    )
  ) {
    ir.specials.push('tou>pow');
    remaining = remaining
      .replace(
        /\btoughness\s+(?:greater\s+than|more\s+than|over|above)\s+power\b/gi,
        '',
      )
      .trim();
  }

  if (/\bparty\s+tribal\b/i.test(remaining)) {
    ir.oracle.push('(t:cleric or t:rogue or t:warrior or t:wizard)');
    remaining = remaining.replace(/\bparty\s+tribal\b/gi, '').trim();
  }

  if (/\bsacrifice\b/i.test(remaining) && /\blands?\b/i.test(remaining)) {
    ir.oracle.push('o:sacrifice');
    ir.oracle.push('o:land');
    ir.excludedTypes.push('land');
    ir.types = ir.types.filter((type) => type !== 'land');
    remaining = remaining.replace(/\bsacrifice\b/gi, '').trim();
    remaining = remaining.replace(/\blands?\b/gi, '').trim();
  }

  if (
    /\blands?\b/i.test(remaining) &&
    /\b(?:produce|add|tap for)\s+any\s+color(?:\s+of\s+mana)?\b/i.test(remaining)
  ) {
    if (!ir.types.includes('land')) {
      ir.types.push('land');
    }
    ir.oracle.push('o:"add"');
    ir.oracle.push('o:"any color"');
    remaining = remaining
      .replace(/\b(?:produce|add|tap for)\s+any\s+color(?:\s+of\s+mana)?\b/gi, '')
      .replace(/\blands?\b/gi, '')
      .trim();
  }

  if (
    /\bactivated ability\b/i.test(remaining) &&
    /\bdoes not cost mana\b/i.test(remaining)
  ) {
    ir.oracle.push('o:":"');
    ir.oracle.push('-o:/\\{[WUBRG0-9XSC]\\}:/');
    remaining = remaining.replace(/\bactivated ability\b/gi, '').trim();
    remaining = remaining.replace(/\bdoes not cost mana\b/gi, '').trim();
  }

  // "search for lands" / "searches your library for a land"
  if (/\bsearch(?:es?)?\s+(?:for\s+|your\s+library\s+for\s+)?(?:a\s+)?lands?\b/i.test(remaining)) {
    ir.oracle.push('o:"search your library"');
    ir.oracle.push('o:"land"');
    remaining = remaining
      .replace(/\bsearch(?:es?)?\s+(?:for\s+|your\s+library\s+for\s+)?(?:a\s+)?lands?\b/gi, '')
      .trim();
  }

  // "tribal payoffs" / "tribal synergies" for a specific creature type
  const tribalPayoffMatch = remaining.match(
    /\b(\w+)\s+tribal\s+(?:payoffs?|synerg(?:y|ies)|lords?|rewards?)\b/i,
  );
  if (tribalPayoffMatch) {
    const tribe = tribalPayoffMatch[1].toLowerCase().replace(/s$/, '');
    ir.oracle.push(`(o:"${tribe}" o:"you control" or o:"${tribe}" o:"+1/+1")`);
    ir.types.push(tribe);
    remaining = remaining.replace(tribalPayoffMatch[0], '').trim();
  }

  // "when an opponent [action]" + token creation context
  if (
    /\bwhen(?:ever)?\s+(?:an?\s+)?opponents?\s+(?:takes?\s+an\s+action|does\s+something|casts?|attacks?|plays?)\b/i.test(remaining)
  ) {
    ir.oracle.push('o:"whenever"');
    ir.oracle.push('o:"opponent"');
    remaining = remaining
      .replace(/\bwhen(?:ever)?\s+(?:an?\s+)?opponents?\s+(?:takes?\s+an\s+action|does\s+something|casts?|attacks?|plays?)\b/gi, '')
      .trim();
  }

  // "make/create token creatures" or "that make tokens"
  if (/\b(?:make|create|generates?)\s+tokens?\s*(?:creatures?)?\b/i.test(remaining)) {
    ir.oracle.push('o:"create"');
    ir.oracle.push('o:"token"');
    remaining = remaining
      .replace(/\b(?:make|create|generates?)\s+tokens?\s*(?:creatures?)?\b/gi, '')
      .trim();
  }

  // "return creatures from graveyard" / "bring back from graveyard" / "return from graveyard to battlefield"
  if (
    /\b(?:return|bring\s+back|reanimate|revive)\b/i.test(remaining) &&
    /\bgraveyard\b/i.test(remaining)
  ) {
    ir.oracle.push('o:"return" o:"graveyard" o:"battlefield"');
    remaining = remaining
      .replace(/\b(?:return|bring\s+back|reanimate|revive)\s+(?:\w+\s+)*?(?:from\s+)?(?:the\s+)?graveyard(?:\s+to\s+(?:the\s+)?battlefield)?\b/gi, '')
      .replace(/\bgraveyard\b/gi, '')
      .trim();
  }

  // "copy spells" / "that copy" patterns
  if (/\bcopy\s+(?:instant|sorcery|spells?)\b/i.test(remaining)) {
    ir.oracle.push('o:"copy" (o:"instant" or o:"sorcery" or o:"spell")');
    remaining = remaining.replace(/\bcopy\s+(?:instant|sorcery|spells?)\b/gi, '').trim();
  }

  // "reduce spell costs" / "cost reduction"
  if (/\b(?:reduce|lower)\s+(?:spell\s+)?costs?\b/i.test(remaining) || /\bcost\s+reduct(?:ion|er)s?\b/i.test(remaining)) {
    ir.oracle.push('o:"costs" o:"less"');
    remaining = remaining
      .replace(/\b(?:reduce|lower)\s+(?:spell\s+)?costs?\b/gi, '')
      .replace(/\bcost\s+reduct(?:ion|er)s?\b/gi, '')
      .trim();
  }

  // "prevent attacks" / "tax attackers"
  if (/\bprevent\s+attacks?\b/i.test(remaining) || /\btax\s+attackers?\b/i.test(remaining)) {
    ir.oracle.push('(o:"can\'t attack" or o:"costs" o:"more to attack")');
    remaining = remaining
      .replace(/\bprevent\s+attacks?\b/gi, '')
      .replace(/\btax\s+attackers?\b/gi, '')
      .trim();
  }

  return remaining;
}

export function parseManaProduction(query: string, ir: SearchIR): string {
  let remaining = query;

  const producesTwoMana =
    /\b(produce|produces|produced|add|adds)\s*(?:2|two)\s+mana\b/i.test(
      remaining,
    );
  if (producesTwoMana) {
    ir.oracle.push('(o:"add {c}{c}" or o:/add \\{[WUBRGC]\\}\\{[WUBRGC]\\}/)');
    remaining = remaining
      .replace(
        /\b(produce|produces|produced|add|adds)\s*(?:2|two)\s+mana\b/gi,
        '',
      )
      .trim();
  }

  const landInOrGroup = ir.specials.some(
    (s) => s.includes('t:land') && s.includes(' or '),
  );

  const hasLandIntent =
    ir.types.includes('land') || /\blands?\b/i.test(remaining) || landInOrGroup;

  if (
    producesTwoMana &&
    !hasLandIntent &&
    !landInOrGroup &&
    !ir.excludedTypes.includes('land')
  ) {
    ir.excludedTypes.push('land');
  }

  return remaining;
}
