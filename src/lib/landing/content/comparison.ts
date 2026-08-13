/**
 * Search-education / comparison pages. Deliberately kept to a very small
 * set — thin competitor pages are not built here.
 */

import type { LandingPageConfig } from '../types';

export const COMPARISON_PAGES: LandingPageConfig[] = [
  {
    path: '/scryfall-alternative',
    family: 'comparison',
    indexable: true,
    indexTrail: ['SCRYFALL'],
    title: 'Scryfall alternative — ask the question, see the query',
    description:
      'OffMeta is a natural-language layer on top of Scryfall: describe the cards you want, read the generated Scryfall query, edit it, and keep searching.',
    headline: 'SCRYFALL IS',
    headlineEmphasis: 'incredibly powerful.',
    lede: 'OffMeta just lets you ask the question first — then shows you the exact Scryfall query it ran.',
    searchQuery: 'cheap creatures that punish people for drawing extra cards',
    intentPathsTitle: 'Try the difference',
    intentPaths: [
      {
        label: 'Describe an effect',
        description: 'No operators, no memorised syntax.',
        query: 'cheap creatures that punish people for drawing extra cards',
      },
      {
        label: 'Describe a role',
        description: 'Search the job, not the wording.',
        query: 'repeatable removal that stays on the battlefield',
      },
      {
        label: 'Describe a constraint',
        description: 'Price, format and colour in one sentence.',
        query: 'commander legal blue draw engines under $5',
      },
      {
        label: 'Describe a problem',
        description: 'Answer what the table is doing.',
        query: 'cards that punish treasure decks',
      },
    ],
    explanation: {
      title: 'About / OffMeta and Scryfall',
      paragraphs: [
        'Scryfall is the authoritative Magic card database and OffMeta does not replace it. Every search here runs against the Scryfall API, and the generated query is shown on the results page so you can copy it, edit it, or open it on Scryfall directly.',
        'The gap OffMeta closes is translation. A player thinks in concepts — "punish treasure decks", "repeatable card draw", "budget board wipes". Scryfall understands structured queries. OffMeta sits between them and shows its work rather than hiding it.',
        'That transparency is the point: if the interpretation is wrong you can see why, fix the query and keep going, instead of guessing what a black-box search decided on your behalf.',
      ],
    },
    relatedSearches: [
      'commander legal tutors under $10',
      'artifacts that tap for blue mana',
      'creatures that make treasure',
    ],
    relatedPages: [
      { label: 'Field guide', href: '/guides', note: 'Learn how to search better.' },
      { label: 'Syntax cheat sheet', href: '/docs/syntax', note: 'The operators, if you want them.' },
      { label: 'About OffMeta', href: '/about' },
    ],
    breadcrumbLabel: 'Scryfall alternative',
  },
];
