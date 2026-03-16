/**
 * Query complexity estimator for natural language MTG searches.
 * Scores queries on a 0–1 scale and provides actionable simplification
 * when complexity exceeds the pipeline's sweet spot.
 * @module lib/search/complexity
 */

/** Noise/filler words that don't add search intent */
const NOISE_WORDS = new Set([
  'a', 'an', 'the', 'that', 'which', 'are', 'is', 'be', 'with', 'and', 'or',
  'for', 'in', 'of', 'to', 'from', 'some', 'any', 'all', 'every', 'each',
  'my', 'your', 'its', 'cards', 'card', 'spells', 'spell', 'good', 'best',
  'great', 'nice', 'cool', 'top', 'find', 'also', 'really', 'very', 'most',
  'other', 'kind', 'sort', 'type', 'have', 'has', 'having', 'like', 'ability',
  'abilities', 'some', 'colors', 'color',
]);

/** Words the deterministic layer handles well (types, colors, costs) */
const DETERMINISTIC_WORDS = new Set([
  'creature', 'creatures', 'instant', 'instants', 'sorcery', 'sorceries',
  'artifact', 'artifacts', 'enchantment', 'enchantments', 'land', 'lands',
  'planeswalker', 'planeswalkers', 'legendary', 'tribal',
  'white', 'blue', 'black', 'red', 'green', 'colorless', 'multicolor',
  'mono', 'azorius', 'dimir', 'rakdos', 'gruul', 'selesnya',
  'orzhov', 'izzet', 'golgari', 'boros', 'simic', 'esper', 'grixis',
  'jund', 'naya', 'bant', 'abzan', 'jeskai', 'sultai', 'mardu', 'temur',
  'cheap', 'expensive', 'under', 'less', 'than', 'more', 'cost', 'costs',
  'mana', 'cmc', 'mv',
  'common', 'uncommon', 'rare', 'mythic',
]);

/** Words the concept library handles well */
const CONCEPT_WORDS = new Set([
  'flying', 'hexproof', 'trample', 'deathtouch', 'lifelink', 'haste',
  'indestructible', 'vigilance', 'menace', 'flash', 'ward', 'reach',
  'first', 'strike', 'double', 'protection', 'shroud',
  'commander', 'modern', 'standard', 'pioneer', 'pauper', 'legal',
  'ramp', 'draw', 'removal', 'tutor', 'wipe', 'board', 'counter',
  'counterspell', 'blink', 'flicker', 'sacrifice', 'sac', 'token',
  'tokens', 'treasure', 'etb', 'enters', 'battlefield',
  'graveyard', 'recursion', 'reanimate', 'mill', 'wheel',
  'equipment', 'aura', 'stax', 'hatebear', 'cantrip',
  'fetchland', 'shockland', 'dork', 'dorks', 'rock', 'rocks',
  'ritual', 'lifegain', 'aristocrats',
]);

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'very_complex';

export interface ComplexityEstimate {
  /** 0–1 score where 1 = maximally complex */
  score: number;
  level: ComplexityLevel;
  /** Total meaningful words (excluding noise) */
  meaningfulWordCount: number;
  /** Words not covered by deterministic or concept layers */
  uncoveredWords: string[];
  /** Number of distinct constraint dimensions (color, type, keyword, format, cost, text) */
  constraintCount: number;
  /** Whether the query should be auto-simplified */
  shouldSimplify: boolean;
  /** User-facing warning message, if any */
  warning: string | null;
  /** Simplified version of the query, if applicable */
  simplifiedQuery: string | null;
}

/**
 * Estimates query complexity and provides simplification suggestions.
 */
export function estimateQueryComplexity(query: string): ComplexityEstimate {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter(w => !NOISE_WORDS.has(w) && w.length >= 2);
  const uncoveredWords = meaningfulWords.filter(
    w => !DETERMINISTIC_WORDS.has(w) && !CONCEPT_WORDS.has(w),
  );

  // Count distinct constraint dimensions
  const dimensions = new Set<string>();
  for (const w of meaningfulWords) {
    if (DETERMINISTIC_WORDS.has(w)) {
      if (['creature', 'creatures', 'instant', 'instants', 'sorcery', 'sorceries',
        'artifact', 'artifacts', 'enchantment', 'enchantments', 'land', 'lands',
        'planeswalker', 'planeswalkers', 'legendary', 'tribal'].includes(w)) {
        dimensions.add('type');
      } else if (['white', 'blue', 'black', 'red', 'green', 'colorless', 'multicolor',
        'mono', 'azorius', 'dimir', 'rakdos', 'gruul', 'selesnya', 'orzhov', 'izzet',
        'golgari', 'boros', 'simic', 'esper', 'grixis', 'jund', 'naya', 'bant',
        'abzan', 'jeskai', 'sultai', 'mardu', 'temur'].includes(w)) {
        dimensions.add('color');
      } else if (['cheap', 'expensive', 'under', 'less', 'more', 'cost', 'costs',
        'mana', 'cmc', 'mv'].includes(w)) {
        dimensions.add('cost');
      } else if (['common', 'uncommon', 'rare', 'mythic'].includes(w)) {
        dimensions.add('rarity');
      }
    }
    if (CONCEPT_WORDS.has(w)) {
      if (['commander', 'modern', 'standard', 'pioneer', 'pauper', 'legal'].includes(w)) {
        dimensions.add('format');
      } else if (['flying', 'hexproof', 'trample', 'deathtouch', 'lifelink', 'haste',
        'indestructible', 'vigilance', 'menace', 'flash', 'ward', 'reach',
        'first', 'strike', 'double', 'protection', 'shroud'].includes(w)) {
        dimensions.add('keyword');
      } else {
        dimensions.add('ability');
      }
    }
  }

  // Score based on multiple factors
  const wordCountScore = Math.min(meaningfulWords.length / 12, 1); // >12 words = max
  const uncoveredRatio = meaningfulWords.length > 0
    ? uncoveredWords.length / meaningfulWords.length
    : 0;
  const dimensionScore = Math.min(dimensions.size / 5, 1); // >5 dimensions = max

  // Weighted composite score
  const score = Math.min(
    wordCountScore * 0.4 + uncoveredRatio * 0.35 + dimensionScore * 0.25,
    1,
  );

  const level: ComplexityLevel =
    score < 0.25 ? 'simple' :
    score < 0.45 ? 'moderate' :
    score < 0.7 ? 'complex' :
    'very_complex';

  const shouldSimplify = level === 'very_complex';
  let warning: string | null = null;
  let simplifiedQuery: string | null = null;

  if (level === 'very_complex') {
    warning = 'This query is very complex and may time out. It has been simplified for better results.';
    simplifiedQuery = simplifyQuery(query, meaningfulWords);
  } else if (level === 'complex') {
    warning = 'Complex query — results may take a few extra seconds.';
  }

  return {
    score,
    level,
    meaningfulWordCount: meaningfulWords.length,
    uncoveredWords,
    constraintCount: dimensions.size,
    shouldSimplify,
    warning,
    simplifiedQuery,
  };
}

/**
 * Simplifies a query by keeping the most important constraints
 * and dropping low-value filler. Targets ~8 meaningful words.
 * 
 * Strategy: Keep the top 8 meaningful words by priority, then
 * only retain noise words that appear *between* two kept meaningful
 * words (as natural connectors). This avoids the old bug of keeping
 * all filler while dropping constraint words.
 */
function simplifyQuery(original: string, meaningfulWords: string[]): string {
  if (meaningfulWords.length <= 12) return original;

  // Priority: type > color > format > keyword > cost numbers > ability > uncovered
  const prioritized: { word: string; priority: number }[] = meaningfulWords.map(w => {
    let priority = 0;
    if (['creature', 'creatures', 'instant', 'instants', 'sorcery', 'sorceries',
      'artifact', 'artifacts', 'enchantment', 'enchantments', 'planeswalker',
      'planeswalkers', 'legendary'].includes(w)) {
      priority = 100;
    } else if (['white', 'blue', 'black', 'red', 'green', 'colorless'].includes(w)) {
      priority = 90;
    } else if (['commander', 'modern', 'standard', 'pioneer', 'pauper'].includes(w)) {
      priority = 85;
    } else if (CONCEPT_WORDS.has(w)) {
      priority = 80;
    } else if (DETERMINISTIC_WORDS.has(w)) {
      priority = 70;
    } else if (/^\d+$/.test(w)) {
      // Numbers (mana costs, prices) are important constraints
      priority = 65;
    } else if (['dollars', 'dollar', 'triggers', 'format', 'price'].includes(w)) {
      // Context words that clarify adjacent constraints
      priority = 60;
    } else {
      priority = 50;
    }
    return { word: w, priority };
  });

  // Keep top 8 by priority, preserving original word order
  const topWords = new Set(
    prioritized
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8)
      .map(p => p.word),
  );

  // Rebuild: keep meaningful words that made the cut, plus only noise
  // words that sit between two kept meaningful words (as connectors)
  const words = original.toLowerCase().trim().split(/\s+/);
  const kept: string[] = [];
  let lastKeptMeaningful = -1;
  const pendingNoise: string[] = [];

  for (const w of words) {
    if (topWords.has(w)) {
      // Flush pending noise as connectors
      if (lastKeptMeaningful >= 0 && pendingNoise.length <= 2) {
        kept.push(...pendingNoise);
      }
      pendingNoise.length = 0;
      kept.push(w);
      lastKeptMeaningful = kept.length - 1;
    } else if (NOISE_WORDS.has(w)) {
      pendingNoise.push(w);
    }
    // Non-top, non-noise words are dropped entirely
  }

  // Remove trailing noise
  while (kept.length > 0 && NOISE_WORDS.has(kept[kept.length - 1])) {
    kept.pop();
  }

  return kept.join(' ') || original;
}
