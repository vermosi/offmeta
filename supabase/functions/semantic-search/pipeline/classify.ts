/**
 * Stage 2: Intent Classification
 * Detects what the user is trying to do at a coarse level
 */

import type { ClassifiedIntent, IntentMode, CardFunction } from './types.ts';

// Known card name patterns (famous cards with distinctive names)
const FAMOUS_CARD_PATTERNS = [
  /\bsol ring\b/i,
  /\blightning bolt\b/i,
  /\bblack lotus\b/i,
  /\bpath to exile\b/i,
  /\bswords to plowshares\b/i,
  /\bcryptocrypt\b/i,
  /\brhystic study\b/i,
  /\bsmothering tithe\b/i,
  /\bdockside extortionist\b/i,
  /\bmana crypt\b/i,
];

// Function detection patterns
const FUNCTION_PATTERNS: Array<{
  function: CardFunction;
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    function: 'ramp',
    patterns: [
      /\bramp\b/i,
      /\bmana acceleration\b/i,
      /\bmana rocks?\b/i,
      /\bmana dorks?\b/i,
      /\bfast mana\b/i,
      /\baccelerant\b/i,
    ],
    confidence: 0.9,
  },
  {
    function: 'removal',
    patterns: [
      /\bremoval\b/i,
      /\bkill spell\b/i,
      /\bdestroy.+creature\b/i,
      /\bexile.+creature\b/i,
      /\bspot removal\b/i,
    ],
    confidence: 0.85,
  },
  {
    function: 'counterspell',
    patterns: [
      /\bcounterspell\b/i,
      /\bcounter.+spell\b/i,
      /\bcounter magic\b/i,
      /\bnegate\b/i,
    ],
    confidence: 0.9,
  },
  {
    function: 'draw',
    patterns: [
      /\bcard draw\b/i,
      /\bdraw.+cards?\b/i,
      /\bcard advantage\b/i,
      /\bcantrips?\b/i,
    ],
    confidence: 0.85,
  },
  {
    function: 'tutor',
    patterns: [/\btutors?\b/i, /\bsearch.+library\b/i, /\bfind.+card\b/i],
    confidence: 0.9,
  },
  {
    function: 'wipe',
    patterns: [
      /\bboard\s*wipe\b/i,
      /\bwrath\b/i,
      /\bsweeper\b/i,
      /\bmass removal\b/i,
      /\bdestroy all\b/i,
    ],
    confidence: 0.9,
  },
  {
    function: 'reanimation',
    patterns: [
      /\breanimation\b/i,
      /\breanimate\b/i,
      /\breturn.+graveyard.+battlefield\b/i,
      /\braise dead\b/i,
    ],
    confidence: 0.85,
  },
  {
    function: 'recursion',
    patterns: [
      /\brecursion\b/i,
      /\brecursive\b/i,
      /\breturn.+graveyard\b/i,
      /\bregrowth\b/i,
    ],
    confidence: 0.8,
  },
  {
    function: 'blink',
    patterns: [
      /\bblink\b/i,
      /\bflicker\b/i,
      /\bexile.+return\b/i,
      /\betb abuse\b/i,
    ],
    confidence: 0.9,
  },
  {
    function: 'stax',
    patterns: [
      /\bstax\b/i,
      /\bprison\b/i,
      /\block\s*down\b/i,
      /\btax effects?\b/i,
    ],
    confidence: 0.85,
  },
  {
    function: 'tokens',
    patterns: [
      /\btokens?\b/i,
      /\btoken generator\b/i,
      /\bmake tokens\b/i,
      /\bcreate.+tokens?\b/i,
    ],
    confidence: 0.8,
  },
  {
    function: 'sacrifice',
    patterns: [
      /\bsacrifice\b/i,
      /\bsac outlet\b/i,
      /\baristocrats\b/i,
      /\bdeath triggers?\b/i,
    ],
    confidence: 0.85,
  },
  {
    function: 'graveyard',
    patterns: [
      /\bgraveyard\b/i,
      /\bmill\b/i,
      /\bself[- ]?mill\b/i,
      /\bdredge\b/i,
    ],
    confidence: 0.75,
  },
  {
    function: 'lifegain',
    patterns: [
      /\blifegain\b/i,
      /\bgain life\b/i,
      /\bsoul sisters?\b/i,
      /\blife total\b/i,
    ],
    confidence: 0.85,
  },
  {
    function: 'wheel',
    patterns: [/\bwheel\b/i, /\bdiscard.+draw 7\b/i, /\bwheel of fortune\b/i],
    confidence: 0.9,
  },
  {
    function: 'voltron',
    patterns: [
      /\bvoltron\b/i,
      /\bequipment\b/i,
      /\baura\b/i,
      /\bcommander damage\b/i,
    ],
    confidence: 0.8,
  },
];

// Intent mode detection patterns
const MODE_PATTERNS: Array<{
  mode: IntentMode;
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    mode: 'find_card_by_name',
    patterns: [
      /^[a-z][a-z',\s-]{2,40}$/i, // Simple name-like query
      /"[^"]+"/i, // Quoted phrase
    ],
    confidence: 0.7,
  },
  {
    mode: 'rules_question',
    patterns: [
      /\bhow does\b/i,
      /\bwhat happens when\b/i,
      /\bcan i\b/i,
      /\bdoes.+work\b/i,
      /\brules?\b/i,
    ],
    confidence: 0.8,
  },
  {
    mode: 'deck_help',
    patterns: [
      /\bfor my deck\b/i,
      /\bin my.+deck\b/i,
      /\bwith my commander\b/i,
      /\bgoes well with\b/i,
      /\bsynergizes?\b/i,
    ],
    confidence: 0.75,
  },
];

/**
 * Classifies the user's intent from their query
 */
export function classifyIntent(normalizedQuery: string): ClassifiedIntent {
  const query = normalizedQuery.toLowerCase().trim();

  // Check for card name search
  let cardNameCandidate: string | null = null;
  let isCardNameSearch = false;

  // Check for famous card patterns
  for (const pattern of FAMOUS_CARD_PATTERNS) {
    const match = query.match(pattern);
    if (match) {
      cardNameCandidate = match[0];
      isCardNameSearch = true;
      break;
    }
  }

  // Check for quoted card names
  const quotedMatch = query.match(/"([^"]+)"/);
  if (quotedMatch) {
    cardNameCandidate = quotedMatch[1];
    isCardNameSearch = true;
  }

  // Determine mode
  let mode: IntentMode = 'find_cards';
  let modeConfidence = 0.5;

  for (const { mode: m, patterns, confidence } of MODE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(query) && confidence > modeConfidence) {
        mode = m;
        modeConfidence = confidence;
      }
    }
  }

  // If we found a card name and it's most of the query, bias toward name search
  if (isCardNameSearch && cardNameCandidate) {
    const nameRatio = cardNameCandidate.length / query.length;
    if (nameRatio > 0.7) {
      mode = 'find_card_by_name';
    }
  }

  // Detect card functions
  const functions: Array<{ function: CardFunction; confidence: number }> = [];

  for (const { function: fn, patterns, confidence } of FUNCTION_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        functions.push({ function: fn, confidence });
        break; // Only add each function once
      }
    }
  }

  // Sort by confidence
  functions.sort((a, b) => b.confidence - a.confidence);

  return {
    mode,
    functions,
    cardNameCandidate,
    isCardNameSearch,
  };
}

/**
 * Detects potential ambiguity in the query
 * Returns suggested clarifications if needed
 */
export function detectAmbiguity(query: string): {
  isAmbiguous: boolean;
  suggestions: Array<{ label: string; query: string }>;
} {
  const suggestions: Array<{ label: string; query: string }> = [];

  // Check for "counterspell" ambiguity (card vs category)
  if (/\bcounterspell\b/i.test(query)) {
    // If query is just "counterspell" or very short, it's ambiguous
    if (query.trim().split(/\s+/).length <= 2) {
      suggestions.push(
        { label: 'Counterspell (the card)', query: '!"Counterspell"' },
        { label: 'Counterspells (the category)', query: 'otag:counterspell' },
      );
    }
  }

  // Check for tribal ambiguity
  const tribalPatterns = ['elves', 'goblins', 'zombies', 'dragons', 'angels'];
  for (const tribe of tribalPatterns) {
    if (new RegExp(`\\b${tribe}\\b`, 'i').test(query)) {
      if (query.trim().split(/\s+/).length <= 2) {
        suggestions.push(
          { label: `${tribe} (creatures)`, query: `t:${tribe.slice(0, -1)}` },
          {
            label: `${tribe} (tribal support)`,
            query: `o:"${tribe.slice(0, -1)}" -t:${tribe.slice(0, -1)}`,
          },
        );
      }
    }
  }

  return {
    isAmbiguous: suggestions.length > 0,
    suggestions,
  };
}
