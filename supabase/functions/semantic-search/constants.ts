/**
 * Valid Scryfall search keys (without operators) for validation.
 * This allowlist is used to detect potentially invalid/unknown search keys.
 *
 * Extracted from scryfall.ts to avoid circular dependencies and improve testability.
 * @see https://scryfall.com/docs/syntax for official documentation
 */
export const VALID_SEARCH_KEYS = new Set([
  // ─────────────────────────────────────────────────────────────────────────────
  // Core color/identity
  // Filter cards by color (c:) or color identity for Commander (id:/ci:)
  // Examples: c:red, c:uw (white and blue), id:golgari, ci<=boros
  // ─────────────────────────────────────────────────────────────────────────────
  'c',
  'color',
  'id',
  'identity',
  'ci',
  'commander',

  // ─────────────────────────────────────────────────────────────────────────────
  // Type/oracle
  // Filter by card type line (t:) or oracle/rules text (o:/fo:)
  // Examples: t:creature, t:"legendary artifact", o:flying, fo:draw
  // fo: searches full oracle text including reminder text
  // ─────────────────────────────────────────────────────────────────────────────
  't',
  'type',
  'o',
  'oracle',
  'fo',

  // ─────────────────────────────────────────────────────────────────────────────
  // Mana/stats
  // Filter by mana cost (m:), mana value/CMC, power/toughness, loyalty
  // Examples: m:{2}{W}{W}, cmc=3, mv>=5, pow>5, tou<=2, loyalty=4
  // pt: combined power/toughness, produces: colors the card can produce
  // ─────────────────────────────────────────────────────────────────────────────
  'm',
  'mana',
  'cmc',
  'mv',
  'manavalue',
  'power',
  'pow',
  'toughness',
  'tou',
  'pt',
  'loyalty',
  'loy',
  'produces',
  'devotion',

  // ─────────────────────────────────────────────────────────────────────────────
  // Set/edition
  // Filter by set code (e:/s:), block, or collector number
  // Examples: e:mh2, set:dominaria, b:innistrad, cn:42
  // ─────────────────────────────────────────────────────────────────────────────
  'e',
  'set',
  's',
  'edition',
  'b',
  'block',
  'cn',
  'number',
  'collector',

  // ─────────────────────────────────────────────────────────────────────────────
  // Rarity
  // Filter by card rarity: common, uncommon, rare, mythic, special, bonus
  // Examples: r:rare, r>=uncommon, rarity:mythic
  // ─────────────────────────────────────────────────────────────────────────────
  'r',
  'rarity',

  // ─────────────────────────────────────────────────────────────────────────────
  // Formats & legality
  // Filter by format legality status
  // Examples: f:modern, format:commander, legal:vintage, banned:legacy
  // ─────────────────────────────────────────────────────────────────────────────
  'f',
  'format',
  'legal',
  'banned',
  'restricted',

  // ─────────────────────────────────────────────────────────────────────────────
  // Boolean/Logic helpers
  // Check card properties (is:), exclude properties (not:), check features (has:)
  // Examples: is:commander, is:reserved, not:reprint, has:foil, in:paper
  // ─────────────────────────────────────────────────────────────────────────────
  'is',
  'not',
  'has',
  'in',
  'include',

  // ─────────────────────────────────────────────────────────────────────────────
  // Platforms/Games
  // Filter by game availability: paper, Arena, MTGO
  // Examples: game:paper, game:arena, -game:mtgo
  // ─────────────────────────────────────────────────────────────────────────────
  'game',
  'games',
  'paper',
  'arena',
  'mtgo',

  // ─────────────────────────────────────────────────────────────────────────────
  // Art/Cosmetics
  // Filter by artist, flavor text (ft:), watermark (wm:), frame, border
  // Examples: a:"Rebecca Guay", ft:phyrexia, wm:orzhov, frame:extendedart
  // atag/arttag: filter by Scryfall's art tags
  // ─────────────────────────────────────────────────────────────────────────────
  'a',
  'art',
  'artist',
  'artists',
  'ft',
  'flavor',
  'wm',
  'watermark',
  'border',
  'frame',
  'full',
  'textless',
  'atag',
  'arttag',

  // ─────────────────────────────────────────────────────────────────────────────
  // Time/Value
  // Filter by release year/date or price in various currencies
  // Examples: year>=2020, date<2015-01-01, usd<5, eur<=10, tix>0.5
  // ─────────────────────────────────────────────────────────────────────────────
  'year',
  'date',
  'new',
  'old',
  'prints',
  'usd',
  'eur',
  'tix',
  'cheapest',

  // ─────────────────────────────────────────────────────────────────────────────
  // Language
  // Filter by card language or find cards printed in specific languages
  // Examples: lang:ja (Japanese), lang:de (German), lang:any
  // ─────────────────────────────────────────────────────────────────────────────
  'lang',
  'language',

  // ─────────────────────────────────────────────────────────────────────────────
  // Sorting/View
  // Control result ordering and display mode
  // Examples: order:usd, dir:asc, unique:prints, prefer:oldest
  // ─────────────────────────────────────────────────────────────────────────────
  'order',
  'sort',
  'dir',
  'direction',
  'unique',
  'as',
  'st',
  'prefer',
  'display',

  // ─────────────────────────────────────────────────────────────────────────────
  // Special
  // Miscellaneous filters: cube lists, exact name match, keyword abilities
  // Examples: cube:vintage, name:"Black Lotus", kw:flying, keyword:flying
  // kw: is the shorthand for keyword abilities (kw:deathtouch, kw:flying, etc.)
  // wildpair: find creatures with same combined P/T
  // ─────────────────────────────────────────────────────────────────────────────
  'cube',
  'name',
  'wildpair',
  'kw',
  'keyword',
  'keywords',

  // ─────────────────────────────────────────────────────────────────────────────
  // Oracle tags
  // Filter by Scryfall's curated oracle/function tags for card roles
  // Examples: otag:ramp, otag:removal, function:card-draw
  // @see https://scryfall.com/docs/syntax#oracle-tags
  // ─────────────────────────────────────────────────────────────────────────────
  'otag',
  'oracletag',
  'function',
]);

export const DEFAULT_OVERLY_BROAD_THRESHOLD = 1500;
