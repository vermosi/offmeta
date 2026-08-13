/**
 * /commander/:topic — format-specific pages. Only declared where the
 * Commander context genuinely changes the answer set.
 */

import type { LandingPageConfig } from '../types';

export const COMMANDER_PAGES: LandingPageConfig[] = [
  {
    path: '/commander/card-draw',
    family: 'commander-role',
    indexable: true,
    indexTrail: ['COMMANDER', 'CARD DRAW'],
    title: 'Commander card draw — engines built for four-player games',
    description:
      'Commander card draw that survives a table: repeatable engines, group-draw payoffs, colour-flexible artifacts and commander-legal budget picks.',
    headline: 'DRAW LIKE THERE ARE',
    headlineEmphasis: 'three opponents.',
    lede: 'Singleton, 40 life, three opponents. Draw engines matter more than draw spells.',
    searchQuery: 'commander legal repeatable card draw engines',
    intentPaths: [
      {
        label: 'Engines',
        description: 'Permanents that draw every turn.',
        query: 'commander legal permanents that draw a card each turn',
      },
      {
        label: 'Group draw',
        description: 'Everyone draws, you profit.',
        query: 'each opponent draws a card and I benefit',
      },
      {
        label: 'Colourless',
        description: 'Artifacts that fit any commander.',
        query: 'colorless artifacts that draw cards repeatedly',
      },
      {
        label: 'Attack payoffs',
        description: 'Cards for going aggressive.',
        query: 'draw cards when I attack multiple opponents',
      },
      {
        label: 'Budget',
        description: 'Under a few dollars.',
        query: 'commander card draw under $3',
      },
    ],
    representativeQuery: 'f:commander o:"draw" o:"each" (t:enchantment or t:artifact)',
    explanation: {
      title: 'About / commander card draw',
      paragraphs: [
        'Singleton decks cannot lean on four copies of a good cantrip, and the extra life total means a slow engine usually gets to run. That inverts constructed priorities: repeatable and permanent-based draw beats efficient one-shots.',
        'Format legality also matters here, so these searches carry a Commander filter and still let you refine the mechanism afterwards.',
      ],
    },
    relatedSearches: [
      'draw engines that survive board wipes',
      'commander card draw that does not cost life',
      'group hug draw with a payoff',
    ],
    relatedPages: [
      { label: 'All card draw', href: '/mtg/card-draw' },
      { label: 'Red card draw', href: '/mtg/red/card-draw' },
      { label: 'Commander ramp', href: '/commander/ramp' },
    ],
    breadcrumbLabel: 'Commander card draw',
  },
  {
    path: '/commander/ramp',
    family: 'commander-role',
    indexable: true,
    indexTrail: ['COMMANDER', 'RAMP'],
    title: 'Commander ramp — acceleration and fixing for EDH',
    description:
      'Commander ramp built for singleton mana bases: colour fixing rocks, land tutors, mana doublers and commander cost reduction.',
    headline: 'RAMP INTO A',
    headlineEmphasis: 'longer game.',
    lede: 'EDH ramp does two jobs at once: speed and colour fixing. Say which one you need more.',
    searchQuery: 'commander ramp that fixes colors',
    intentPaths: [
      {
        label: 'Fixing rocks',
        description: 'Any colour, early.',
        query: 'commander legal artifacts that tap for any color',
      },
      {
        label: 'Land tutors',
        description: 'Ramp that survives artifact hate.',
        query: 'search your library for two lands and put them onto the battlefield',
      },
      {
        label: 'Doublers',
        description: 'Late-game mana multiplication.',
        query: 'permanents that double my mana',
      },
      {
        label: 'Commander discount',
        description: 'Cast the commander sooner.',
        query: 'reduce the cost of my commander',
      },
      {
        label: 'Budget',
        description: 'Cheap acceleration that still works.',
        query: 'commander ramp under $2',
      },
    ],
    representativeQuery: 'f:commander t:artifact o:"add" mv<=3',
    explanation: {
      title: 'About / commander ramp',
      paragraphs: [
        'A three-colour singleton deck usually cares as much about casting spells on curve as about casting them early. That makes fixing and ramp the same slot, and it changes which cards are actually good.',
        'Searching by the job — fix colours, double mana, discount the commander — keeps the results honest about that dual role.',
      ],
    },
    relatedSearches: [
      'ramp that survives artifact removal',
      'commander ramp that draws a card',
      'land ramp for three color decks',
    ],
    relatedPages: [
      { label: 'All ramp', href: '/mtg/ramp' },
      { label: 'Black ramp', href: '/mtg/black/ramp' },
      { label: 'Commander card draw', href: '/commander/card-draw' },
    ],
    breadcrumbLabel: 'Commander ramp',
  },
  {
    path: '/commander/removal',
    family: 'commander-role',
    indexable: true,
    indexTrail: ['COMMANDER', 'REMOVAL'],
    title: 'Commander removal — answers that scale to a whole table',
    description:
      'Commander removal that keeps up with three opponents: repeatable answers, exile for recursive commanders, and flexible any-permanent removal.',
    headline: 'ONE ANSWER,',
    headlineEmphasis: 'three problems.',
    lede: 'Card-for-card removal loses to a table. Flexibility and repeatability win.',
    searchQuery: 'commander removal that can hit any permanent',
    intentPaths: [
      {
        label: 'Any permanent',
        description: 'Flexible answers beat narrow ones.',
        query: 'commander legal instants that destroy any permanent',
      },
      {
        label: 'Exile',
        description: 'Commanders come back otherwise.',
        query: 'exile a creature so it cannot return',
      },
      {
        label: 'Repeatable',
        description: 'Answers every turn cycle.',
        query: 'permanents that destroy something every turn',
      },
      {
        label: 'Edicts',
        description: 'Get around hexproof.',
        query: 'each opponent sacrifices a creature',
      },
      {
        label: 'Budget',
        description: 'Cheap, still efficient.',
        query: 'commander removal under $1',
      },
    ],
    representativeQuery: 'f:commander t:instant o:"destroy target" mv<=3',
    explanation: {
      title: 'About / commander removal',
      paragraphs: [
        'With three opponents, every one-for-one answer puts you a card behind unless it solves more than one problem. That is why flexible "any permanent" removal, edicts and repeatable effects rate higher in EDH than in 60-card formats.',
        'Commanders returning from the command zone also make exile disproportionately valuable — worth naming explicitly in the search.',
      ],
    },
    relatedSearches: [
      'removal that gets around hexproof',
      'repeatable removal on a creature',
      'instant speed removal for commanders',
    ],
    relatedPages: [
      { label: 'All removal', href: '/mtg/removal' },
      { label: 'Commander board wipes', href: '/commander/board-wipes' },
      { label: 'Green removal', href: '/mtg/green/removal' },
    ],
    breadcrumbLabel: 'Commander removal',
  },
  {
    path: '/commander/board-wipes',
    family: 'commander-role',
    indexable: true,
    indexTrail: ['COMMANDER', 'BOARD WIPES'],
    title: 'Commander board wipes — sweepers for multiplayer tables',
    description:
      'Commander board wipes chosen by what survives: one-sided sweepers, scaled wraths, mass exile and effects that rebuild you afterwards.',
    headline: 'WIPE THE TABLE,',
    headlineEmphasis: 'not yourself.',
    lede: 'In multiplayer the sweeper that leaves you ahead is worth more than the cheapest one.',
    searchQuery: 'one sided board wipes for commander',
    intentPaths: [
      {
        label: 'One-sided',
        description: 'Your board stays.',
        query: 'commander legal board wipes that spare my creatures',
      },
      {
        label: 'Scaled',
        description: 'Sweep only part of the table.',
        query: 'destroy all creatures with power four or greater',
      },
      {
        label: 'Mass exile',
        description: 'Answer recursion permanently.',
        query: 'exile all creatures',
      },
      {
        label: 'Rebuild',
        description: 'A wipe that refills you.',
        query: 'board wipe that draws cards or returns my permanents',
      },
      {
        label: 'Non-creature',
        description: 'Sweep artifacts or enchantments.',
        query: 'destroy all artifacts and enchantments',
      },
    ],
    representativeQuery: 'f:commander o:"destroy all creatures"',
    explanation: {
      title: 'About / commander board wipes',
      paragraphs: [
        'A wrath in EDH is a political act as well as a play. The relevant question is what remains — your commander, your mana rocks, your engine — because that decides who benefits from the reset.',
        'Describing the survivors is much easier than assembling the "except" clauses by hand.',
      ],
    },
    relatedSearches: [
      'board wipes that leave my commander alive',
      'cheap sweepers that exile',
      'board wipes that only hit big creatures',
    ],
    relatedPages: [
      { label: 'All board wipes', href: '/mtg/board-wipes' },
      { label: 'Commander removal', href: '/commander/removal' },
      { label: 'Commander protection', href: '/commander/protection' },
    ],
    breadcrumbLabel: 'Commander board wipes',
  },
  {
    path: '/commander/protection',
    family: 'commander-role',
    indexable: true,
    indexTrail: ['COMMANDER', 'PROTECTION'],
    title: 'Commander protection — keep your commander on the battlefield',
    description:
      'Commander protection by threat: instant-speed saves, static hexproof, board-wide indestructible, counterspell backup and command-zone recursion.',
    headline: 'PROTECT THE',
    headlineEmphasis: 'commander.',
    lede: 'Commander tax punishes every removal spell you fail to answer. Insure against the right one.',
    searchQuery: 'cheap protection for my commander',
    intentPaths: [
      {
        label: 'Instant save',
        description: 'One mana, held up.',
        query: 'one mana instants that protect my commander',
      },
      {
        label: 'Static',
        description: 'Always-on hexproof or ward.',
        query: 'permanents that give my commander ward',
      },
      {
        label: 'Board-wide',
        description: 'Survive the wrath.',
        query: 'give all my creatures indestructible until end of turn',
      },
      {
        label: 'Counter backup',
        description: 'Stop the spell instead.',
        query: 'counter target spell that targets my creature',
      },
      {
        label: 'Recursion',
        description: 'Bring it back cheaply.',
        query: 'return my commander to the battlefield from the graveyard',
      },
    ],
    representativeQuery: 'f:commander t:instant o:"hexproof" mv<=2',
    explanation: {
      title: 'About / commander protection',
      paragraphs: [
        'Commander tax means the second and third casts cost more, so protection is often cheaper than recasting. The question is which removal your table actually plays: targeted, sweepers or exile.',
        'Naming the threat produces a tighter list than searching for protection keywords, because the answers span instants, static abilities and recursion.',
      ],
    },
    relatedSearches: [
      'ward and hexproof granting permanents',
      'protect my board from a wrath',
      'cheap counterspells that protect a creature',
    ],
    relatedPages: [
      { label: 'All protection', href: '/mtg/protection' },
      { label: 'Commander board wipes', href: '/commander/board-wipes' },
      { label: 'Recursion', href: '/mtg/recursion' },
    ],
    breadcrumbLabel: 'Commander protection',
  },
];
