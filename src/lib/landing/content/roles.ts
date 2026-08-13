/**
 * /mtg/:topic — broad evergreen card-role pages.
 * Each entry is hand-written: no combinatorial generation.
 */

import type { LandingPageConfig } from '../types';

export const ROLE_PAGES: LandingPageConfig[] = [
  {
    path: '/mtg/card-draw',
    family: 'role',
    indexable: true,
    indexTrail: ['CARD INDEX', 'CARD DRAW'],
    title: 'MTG card draw — search by the advantage you need',
    description:
      'Find MTG card draw by what it actually does: repeatable engines, burst refills, combat triggers, wheels and creature-based advantage.',
    headline: 'FIND BETTER',
    headlineEmphasis: 'card draw.',
    lede: 'Search by the kind of advantage your deck actually needs, not by the word "draw".',
    searchQuery: 'repeatable card draw for creature decks',
    intentPaths: [
      {
        label: 'Repeatable',
        description: 'Engines that keep refilling every turn.',
        query: 'card draw I can use every turn',
      },
      {
        label: 'Burst',
        description: 'Refill your hand in one shot.',
        query: 'draw several cards immediately',
      },
      {
        label: 'Combat',
        description: 'Turn aggression into cards.',
        query: 'draw cards when creatures deal combat damage',
      },
      {
        label: 'Creature-based',
        description: 'Advantage attached to a body.',
        query: 'creatures that generate card advantage',
      },
      {
        label: 'Budget',
        description: 'Cheap to buy, still does the job.',
        query: 'card draw under $2',
      },
    ],
    representativeQuery: 'o:"draw" o:"whenever" t:enchantment OR t:creature',
    explanation: {
      title: 'About / card draw',
      paragraphs: [
        'Card advantage is not one effect. A cantrip, a wheel, an impulse-draw permanent and a combat trigger all "draw cards" in casual conversation, but they solve different problems at different points in a game.',
        'That is why searching Scryfall for cards containing the word "draw" returns thousands of results that mostly do not match what you meant. Describing the job — repeatable, burst, attached to a creature, under a price ceiling — narrows it far faster than the keyword does.',
      ],
    },
    relatedSearches: [
      'draw engines that do not cost life',
      'card draw that triggers on attack',
      'colorless card draw for any commander',
    ],
    relatedPages: [
      { label: 'Red card draw', href: '/mtg/red/card-draw' },
      { label: 'White card draw', href: '/mtg/white/card-draw' },
      { label: 'Commander card draw', href: '/commander/card-draw' },
      { label: 'Tutors', href: '/mtg/tutors' },
    ],
    breadcrumbLabel: 'Card draw',
  },
  {
    path: '/mtg/ramp',
    family: 'role',
    indexable: true,
    indexTrail: ['CARD INDEX', 'RAMP'],
    title: 'MTG ramp — find the mana acceleration your deck needs',
    description:
      'Search MTG ramp by shape: mana rocks, land fetch, dorks, rituals and cost reduction. Describe the acceleration you need and see the query.',
    headline: 'ACCELERATE',
    headlineEmphasis: 'on purpose.',
    lede: 'Rocks, dorks, land fetch and cost reduction solve different problems. Pick the one your curve wants.',
    searchQuery: 'two mana rocks that fix colors',
    intentPaths: [
      {
        label: 'Mana rocks',
        description: 'Artifacts that add mana.',
        query: 'artifacts that tap for any color',
      },
      {
        label: 'Land fetch',
        description: 'Put lands onto the battlefield.',
        query: 'search your library for a land and put it onto the battlefield',
      },
      {
        label: 'Creature ramp',
        description: 'Mana attached to a body.',
        query: 'creatures that add mana',
      },
      {
        label: 'Cost reduction',
        description: 'Make your spells cheaper instead.',
        query: 'permanents that make my spells cost less',
      },
      {
        label: 'Rituals',
        description: 'One big turn, right now.',
        query: 'rituals that add a burst of mana',
      },
    ],
    representativeQuery: 't:artifact o:"add" mv<=3 -t:creature',
    explanation: {
      title: 'About / ramp',
      paragraphs: [
        'Ramp answers a question about timing: do you need mana permanently, only this turn, or in a specific colour? A two-mana rock, a land tutor and a ritual all "ramp", but only one of them is still doing work on turn nine.',
        'Text searches struggle here because almost every ramp card phrases its effect differently — "add", "search your library for a land", "spells cost less". Describing the intent lets OffMeta assemble the oracle-text conditions for you.',
      ],
    },
    relatedSearches: [
      'green ramp spells that search for lands',
      'ramp that also draws a card',
      'ramp under $1 for commander',
    ],
    relatedPages: [
      { label: 'Commander ramp', href: '/commander/ramp' },
      { label: 'Black ramp', href: '/mtg/black/ramp' },
      { label: 'Red ramp', href: '/mtg/red/ramp' },
      { label: 'Card draw', href: '/mtg/card-draw' },
    ],
    breadcrumbLabel: 'Ramp',
  },
  {
    path: '/mtg/removal',
    family: 'role',
    indexable: true,
    indexTrail: ['CARD INDEX', 'REMOVAL'],
    title: 'MTG removal — find answers by what you need to answer',
    description:
      'Search MTG removal by target and condition: unconditional exile, cheap instants, artifact and enchantment answers, repeatable removal.',
    headline: 'ANSWER THE',
    headlineEmphasis: 'actual threat.',
    lede: 'Removal is only good if it answers the thing in front of you. Start from the target.',
    searchQuery: 'cheap instant speed removal that exiles',
    intentPaths: [
      {
        label: 'Unconditional',
        description: 'Hits anything, no clauses.',
        query: 'destroy target permanent with no restrictions',
      },
      {
        label: 'Exile',
        description: 'For recursive and indestructible threats.',
        query: 'exile target creature at instant speed',
      },
      {
        label: 'Repeatable',
        description: 'Removal that stays on the battlefield.',
        query: 'permanents with repeatable removal abilities',
      },
      {
        label: 'Non-creature',
        description: 'Artifacts, enchantments, planeswalkers.',
        query: 'instants that destroy artifacts or enchantments',
      },
      {
        label: 'Budget',
        description: 'Efficient answers that cost pennies.',
        query: 'removal spells under $1',
      },
    ],
    representativeQuery: 't:instant (o:"destroy target" or o:"exile target") mv<=2',
    explanation: {
      title: 'About / removal',
      paragraphs: [
        'Every removal spell trades a card and some mana for a specific class of problem. Sorcery-speed destruction is fine against a value engine and useless against a combo turn; exile matters against recursion and is overkill elsewhere.',
        'Searching "removal" as text finds nothing, because no card is printed with that word. OffMeta translates the role into the oracle phrasing Scryfall actually indexes.',
      ],
    },
    relatedSearches: [
      'removal that hits any permanent type',
      'creatures with removal attached',
      'removal that gets around indestructible',
    ],
    relatedPages: [
      { label: 'Board wipes', href: '/mtg/board-wipes' },
      { label: 'Green removal', href: '/mtg/green/removal' },
      { label: 'Commander removal', href: '/commander/removal' },
      { label: 'Protection', href: '/mtg/protection' },
    ],
    breadcrumbLabel: 'Removal',
  },
  {
    path: '/mtg/board-wipes',
    family: 'role',
    indexable: true,
    indexTrail: ['CARD INDEX', 'BOARD WIPES'],
    title: 'MTG board wipes — sweepers filtered by what survives',
    description:
      'Find MTG board wipes by condition: one-sided sweepers, mana-value scaled wraths, mass exile, artifact and enchantment sweepers.',
    headline: 'RESET THE',
    headlineEmphasis: 'board.',
    lede: 'The useful question is not "what wraths exist" but "what should still be standing afterwards".',
    searchQuery: 'one sided board wipes that spare my creatures',
    intentPaths: [
      {
        label: 'Symmetrical',
        description: 'Everything dies, including yours.',
        query: 'destroy all creatures',
      },
      {
        label: 'One-sided',
        description: 'Your board survives.',
        query: 'board wipes that do not destroy my creatures',
      },
      {
        label: 'Scaled',
        description: 'Sweeps by mana value or power.',
        query: 'destroy all creatures with mana value three or less',
      },
      {
        label: 'Mass exile',
        description: 'No recursion afterwards.',
        query: 'exile all creatures',
      },
      {
        label: 'Non-creature',
        description: 'Artifacts and enchantments too.',
        query: 'destroy all artifacts and enchantments',
      },
    ],
    representativeQuery: 'o:"destroy all creatures" -t:land',
    explanation: {
      title: 'About / board wipes',
      paragraphs: [
        'A sweeper is a negotiation with your own board. The condition attached to it — mana value, power, colour, "except", "you control" — decides whether it is a reset button or a concession.',
        'Those clauses live in oracle text with wildly inconsistent wording, which is exactly the case where describing the outcome beats writing the query by hand.',
      ],
    },
    relatedSearches: [
      'board wipes that leave planeswalkers alone',
      'cheap sweepers for early turns',
      'board wipes that draw cards',
    ],
    relatedPages: [
      { label: 'Removal', href: '/mtg/removal' },
      { label: 'Commander board wipes', href: '/commander/board-wipes' },
      { label: 'Protection', href: '/mtg/protection' },
    ],
    breadcrumbLabel: 'Board wipes',
  },
  {
    path: '/mtg/protection',
    family: 'role',
    indexable: true,
    indexTrail: ['CARD INDEX', 'PROTECTION'],
    title: 'MTG protection — keep your key permanents alive',
    description:
      'Search MTG protection by method: hexproof grants, indestructible, phasing, counterspell backup and blanket protection for your board.',
    headline: 'KEEP IT',
    headlineEmphasis: 'on the table.',
    lede: 'Protection is insurance. Choose the failure you are insuring against.',
    searchQuery: 'cheap ways to protect my commander from removal',
    intentPaths: [
      {
        label: 'Instant response',
        description: 'Hold up one mana, save the permanent.',
        query: 'one mana instants that give hexproof or indestructible',
      },
      {
        label: 'Static',
        description: 'Always-on protection from a permanent.',
        query: 'permanents that give my creatures hexproof',
      },
      {
        label: 'Blanket',
        description: 'Protect the whole board at once.',
        query: 'give all my creatures indestructible',
      },
      {
        label: 'Counter backup',
        description: 'Stop the removal instead of surviving it.',
        query: 'counterspells that only counter removal',
      },
      {
        label: 'Recursion',
        description: 'Accept the loss, get it back.',
        query: 'return my commander from the graveyard to the battlefield',
      },
    ],
    representativeQuery: 't:instant (o:"hexproof" or o:"indestructible") mv<=2',
    explanation: {
      title: 'About / protection',
      paragraphs: [
        'Protection cards are only as good as the removal they answer. Hexproof does nothing against a wrath; indestructible does nothing against exile; a counterspell answers both but requires open mana.',
        'Naming the threat you expect produces a much better result set than searching the keyword, because the useful cards are spread across half a dozen different mechanics.',
      ],
    },
    relatedSearches: [
      'protection that also untaps my creature',
      'protect my artifacts from destruction',
      'ways to make my commander unblockable and safe',
    ],
    relatedPages: [
      { label: 'Removal', href: '/mtg/removal' },
      { label: 'Commander protection', href: '/commander/protection' },
      { label: 'Recursion', href: '/mtg/recursion' },
    ],
    breadcrumbLabel: 'Protection',
  },
  {
    path: '/mtg/recursion',
    family: 'role',
    indexable: true,
    indexTrail: ['CARD INDEX', 'RECURSION'],
    title: 'MTG recursion — get it back from the graveyard',
    description:
      'Find MTG recursion by what you are returning and where it goes: creatures, artifacts, any permanent, to hand or straight to the battlefield.',
    headline: 'GET IT',
    headlineEmphasis: 'back.',
    lede: 'Recursion turns removal into a delay. Decide what you are rebuying and where it lands.',
    searchQuery: 'repeatable ways to return creatures from my graveyard',
    intentPaths: [
      {
        label: 'To the battlefield',
        description: 'Skip the recast entirely.',
        query: 'return a creature from graveyard to the battlefield',
      },
      {
        label: 'To hand',
        description: 'Cheaper, slower, more flexible.',
        query: 'return target permanent card from graveyard to hand',
      },
      {
        label: 'Repeatable',
        description: 'An engine, not a single rebuy.',
        query: 'permanents that repeatedly return cards from my graveyard',
      },
      {
        label: 'Mass',
        description: 'Rebuild after a wrath.',
        query: 'return all creature cards from my graveyard',
      },
      {
        label: 'Self-recursion',
        description: 'Cards that return themselves.',
        query: 'creatures that return themselves from the graveyard',
      },
    ],
    representativeQuery: 'o:"return target creature card from your graveyard"',
    explanation: {
      title: 'About / recursion',
      paragraphs: [
        'The graveyard is a second hand for decks built to use it. Recursion decides how expensive that second hand is: to hand is cheap and slow, to the battlefield is expensive and immediate, repeatable is an engine that also invites graveyard hate.',
        'Wording varies constantly across these effects, so intent-first search finds options a literal "graveyard" keyword search buries.',
      ],
    },
    relatedSearches: [
      'recursion that does not need green or black',
      'return artifacts from the graveyard',
      'creatures that recur every turn',
    ],
    relatedPages: [
      { label: 'Graveyard hate', href: '/mtg/graveyard-hate' },
      { label: 'Protection', href: '/mtg/protection' },
      { label: 'Tutors', href: '/mtg/tutors' },
    ],
    breadcrumbLabel: 'Recursion',
  },
  {
    path: '/mtg/tutors',
    family: 'role',
    indexable: true,
    indexTrail: ['CARD INDEX', 'TUTORS'],
    title: 'MTG tutors — search your library for the right card',
    description:
      'Find MTG tutors by restriction and destination: unconditional, type-specific, to hand, to the top, or straight onto the battlefield.',
    headline: 'FIND THE',
    headlineEmphasis: 'exact card.',
    lede: 'Every tutor trades a card and some tempo for consistency. The restriction is the price.',
    searchQuery: 'budget tutors that find any card',
    intentPaths: [
      {
        label: 'Unconditional',
        description: 'Any card, no restriction.',
        query: 'search your library for any card and put it into your hand',
      },
      {
        label: 'Type-specific',
        description: 'Cheaper, narrower.',
        query: 'search your library for an artifact or enchantment',
      },
      {
        label: 'To the battlefield',
        description: 'Tutor and cheat it into play.',
        query: 'search your library for a creature and put it onto the battlefield',
      },
      {
        label: 'To the top',
        description: 'Slower but usually cheap.',
        query: 'search your library and put a card on top of your library',
      },
      {
        label: 'Budget',
        description: 'Consistency without the price tag.',
        query: 'tutors under $3',
      },
    ],
    representativeQuery: 'o:"search your library" o:"into your hand" mv<=3',
    explanation: {
      title: 'About / tutors',
      paragraphs: [
        'Tutors make a deck consistent and, in the same motion, make it more predictable to play against. The important variables are the restriction, the destination and the mana cost — not the word "tutor", which never appears in oracle text.',
        'This is a clean example of the gap OffMeta closes: players use a nickname, Scryfall indexes a sentence.',
      ],
    },
    relatedSearches: [
      'tutors that put a land onto the battlefield',
      'creature tutors that attach to a body',
      'tutors that do not cost life',
    ],
    relatedPages: [
      { label: 'Commander tutors', href: '/commander/tutors' },
      { label: 'Card draw', href: '/mtg/card-draw' },
      { label: 'Recursion', href: '/mtg/recursion' },
    ],
    breadcrumbLabel: 'Tutors',
  },
];
