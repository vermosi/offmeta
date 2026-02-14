/**
 * Pre-built guide data for SEO landing pages.
 * Each guide targets a high-volume MTG search keyword.
 */

export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heading: string;
  subheading: string;
  intro: string;
  searchQuery: string;
  tips: string[];
  relatedGuides: string[]; // slugs
  faq: Array<{ question: string; answer: string }>;
}

export const GUIDES: Guide[] = [
  {
    slug: 'best-green-ramp-cards',
    title: 'Best Green Ramp Cards',
    metaTitle: 'Best Green Ramp Cards for MTG — Top Mana Ramp Spells',
    metaDescription:
      'Find the best green ramp cards in Magic: The Gathering. Explore top mana acceleration spells for Commander, Standard, and Modern.',
    heading: 'Best Green Ramp Cards',
    subheading: 'Top mana acceleration spells for every format',
    intro: `Green is the king of ramp in Magic: The Gathering. Whether you're powering out threats in Commander or hitting land drops in Standard, these are the cards that get you ahead on mana. From classic staples like Cultivate to hidden gems, this guide covers the best green ramp spells across all formats.`,
    searchQuery: 'green ramp spells that search for lands or add mana',
    tips: [
      'In Commander, prioritize 2-mana ramp spells like Nature\'s Lore and Three Visits for the fastest starts.',
      'Land-based ramp is generally safer than mana dorks since it survives board wipes.',
      'Consider your curve — if your commander costs 4, you want 2-mana ramp. If it costs 6+, 3-mana ramp like Cultivate is fine.',
      'Don\'t forget about colorless ramp like Sol Ring and Arcane Signet alongside your green options.',
    ],
    relatedGuides: ['budget-board-wipes', 'best-card-draw-spells', 'budget-commander-staples'],
    faq: [
      {
        question: 'How many ramp cards should I run in Commander?',
        answer:
          'Most Commander decks want 10-12 ramp sources. Green decks can go up to 14-15 if they have a high mana curve or want to cast their commander early.',
      },
      {
        question: 'Is mana dork ramp better than land ramp?',
        answer:
          'Land ramp is more resilient since it survives creature board wipes. Mana dorks are faster (turn 1 Llanowar Elves) but fragile. A mix of both is ideal.',
      },
    ],
  },
  {
    slug: 'budget-board-wipes',
    title: 'Budget Board Wipes',
    metaTitle: 'Budget Board Wipes Under $5 — Cheap MTG Mass Removal',
    metaDescription:
      'Discover affordable board wipes under $5 for Magic: The Gathering. Budget mass removal for Commander, Standard, and casual play.',
    heading: 'Budget Board Wipes Under $5',
    subheading: 'Affordable mass removal for every color',
    intro: `Board wipes are essential for keeping aggressive strategies in check, but the best ones can be expensive. This guide highlights powerful mass removal spells that won't break the bank — all under $5. Perfect for Commander players on a budget or anyone building a new deck.`,
    searchQuery: 'board wipes under $5',
    tips: [
      'White has the most board wipe options: Wrath of God variants, Farewell, and Day of Judgment are all affordable.',
      'Black board wipes often hit creatures with specific conditions — Toxic Deluge is pricier but Massacre Wurm and Crux of Fate are budget-friendly.',
      'Red can use damage-based wipes like Blasphemous Act (often costs just 1 red mana) and Chain Reaction.',
      'Don\'t overlook one-sided wipes — cards that destroy only your opponents\' creatures are premium even at budget prices.',
    ],
    relatedGuides: ['best-green-ramp-cards', 'budget-commander-staples', 'best-card-draw-spells'],
    faq: [
      {
        question: 'How many board wipes should I run in Commander?',
        answer:
          'Most Commander decks want 3-5 board wipes. Control decks may run up to 7, while aggressive decks might run 2-3 as emergency buttons.',
      },
      {
        question: 'What is the cheapest effective board wipe?',
        answer:
          'Blasphemous Act is often under $1 and frequently costs just a single red mana in multiplayer games. It deals 13 damage to each creature, killing almost everything.',
      },
    ],
  },
  {
    slug: 'best-treasure-token-cards',
    title: 'Best Treasure Token Cards',
    metaTitle: 'Best Treasure Token Cards in MTG — Top Treasure Makers',
    metaDescription:
      'Explore the best cards that create Treasure tokens in Magic: The Gathering. Top treasure generators for Commander, Standard, and Modern.',
    heading: 'Best Treasure Token Cards',
    subheading: 'Top cards that create and synergize with Treasures',
    intro: `Treasure tokens have become one of Magic's most powerful mechanics since their introduction. They provide mana fixing, ramp, and combo potential all in one. This guide covers the best treasure-generating cards across all formats, from Commander all-stars to Standard staples.`,
    searchQuery: 'creatures that make treasure tokens',
    tips: [
      'Treasure tokens are artifact tokens, so they trigger "artifacts enter the battlefield" effects and count for metalcraft/affinity.',
      'Dockside Extortionist is the gold standard but expensive — budget alternatives include Stimulus Package and Pitiless Plunderer.',
      'Combine treasure makers with Revel in Riches for an alternate win condition in Commander.',
      'Red and Black have the most treasure support, but every color now has access to some treasure generation.',
    ],
    relatedGuides: ['best-green-ramp-cards', 'budget-commander-staples', 'best-card-draw-spells'],
    faq: [
      {
        question: 'Are Treasure tokens considered mana abilities?',
        answer:
          'Yes, sacrificing a Treasure to add mana is a mana ability. It doesn\'t use the stack and can\'t be responded to.',
      },
      {
        question: 'What colors have the best treasure support?',
        answer:
          'Red has the most treasure generators, followed by Black. Green has a few (like Old Gnawbone), and Blue/White have situational options. Multi-color cards in Rakdos and Jund colors excel at treasure strategies.',
      },
    ],
  },
  {
    slug: 'budget-commander-staples',
    title: 'Budget Commander Staples',
    metaTitle: 'Budget Commander Staples Under $3 — Cheap EDH Must-Haves',
    metaDescription:
      'The best budget Commander staples under $3. Essential cheap cards every EDH deck should consider running.',
    heading: 'Budget Commander Staples Under $3',
    subheading: 'Essential cards for every EDH deck on a budget',
    intro: `Building a competitive Commander deck doesn't require spending hundreds. Some of the format's best cards cost pocket change. This guide covers the must-have staples under $3 that punch well above their price — cards that belong in almost every EDH deck regardless of strategy.`,
    searchQuery: 'commander staples under $3',
    tips: [
      'Sol Ring is the #1 Commander staple and often included in precons — check your collection before buying one.',
      'Signets and Talismans are the backbone of multicolor mana bases and rarely cost more than $1.',
      'Swords to Plowshares, Path to Exile, and Chaos Warp are premium removal at budget prices.',
      'Command Tower is an auto-include in every multicolor deck and costs under $1.',
    ],
    relatedGuides: ['budget-board-wipes', 'best-green-ramp-cards', 'best-card-draw-spells'],
    faq: [
      {
        question: 'What are the most important cards for a new Commander player?',
        answer:
          'Focus on mana rocks (Sol Ring, Arcane Signet), removal (Swords to Plowshares, Beast Within), card draw (Rhystic Study alternatives like Mystic Remora), and board wipes. These form the backbone of any deck.',
      },
      {
        question: 'How can I build a competitive Commander deck on a budget?',
        answer:
          'Start with a precon and upgrade gradually. Focus on efficient staples under $3, choose a commander that doesn\'t need expensive support cards, and prioritize your mana base with budget lands like pain lands and check lands.',
      },
    ],
  },
  {
    slug: 'best-card-draw-spells',
    title: 'Best Card Draw Spells',
    metaTitle: 'Best Card Draw Spells in MTG — Top Draw Engines',
    metaDescription:
      'Find the best card draw spells in Magic: The Gathering. Powerful draw engines for Commander, Standard, Modern, and every format.',
    heading: 'Best Card Draw Spells',
    subheading: 'Top draw engines and card advantage spells',
    intro: `Card draw wins games. The player who sees more cards has more options, more answers, and more threats. This guide covers the best card draw spells across all colors and formats — from blue staples everyone knows to underrated draw engines in unexpected colors.`,
    searchQuery: 'best card draw spells',
    tips: [
      'Blue has the deepest card draw pool, but every color has strong options: Black draws with life payment, Green draws based on creature power, White has "catch-up" draw.',
      'Repeatable draw engines (Phyrexian Arena, Sylvan Library) provide more long-term value than one-shot spells.',
      'In Commander, consider "wheels" (Windfall, Wheel of Fortune) — they draw 7 cards and can disrupt opponents.',
      'Cantrips (1-mana draw spells like Ponder, Preordain) are crucial in 60-card formats for consistency.',
    ],
    relatedGuides: ['best-green-ramp-cards', 'budget-board-wipes', 'budget-commander-staples'],
    faq: [
      {
        question: 'How many card draw sources should I run?',
        answer:
          'In Commander, aim for 8-12 card draw sources. In 60-card formats, cantrips and 2-4 dedicated draw spells are typical. The exact number depends on your deck\'s strategy and speed.',
      },
      {
        question: 'What is the best card draw spell in Commander?',
        answer:
          'Rhystic Study is widely considered the best blue card draw in Commander, potentially drawing you dozens of cards per game. For non-blue, Sylvan Library (green) and Necropotence (black) are top choices.',
      },
    ],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
