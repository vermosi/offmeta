/**
 * Pre-built guide data for SEO landing pages.
 * 10 guides ordered from basic → complex, based on real search patterns
 * from the golden translation test suite. Each guide teaches users
 * how to search on OffMeta with increasing sophistication.
 */

export interface Guide {
  slug: string;
  /** Display order (1 = simplest, 10 = most complex) */
  level: number;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heading: string;
  subheading: string;
  intro: string;
  /** The natural-language query the user would type into OffMeta */
  searchQuery: string;
  /** What OffMeta translates it into (Scryfall syntax) */
  translatedQuery: string;
  /** Step-by-step explanation of HOW OffMeta handled the query */
  howOffmetaHelps: string;
  tips: string[];
  relatedGuides: string[]; // slugs
  faq: Array<{ question: string; answer: string }>;
}

export const GUIDES: Guide[] = [
  // ───────── LEVEL 1: Simple Type Search ─────────
  {
    slug: 'search-by-creature-type',
    level: 1,
    title: 'Search by Creature Type',
    metaTitle: 'How to Search by Creature Type — OffMeta MTG Guide',
    metaDescription:
      'Learn the simplest way to find MTG cards by creature type. Just type "dragons" or "elves" and OffMeta translates it for you.',
    heading: 'Search by Creature Type',
    subheading: 'The easiest way to start — just name a tribe',
    intro: `The simplest search you can do on OffMeta is typing a creature type. Want Dragons? Just type "dragons." Looking for Elves? Type "elves." OffMeta understands plural forms, common nicknames, and tribal slang — no special syntax needed. This is the perfect starting point for anyone new to MTG card search.`,
    searchQuery: 'dragons',
    translatedQuery: 't:dragon',
    howOffmetaHelps: `When you type "dragons," OffMeta recognizes it as a creature type search. It automatically converts your plain English into Scryfall's type filter syntax (t:dragon), handling the plural-to-singular conversion. You don't need to know that Scryfall uses "t:" for type searches — OffMeta figures that out for you.`,
    tips: [
      'You can type the plural ("goblins") or singular ("goblin") — both work.',
      'Try less common types too: Changelings, Slivers, Treefolk, Faeries.',
      'Combine with other words naturally: "legendary dragons" finds legendary dragon creatures.',
      'OffMeta knows MTG slang: "changelings" maps to the Changeling type.',
    ],
    relatedGuides: ['filter-by-color', 'tribal-synergies-for-commander'],
    faq: [
      {
        question: 'What creature types does OffMeta recognize?',
        answer:
          'OffMeta recognizes all official MTG creature types — over 270 of them. From common ones like Human, Elf, and Dragon to obscure ones like Brushwagg, Beeble, and Azra.',
      },
      {
        question: 'Can I search for non-creature types?',
        answer:
          'Absolutely! Try "equipment," "auras," "planeswalkers," or "enchantments." OffMeta handles all card types, not just creatures.',
      },
    ],
  },

  // ───────── LEVEL 2: Color Filtering ─────────
  {
    slug: 'filter-by-color',
    level: 2,
    title: 'Filter by Color',
    metaTitle: 'How to Filter MTG Cards by Color — OffMeta Guide',
    metaDescription:
      'Search for mono-color, multicolor, or color identity cards in Magic: The Gathering with natural language on OffMeta.',
    heading: 'Filter by Color',
    subheading: 'Mono-color, guild pairs, and color identity explained',
    intro: `Color is fundamental to Magic deckbuilding. OffMeta lets you filter by color using everyday language — say "red creatures," "mono blue spells," or even guild names like "Simic" or "Rakdos." You can also specify color identity for Commander, where it matters most.`,
    searchQuery: 'mono red creatures',
    translatedQuery: 'id=r t:creature',
    howOffmetaHelps: `OffMeta interprets "mono red" as a color identity constraint (id=r), not just color. This is important because color identity determines what cards you can play in Commander. It also maps "creatures" to the type filter (t:creature) and combines them. Guild names like "Dimir" are mapped to their color pairs (U+B) automatically.`,
    tips: [
      'Use guild names for two-color combos: Azorius (W/U), Dimir (U/B), Rakdos (B/R), Gruul (R/G), Selesnya (G/W).',
      'Use shard/wedge names for three colors: Esper, Grixis, Jund, Naya, Bant, Abzan, Jeskai, Sultai, Mardu, Temur.',
      '"Colorless" works too — try "colorless artifacts" to find cards with no color identity.',
      'Saying "mono green" restricts to ONLY green, while "green" allows multicolor cards containing green.',
    ],
    relatedGuides: ['search-by-creature-type', 'budget-price-filters'],
    faq: [
      {
        question: 'What is the difference between color and color identity?',
        answer:
          'Color is what appears in the mana cost. Color identity includes the mana cost PLUS any mana symbols in the rules text. In Commander, you can only include cards whose color identity is within your commander\'s color identity.',
      },
      {
        question: 'How do I search for exactly two colors?',
        answer:
          'Use the guild name: "Izzet creatures" finds creatures that are exactly blue and red. Or say "blue red creatures" — OffMeta will figure out the correct identity filter.',
      },
    ],
  },

  // ───────── LEVEL 3: Price & Budget Filtering ─────────
  {
    slug: 'budget-price-filters',
    level: 3,
    title: 'Budget & Price Filters',
    metaTitle: 'How to Find Budget MTG Cards — Price Filter Guide',
    metaDescription:
      'Find affordable Magic cards with price filters. Search for budget board wipes, cheap staples, and cards under any price point.',
    heading: 'Budget & Price Filters',
    subheading: 'Find affordable cards at any price point',
    intro: `Building on a budget? OffMeta understands price-related language like "cheap," "budget," "under $5," and "affordable." You can combine price filters with any other search to find exactly what you need without breaking the bank. This is one of OffMeta's most popular features for Commander players.`,
    searchQuery: 'budget board wipes under $5',
    translatedQuery: 'otag:board-wipe usd<5',
    howOffmetaHelps: `OffMeta does three things here: (1) it understands "budget" and "under $5" both refer to price and picks the more specific one ($5), (2) it translates "board wipes" into Scryfall's tag system (otag:board-wipe) which is more accurate than searching oracle text, and (3) it applies the price filter (usd<5). The result is a precise, efficient query.`,
    tips: [
      '"Cheap" defaults to under $1, "budget" to under $5 — but you can say "under $3" for any custom threshold.',
      'Price filters use current TCGplayer market prices via Scryfall.',
      'Try "expensive mythics over $50" to browse the high end too.',
      'Combine with format: "budget commander staples under $3" is a very popular search.',
    ],
    relatedGuides: ['filter-by-color', 'format-legality-search'],
    faq: [
      {
        question: 'How current are the prices?',
        answer:
          'Scryfall updates prices daily from TCGplayer. Prices reflect the most recent market data available, though they may lag actual prices by a few hours.',
      },
      {
        question: 'Can I search in other currencies?',
        answer:
          'Currently OffMeta uses USD pricing from Scryfall. Euro pricing (eur<) is available via Scryfall syntax, which you can use in the editable query bar.',
      },
    ],
  },

  // ───────── LEVEL 4: Format Legality ─────────
  {
    slug: 'format-legality-search',
    level: 4,
    title: 'Format Legality Search',
    metaTitle: 'Search MTG Cards by Format Legality — OffMeta Guide',
    metaDescription:
      'Find cards legal in Commander, Standard, Modern, Pioneer, Pauper, and more. OffMeta makes format-legal searches effortless.',
    heading: 'Format Legality Search',
    subheading: 'Find cards legal in any MTG format',
    intro: `Different formats have different card pools. OffMeta understands format names and legality constraints — just mention the format in your search and it's applied automatically. Say "pauper legal removal" or "modern counterspells" and OffMeta filters to only cards legal in that format.`,
    searchQuery: 'commander staples under $3',
    translatedQuery: 'f:commander usd<3',
    howOffmetaHelps: `OffMeta recognizes "commander" as a format (even if you say "EDH" or "CMDR" — it knows the aliases). It applies the format legality filter (f:commander) and combines it with the price constraint. The word "staples" signals high-utility cards, which OffMeta can sort by EDHREC rank for the most relevant results.`,
    tips: [
      'OffMeta knows format aliases: "EDH" = "CMDR" = "Commander," "T2" = "Standard."',
      'Combine formats with anything: "pauper legal draw spells," "modern-legal fetchlands."',
      'For Commander, color identity matters more than color — OffMeta handles this automatically.',
      'Try "standard legal mythics" or "pioneer legal planeswalkers" for format-specific browsing.',
    ],
    relatedGuides: ['budget-price-filters', 'keyword-ability-search'],
    faq: [
      {
        question: 'Which formats does OffMeta support?',
        answer:
          'All formats Scryfall tracks: Standard, Pioneer, Modern, Legacy, Vintage, Pauper, Commander, Brawl, Historic, Alchemy, Explorer, and more. Just mention the format name.',
      },
      {
        question: 'Can I search for banned cards?',
        answer:
          'Yes — try "banned in commander" or "banned in modern" to see cards that are banned in specific formats.',
      },
    ],
  },

  // ───────── LEVEL 5: Keyword Abilities ─────────
  {
    slug: 'keyword-ability-search',
    level: 5,
    title: 'Keyword Ability Search',
    metaTitle: 'Search MTG Cards by Keyword Abilities — OffMeta Guide',
    metaDescription:
      'Find cards with flying, deathtouch, haste, and any keyword ability. Combine multiple keywords for precise MTG searches.',
    heading: 'Keyword Ability Search',
    subheading: 'Find cards with specific mechanics and keywords',
    intro: `Magic has over 100 keyword abilities, from evergreen staples like Flying and Haste to set-specific mechanics like Connive and Offspring. OffMeta maps these to Scryfall's dedicated keyword operator for precise results — much better than searching oracle text, which can produce false positives.`,
    searchQuery: 'creatures with flying and deathtouch',
    translatedQuery: 't:creature kw:flying kw:deathtouch',
    howOffmetaHelps: `Instead of searching oracle text for the word "flying" (which would also match "flying carpet" or "birds that aren't flying"), OffMeta uses Scryfall's kw: operator. This searches the actual keyword abilities a card has, giving precise results. It also knows that "deathtouch" and "flying" are separate keywords and applies them as AND filters.`,
    tips: [
      'OffMeta knows 80+ keyword abilities: haste, trample, lifelink, vigilance, menace, flash, hexproof, and many more.',
      'Combine keywords: "creatures with haste and trample" finds creatures that have both.',
      'Some keywords need oracle text search: "goad" and "annihilator" use o: instead of kw: for accuracy.',
      'Try "evasion creatures" as a shortcut — OffMeta expands it to flying, menace, skulk, shadow, and more.',
    ],
    relatedGuides: ['format-legality-search', 'ramp-and-card-draw'],
    faq: [
      {
        question: 'What is the difference between kw: and searching oracle text?',
        answer:
          'The kw: operator checks a card\'s actual keyword abilities, not just text. Searching oracle text for "flying" might match cards that mention flying but don\'t have it. kw:flying only returns cards that actually have flying.',
      },
      {
        question: 'Can I search for cards that GRANT keywords to others?',
        answer:
          'Yes! Try "cards that give haste" or "haste enablers" — OffMeta searches for oracle text that grants the ability to other creatures.',
      },
    ],
  },

  // ───────── LEVEL 6: Ramp & Card Draw (Function-Based) ─────────
  {
    slug: 'ramp-and-card-draw',
    level: 6,
    title: 'Ramp & Card Draw',
    metaTitle: 'Find the Best Ramp & Card Draw in MTG — OffMeta Guide',
    metaDescription:
      'Search for ramp spells, mana dorks, card draw engines, and more. OffMeta understands MTG strategy concepts, not just card text.',
    heading: 'Ramp & Card Draw',
    subheading: 'Search by what cards DO, not what they say',
    intro: `This is where OffMeta really shines. Instead of guessing what oracle text to search, you can describe card functions: "ramp spells," "mana dorks," "card draw," "cantrips." OffMeta understands these gameplay concepts and translates them into the right combination of type, tag, and oracle text filters.`,
    searchQuery: 'green ramp spells that search for lands',
    translatedQuery: 'c:g otag:land-ramp o:"search your library" o:"basic land"',
    howOffmetaHelps: `OffMeta breaks down your intent: (1) "green" → color filter, (2) "ramp spells" → Scryfall's curated land-ramp tag, (3) "search for lands" → oracle text for library searching. It uses Scryfall's otag: system (community-curated functional tags) when available, which is more accurate than raw text search. "Mana dork" maps to otag:mana-dork, "board wipe" to otag:board-wipe.`,
    tips: [
      'MTG slang works: "rocks" = mana artifacts, "dorks" = mana creatures, "cantrips" = cheap draw spells.',
      'Try functional searches: "sacrifice outlets," "tutor effects," "reanimation spells."',
      'OffMeta uses Scryfall\'s tag system for functions like ramp, draw, removal — these are community-curated and very accurate.',
      'Combine function + constraint: "cheap card draw in mono black under $2."',
    ],
    relatedGuides: ['keyword-ability-search', 'tribal-synergies-for-commander'],
    faq: [
      {
        question: 'What is the difference between "ramp" and "mana rocks"?',
        answer:
          '"Ramp" broadly means any mana acceleration. "Mana rocks" specifically means artifacts that produce mana (Sol Ring, Arcane Signet). "Mana dorks" are creatures that tap for mana (Llanowar Elves). OffMeta translates each correctly.',
      },
      {
        question: 'How does OffMeta know what "card draw" means?',
        answer:
          'OffMeta maps strategy concepts to Scryfall tags and oracle text patterns. "Card draw" uses oracle text search for "draw" + "card," while specific terms like "cantrip" or "wheel" use their own curated mappings.',
      },
    ],
  },

  // ───────── LEVEL 7: Tribal Synergies ─────────
  {
    slug: 'tribal-synergies-for-commander',
    level: 7,
    title: 'Tribal Synergies for Commander',
    metaTitle: 'Find Tribal Synergy Cards for Commander — OffMeta Guide',
    metaDescription:
      'Build better tribal Commander decks. Search for lords, tribal payoffs, and synergies for any creature type with OffMeta.',
    heading: 'Tribal Synergies for Commander',
    subheading: 'Lords, payoffs, and synergy pieces for any tribe',
    intro: `Tribal decks are a Commander favorite, but finding the right synergy pieces can be tricky. OffMeta lets you search for tribal payoffs by combining creature types, format legality, and functional descriptions. Go beyond just finding Elves — find Elf lords, Elf token generators, and cards that care about Elf tribal.`,
    searchQuery: 'elf tribal payoffs for commander',
    translatedQuery: 't:elf f:commander (o:"elf" o:"you control" or o:"elf" o:"+1/+1")',
    howOffmetaHelps: `OffMeta understands "tribal payoffs" as a concept — cards that reward you for playing a specific type. For "elf tribal payoffs," it searches for cards that reference Elves in their rules text combined with typical tribal payoff patterns like "you control" or buff effects. Adding "for commander" applies the format filter. This multi-layer translation is something that would take manual syntax expertise to replicate.`,
    tips: [
      'Try "[type] lords" to find creatures that buff others of the same type.',
      'Search "cards that care about [type]" for tribal synergy pieces that aren\'t necessarily that type themselves.',
      'Combine tribal + function: "goblin sacrifice outlets" or "zombie reanimation."',
      'Use "changeling" to find creatures that count as every type — great tribal fillers.',
    ],
    relatedGuides: ['ramp-and-card-draw', 'token-and-sacrifice-synergies'],
    faq: [
      {
        question: 'What is a "lord" in MTG?',
        answer:
          'A lord is a creature that gives +1/+1 or other bonuses to all creatures of a certain type. Classic examples: Elvish Archdruid for Elves, Lord of the Undead for Zombies, Goblin Chieftain for Goblins.',
      },
      {
        question: 'Can I find cards that work with multiple tribes?',
        answer:
          'Yes! Try "cards that work with any creature type" or search for Changelings, which have every creature type. You can also search for "choose a creature type" effects.',
      },
    ],
  },

  // ───────── LEVEL 8: Token & Sacrifice Synergies ─────────
  {
    slug: 'token-and-sacrifice-synergies',
    level: 8,
    title: 'Token & Sacrifice Synergies',
    metaTitle: 'Find Token & Sacrifice Synergy Cards — OffMeta MTG Guide',
    metaDescription:
      'Build the perfect Aristocrats deck. Search for token generators, sacrifice outlets, death triggers, and drain effects.',
    heading: 'Token & Sacrifice Synergies',
    subheading: 'Aristocrats, death triggers, and sacrifice engines',
    intro: `Aristocrats-style decks are among the most popular archetypes in Commander. They combine token generation, free sacrifice outlets, and death triggers for powerful synergy engines. OffMeta understands the full vocabulary of this archetype — from "sac outlets" to "blood artist effects" to "death triggers."`,
    searchQuery: 'creatures that make token creatures when an opponent takes an action',
    translatedQuery: 't:creature o:"whenever" o:"opponent" o:"create" o:"token"',
    howOffmetaHelps: `This is a complex, descriptive query that would be nearly impossible with manual syntax. OffMeta breaks it down: (1) "creatures" → type filter, (2) "make token creatures" → oracle text for token creation, (3) "when an opponent takes an action" → opponent-triggered abilities. It assembles these into a multi-clause oracle text search, finding exactly the reactive token generators you're looking for.`,
    tips: [
      '"Sac outlets" or "sacrifice outlets" finds cards with free sacrifice abilities.',
      '"Blood artist effects" or "drain on death" finds the Aristocrats payoff cards.',
      '"Grave Pact effects" finds forced sacrifice triggers.',
      'Combine archetype + color: "Rakdos sacrifice outlets" or "Orzhov aristocrats."',
    ],
    relatedGuides: ['tribal-synergies-for-commander', 'etb-and-flicker-combos'],
    faq: [
      {
        question: 'What is an Aristocrats deck?',
        answer:
          'An Aristocrats deck sacrifices its own creatures for value. The core pieces are: (1) token generators for fuel, (2) free sacrifice outlets, and (3) death trigger payoffs like Blood Artist that drain opponents when creatures die.',
      },
      {
        question: 'What are the best colors for sacrifice strategies?',
        answer:
          'Black is essential for death triggers and drain effects. Red adds token generation and Goblin Bombardment effects. White has some powerful pieces too (Teysa Karlov, Elenda). Rakdos (B/R) and Mardu (W/B/R) are the most common Aristocrats color combos.',
      },
    ],
  },

  // ───────── LEVEL 9: ETB & Flicker Combos ─────────
  {
    slug: 'etb-and-flicker-combos',
    level: 9,
    title: 'ETB & Flicker Combos',
    metaTitle: 'Find ETB & Flicker Combo Cards — OffMeta MTG Guide',
    metaDescription:
      'Search for enter-the-battlefield triggers, blink effects, and ETB doublers. Build powerful flicker combo engines with OffMeta.',
    heading: 'ETB & Flicker Combos',
    subheading: 'Enter-the-battlefield triggers and blink synergies',
    intro: `ETB (enter-the-battlefield) effects are the backbone of many combo decks. Pair them with flicker/blink effects to re-trigger them endlessly, or use ETB doublers like Panharmonicon to multiply the value. OffMeta understands all of this vocabulary — "ETB," "blink," "flicker," "enters effects" — and translates them into precise searches.`,
    searchQuery: 'cards that double ETB effects',
    translatedQuery: 'o:"enters the battlefield" o:"triggers an additional time"',
    howOffmetaHelps: `This query demonstrates OffMeta's understanding of MTG mechanics. "ETB effects" is translated to "enters the battlefield" oracle text. "Double" is mapped to the precise Scryfall phrasing "triggers an additional time" — NOT the word "double" or "twice" which would give wrong results. This kind of semantic understanding is what makes OffMeta different from a simple text search.`,
    tips: [
      '"ETB creatures" finds creatures with enter-the-battlefield triggers.',
      '"Flicker effects" or "blink effects" finds exile-and-return cards.',
      '"Panharmonicon effects" or "double ETB" finds ETB doublers.',
      'Try "ETB creatures in Azorius" for the classic white-blue flicker shell.',
    ],
    relatedGuides: ['token-and-sacrifice-synergies', 'multi-constraint-complex-search'],
    faq: [
      {
        question: 'What is the difference between "blink" and "flicker"?',
        answer:
          'They\'re essentially the same thing — exiling a permanent and returning it to the battlefield to re-trigger ETB effects. "Blink" typically refers to instant-speed effects (like Ephemerate), while "flicker" is sometimes used for sorcery-speed or delayed returns.',
      },
      {
        question: 'What are the best ETB doublers?',
        answer:
          'Panharmonicon (artifacts/creatures ETB), Yarok the Desecrated (all permanents ETB), Elesh Norn, Mother of Machines (your permanents ETB), and Virtue of Loyalty. Search "double ETB effects" on OffMeta to find them all.',
      },
    ],
  },

  // ───────── LEVEL 10: Multi-Constraint Complex Query ─────────
  {
    slug: 'multi-constraint-complex-search',
    level: 10,
    title: 'Multi-Constraint Complex Search',
    metaTitle: 'Advanced MTG Search — Multi-Constraint Queries on OffMeta',
    metaDescription:
      'Master OffMeta\'s most powerful feature: multi-constraint natural language searches combining type, color, format, price, and function.',
    heading: 'Multi-Constraint Complex Search',
    subheading: 'Combine type, color, format, price, and function in one search',
    intro: `This is OffMeta at full power. You can describe exactly what you need in a single sentence — combining color identity, card type, format legality, price, function, and more. "Utility lands for commander in Esper under $5" or "Vampires with death triggers in white and black that cost 3 or less." OffMeta handles them all.`,
    searchQuery: 'utility lands for commander in esper under $5',
    translatedQuery: 't:land -t:basic id<=wub f:commander usd<5',
    howOffmetaHelps: `This query has FIVE distinct constraints, and OffMeta handles each one: (1) "utility lands" → non-basic lands (t:land -t:basic), (2) "for commander" → format legality (f:commander), (3) "in Esper" → color identity within white-blue-black (id<=wub), (4) "under $5" → price filter (usd<5). The word "utility" is interpreted as non-basic, because basic lands aren't "utility." Each concept maps to a different Scryfall operator, and OffMeta assembles them correctly.`,
    tips: [
      'Stack as many constraints as you want — OffMeta handles 5+ filters in a single query.',
      'The editable query bar lets you fine-tune the translated query if you want to adjust one filter.',
      'Complex queries are where OffMeta saves the most time vs. manual Scryfall syntax.',
      'Try: "Artifacts that produce 2 mana and cost at most four mana" or "Jeskai proliferate cards for commander."',
    ],
    relatedGuides: ['etb-and-flicker-combos', 'ramp-and-card-draw'],
    faq: [
      {
        question: 'Is there a limit to how complex my search can be?',
        answer:
          'OffMeta can handle very complex queries, but extremely long sentences may lose precision. If you find results aren\'t what you expected, try simplifying slightly or using the editable query bar to tweak the translation.',
      },
      {
        question: 'What if OffMeta translates my query wrong?',
        answer:
          'You can always edit the translated query directly in the editable query bar. You can also report issues with the feedback button — your reports help OffMeta learn and improve its translations over time.',
      },
    ],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
