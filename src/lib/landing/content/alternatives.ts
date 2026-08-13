/**
 * /alternatives/:card — the family that best demonstrates the difference
 * between literal similarity and searching by *why* a player wants a
 * replacement.
 */

import type { LandingPageConfig } from '../types';

export const ALTERNATIVE_PAGES: LandingPageConfig[] = [
  {
    path: '/alternatives/rhystic-study',
    family: 'alternatives',
    indexable: true,
    indexTrail: ['ALTERNATIVES', 'RHYSTIC STUDY'],
    title: 'Cards like Rhystic Study — alternatives by what you need',
    description:
      'Alternatives to Rhystic Study sorted by reason: cheaper to buy, lower mana value, less threatening, outside blue, or the same play pattern.',
    headline: 'LOOKING FOR',
    headlineEmphasis: 'something like Rhystic Study?',
    lede: 'Choose what you actually need. "Similar card" is rarely the real question.',
    searchQuery: 'repeatable card draw that taxes opponents',
    intentPathsTitle: 'Why are you replacing it?',
    intentPaths: [
      {
        label: 'Cheaper to buy',
        description: 'Same job, smaller price tag.',
        query: 'budget alternatives to Rhystic Study',
      },
      {
        label: 'Lower mana value',
        description: 'Fits an earlier turn.',
        query: 'card advantage like Rhystic Study for 2 mana',
      },
      {
        label: 'Less threatening',
        description: 'Draws fewer answers at the table.',
        query: 'repeatable blue card draw that attracts less attention',
      },
      {
        label: 'Not blue',
        description: 'Wrong colour identity.',
        query: 'repeatable card advantage outside blue',
      },
      {
        label: 'Same play pattern',
        description: 'Punish opponents for acting.',
        query: 'draw cards when opponents take game actions',
      },
    ],
    representativeQuery: 't:enchantment c:u o:"draw a card" o:"unless"',
    explanation: {
      title: 'About / Rhystic Study alternatives',
      paragraphs: [
        'Rhystic Study is not simply a draw enchantment. It taxes every spell an opponent casts, which means the replacements people actually want depend on which half of the card they were relying on: the card advantage or the tax.',
        'A conventional "similar cards" list flattens that distinction. Starting from the reason for the swap — price, mana value, colour identity, table politics — produces a genuinely different and more useful set of results.',
      ],
    },
    relatedSearches: [
      'enchantments that draw when opponents cast spells',
      'tax effects that slow down the whole table',
      'blue card draw under $5 for commander',
    ],
    relatedPages: [
      { label: 'Cards like Smothering Tithe', href: '/alternatives/smothering-tithe' },
      { label: 'Commander card draw', href: '/commander/card-draw' },
      { label: 'All card draw', href: '/mtg/card-draw' },
    ],
    breadcrumbLabel: 'Rhystic Study',
  },
  {
    path: '/alternatives/smothering-tithe',
    family: 'alternatives',
    indexable: true,
    indexTrail: ['ALTERNATIVES', 'SMOTHERING TITHE'],
    title: 'Cards like Smothering Tithe — alternatives by what you need',
    description:
      'Alternatives to Smothering Tithe by reason: cheaper price, lower mana value, non-white options, or other ways to turn opponents’ draws into mana.',
    headline: 'LOOKING FOR',
    headlineEmphasis: 'something like Smothering Tithe?',
    lede: 'Ramp, tax, or Treasure generation — the replacement depends on which part you needed.',
    searchQuery: 'permanents that make treasure when opponents draw',
    intentPathsTitle: 'Why are you replacing it?',
    intentPaths: [
      {
        label: 'Cheaper to buy',
        description: 'The effect without the price.',
        query: 'budget alternatives to Smothering Tithe',
      },
      {
        label: 'Lower mana value',
        description: 'Something you can cast earlier.',
        query: 'cheap enchantments that generate treasure each turn',
      },
      {
        label: 'Not white',
        description: 'Wrong colour identity.',
        query: 'repeatable treasure generation outside white',
      },
      {
        label: 'Pure ramp',
        description: 'You only wanted the mana.',
        query: 'repeatable mana generation in white',
      },
      {
        label: 'Pure tax',
        description: 'You wanted to slow the table.',
        query: 'tax opponents whenever they draw cards',
      },
    ],
    representativeQuery: 'o:"treasure token" (t:enchantment or t:artifact) f:commander',
    explanation: {
      title: 'About / Smothering Tithe alternatives',
      paragraphs: [
        'Smothering Tithe converts an opponent’s card draw into your mana. Decks play it as ramp, as a tax, or as a Treasure engine for artifact payoffs — three different reasons that lead to three different replacement lists.',
        'Deciding which of those roles you are filling is much more informative than a similarity ranking.',
      ],
    },
    relatedSearches: [
      'treasure payoffs for commander',
      'white ramp enchantments',
      'punish opponents for drawing extra cards',
    ],
    relatedPages: [
      { label: 'Cards like Rhystic Study', href: '/alternatives/rhystic-study' },
      { label: 'Commander ramp', href: '/commander/ramp' },
      { label: 'Treasure hate', href: '/mtg/treasure-hate' },
    ],
    breadcrumbLabel: 'Smothering Tithe',
  },
  {
    path: '/alternatives/cyclonic-rift',
    family: 'alternatives',
    indexable: true,
    indexTrail: ['ALTERNATIVES', 'CYCLONIC RIFT'],
    title: 'Cards like Cyclonic Rift — one-sided bounce alternatives',
    description:
      'Alternatives to Cyclonic Rift by reason: budget one-sided bounce, cheaper mana value, non-blue resets, and permanent answers instead of tempo.',
    headline: 'LOOKING FOR',
    headlineEmphasis: 'something like Cyclonic Rift?',
    lede: 'A one-sided reset, a finisher enabler or an instant-speed answer — which one were you using?',
    searchQuery: 'one sided bounce spells for commander',
    intentPathsTitle: 'Why are you replacing it?',
    intentPaths: [
      {
        label: 'Cheaper to buy',
        description: 'Same shape, lower price.',
        query: 'budget one sided board bounce',
      },
      {
        label: 'Lower mana value',
        description: 'You cannot afford seven mana.',
        query: 'cheap instants that return multiple permanents to hand',
      },
      {
        label: 'Not blue',
        description: 'Different colour identity.',
        query: 'one sided mass removal outside blue',
      },
      {
        label: 'Permanent answer',
        description: 'Destroy instead of delay.',
        query: 'one sided board wipes that destroy permanents',
      },
      {
        label: 'Protection use',
        description: 'You used it to save your own board.',
        query: 'return my own permanents to hand at instant speed',
      },
    ],
    representativeQuery: 'c:u o:"return" o:"to their owners\' hands" t:instant',
    explanation: {
      title: 'About / Cyclonic Rift alternatives',
      paragraphs: [
        'Cyclonic Rift is played as a finisher enabler far more often than as removal. If you were using it to clear blockers for lethal, the replacement is a different card than if you were using it to answer a board you could not otherwise beat.',
        'Bounce also only delays: naming whether you need a permanent answer changes the result list substantially.',
      ],
    },
    relatedSearches: [
      'instant speed mass bounce',
      'one sided sweepers in blue',
      'cheap ways to clear blockers for lethal',
    ],
    relatedPages: [
      { label: 'Commander board wipes', href: '/commander/board-wipes' },
      { label: 'All board wipes', href: '/mtg/board-wipes' },
      { label: 'Removal', href: '/mtg/removal' },
    ],
    breadcrumbLabel: 'Cyclonic Rift',
  },
  {
    path: '/alternatives/demonic-tutor',
    family: 'alternatives',
    indexable: true,
    indexTrail: ['ALTERNATIVES', 'DEMONIC TUTOR'],
    title: 'Cards like Demonic Tutor — unconditional tutor alternatives',
    description:
      'Alternatives to Demonic Tutor by reason: budget unconditional tutors, instant speed, colour alternatives, and tutors that keep card parity.',
    headline: 'LOOKING FOR',
    headlineEmphasis: 'something like Demonic Tutor?',
    lede: 'Two mana, any card, straight to hand. Decide which of those three you can give up.',
    searchQuery: 'budget tutors that find any card',
    intentPathsTitle: 'Why are you replacing it?',
    intentPaths: [
      {
        label: 'Cheaper to buy',
        description: 'Consistency on a budget.',
        query: 'budget unconditional tutors under $5',
      },
      {
        label: 'Instant speed',
        description: 'Hold it up instead.',
        query: 'instant speed tutors that find any card',
      },
      {
        label: 'Not black',
        description: 'Different colour identity.',
        query: 'tutors outside black that find any card',
      },
      {
        label: 'Keep card parity',
        description: 'Tutor without losing a card.',
        query: 'tutors that put the card onto the battlefield',
      },
      {
        label: 'Narrower is fine',
        description: 'Type-restricted but cheaper.',
        query: 'cheap tutors that find a specific card type',
      },
    ],
    representativeQuery: 'o:"search your library for a card" o:"into your hand" f:commander',
    explanation: {
      title: 'About / Demonic Tutor alternatives',
      paragraphs: [
        'Unconditional tutoring is priced by mana, card economy and speed. Almost every replacement gives up exactly one of those, so the useful search names which one you are willing to lose.',
        'Type-restricted tutors are frequently the better swap in a focused deck, even though a similarity ranking would place them further away.',
      ],
    },
    relatedSearches: [
      'tutors that cost two mana',
      'tutors that find creatures onto the battlefield',
      'tutors that do not lose card advantage',
    ],
    relatedPages: [
      { label: 'All tutors', href: '/mtg/tutors' },
      { label: 'Commander card draw', href: '/commander/card-draw' },
      { label: 'Recursion', href: '/mtg/recursion' },
    ],
    breadcrumbLabel: 'Demonic Tutor',
  },
  {
    path: '/alternatives/dockside-extortionist',
    family: 'alternatives',
    indexable: true,
    indexTrail: ['ALTERNATIVES', 'DOCKSIDE EXTORTIONIST'],
    title: 'Cards like Dockside Extortionist — burst mana alternatives',
    description:
      'Alternatives to Dockside Extortionist by reason: budget burst mana, red Treasure creatures, non-red options and repeatable acceleration.',
    headline: 'LOOKING FOR',
    headlineEmphasis: 'something like Dockside?',
    lede: 'Explosive mana off an opponent’s board. Say which part of that you actually need.',
    searchQuery: 'creatures that create treasure when they enter',
    intentPathsTitle: 'Why are you replacing it?',
    intentPaths: [
      {
        label: 'Cheaper to buy',
        description: 'Burst mana without the price.',
        query: 'budget creatures that make treasure tokens',
      },
      {
        label: 'Burst mana',
        description: 'You just wanted the explosive turn.',
        query: 'cheap rituals that add several mana',
      },
      {
        label: 'Not red',
        description: 'Different colour identity.',
        query: 'treasure generation outside red',
      },
      {
        label: 'Repeatable',
        description: 'Mana every turn instead of once.',
        query: 'creatures that create treasure every turn',
      },
      {
        label: 'Blink payoff',
        description: 'You were re-using the trigger.',
        query: 'enter the battlefield triggers that create mana',
      },
    ],
    representativeQuery: 't:creature o:"treasure token" f:commander',
    explanation: {
      title: 'About / Dockside Extortionist alternatives',
      paragraphs: [
        'Dockside is a one-card ritual whose size depends on the table. Decks use it for storm turns, for blink loops, or simply as fast mana — three different needs with three different substitutes.',
        'Because no other card reproduces all of it, this is a case where searching by the job produces better answers than searching for similarity.',
      ],
    },
    relatedSearches: [
      'creatures that ramp when they enter',
      'treasure creatures for commander',
      'burst mana for storm turns',
    ],
    relatedPages: [
      { label: 'Red ramp', href: '/mtg/red/ramp' },
      { label: 'Commander ramp', href: '/commander/ramp' },
      { label: 'Treasure hate', href: '/mtg/treasure-hate' },
    ],
    breadcrumbLabel: 'Dockside Extortionist',
  },
];
