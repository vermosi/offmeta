/**
 * Art tag patterns for matching "X in the art" queries.
 * Uses Scryfall's atag: operator for art-based searches.
 * @module mappings/art-tags
 */

export interface ArtTagPattern {
  pattern: RegExp;
  tag: string;
}

/**
 * Patterns for matching art-based search queries.
 * "dogs in the art" → atag:dog
 */
export const ART_TAG_MAP: ArtTagPattern[] = [
  { pattern: /\bcows? in (the )?art\b/gi, tag: 'cow' },
  { pattern: /\bdogs? in (the )?art\b/gi, tag: 'dog' },
  { pattern: /\bcats? in (the )?art\b/gi, tag: 'cat' },
  { pattern: /\btrees? in (the )?art\b/gi, tag: 'tree' },
  { pattern: /\bmountains? in (the )?art\b/gi, tag: 'mountain' },
  { pattern: /\bocean in (the )?art\b/gi, tag: 'ocean' },
  { pattern: /\bskulls? in (the )?art\b/gi, tag: 'skull' },
  // Expanded art tags
  { pattern: /\bhooks? in (the )?art\b/gi, tag: 'hook' },
  { pattern: /\baxes? in (the )?art\b/gi, tag: 'axe' },
  { pattern: /\bswords? in (the )?art\b/gi, tag: 'sword' },
  { pattern: /\bshields? in (the )?art\b/gi, tag: 'shield' },
  { pattern: /\barmou?r in (the )?art\b/gi, tag: 'armor' },
  { pattern: /\bhelmets? in (the )?art\b/gi, tag: 'helmet' },
  { pattern: /\bfire in (the )?art\b/gi, tag: 'fire' },
  { pattern: /\bwater in (the )?art\b/gi, tag: 'water' },
  { pattern: /\bdragons? in (the )?art\b/gi, tag: 'dragon' },
  { pattern: /\bangels? in (the )?art\b/gi, tag: 'angel' },
  { pattern: /\bdemons? in (the )?art\b/gi, tag: 'demon' },
  { pattern: /\bhorses? in (the )?art\b/gi, tag: 'horse' },
  { pattern: /\bwolves? in (the )?art\b/gi, tag: 'wolf' },
  { pattern: /\bbirds? in (the )?art\b/gi, tag: 'bird' },
  { pattern: /\bsnakes? in (the )?art\b/gi, tag: 'snake' },
  { pattern: /\bspiders? in (the )?art\b/gi, tag: 'spider' },
  // "Art with X" pattern - dynamic tag extraction
  {
    pattern: /\bart (?:with|showing|depicting|featuring) ([\w]+)\b/gi,
    tag: '$1',
  },
];
