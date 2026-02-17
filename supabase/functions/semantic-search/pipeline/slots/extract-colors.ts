/**
 * Slot Extraction – Colors
 * @module pipeline/slots/extract-colors
 */

import type { ExtractedSlots } from '../types.ts';
import { COLOR_MAP, MULTICOLOR_MAP } from '../../shared-mappings.ts';

export function extractColors(
  query: string,
  options?: { forCommander?: boolean },
): {
  colors: ExtractedSlots['colors'];
  remaining: string;
} {
  let remaining = query;

  // Check for commander identity context — includes when format is already detected as commander
  const identityContext =
    options?.forCommander ||
    /\b(commander deck|fits into|goes into|can go in|usable in|color identity|ci)\b/i.test(query);
  const exactContext = /\b(exactly|only|just|strictly|mono)\b/i.test(query);

  // Check for mono-color
  const monoMatch = remaining.match(
    /\bmono[-\s]?(white|blue|black|red|green|w|u|b|r|g)\b/i,
  );
  if (monoMatch) {
    const colorCode =
      COLOR_MAP[monoMatch[1].toLowerCase()] || monoMatch[1].toLowerCase();
    remaining = remaining.replace(monoMatch[0], '').trim();
    return {
      colors: { values: [colorCode], mode: 'identity', operator: 'exact' },
      remaining,
    };
  }

  // Check for multicolor names (guilds/shards/wedges)
  // Guild/shard/wedge names are inherently color identity concepts,
  // so always use identity mode regardless of commander context
  for (const [name, codes] of Object.entries(MULTICOLOR_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(remaining)) {
      remaining = remaining.replace(regex, '').trim();
      return {
        colors: {
          values: codes.split(''),
          mode: 'identity',
          operator: exactContext ? 'exact' : 'within',
        },
        remaining,
      };
    }
  }

  // Check for "X or Y" color patterns
  const orMatch = remaining.match(
    /\b(white|blue|black|red|green)\s+or\s+(white|blue|black|red|green)\b/i,
  );
  if (orMatch) {
    const color1 = COLOR_MAP[orMatch[1].toLowerCase()];
    const color2 = COLOR_MAP[orMatch[2].toLowerCase()];
    remaining = remaining.replace(orMatch[0], '').trim();
    return {
      colors: {
        values: [color1, color2],
        mode: identityContext ? 'identity' : 'color',
        operator: 'or',
      },
      remaining,
    };
  }

  // Check for "X and Y" color patterns
  const andMatch = remaining.match(
    /\b(white|blue|black|red|green)\s+and\s+(white|blue|black|red|green)\b/i,
  );
  if (andMatch) {
    const color1 = COLOR_MAP[andMatch[1].toLowerCase()];
    const color2 = COLOR_MAP[andMatch[2].toLowerCase()];
    remaining = remaining.replace(andMatch[0], '').trim();
    return {
      colors: {
        values: [color1, color2],
        mode: identityContext ? 'identity' : 'color',
        operator: identityContext ? (exactContext ? 'exact' : 'within') : 'and',
      },
      remaining,
    };
  }

  // Check for single color mentions
  const colorMatches = remaining.match(
    /\b(white|blue|black|red|green|colorless)\b/gi,
  );
  if (colorMatches && colorMatches.length > 0) {
    const uniqueColors = [
      ...new Set(
        colorMatches.map((c) => {
          const lower = c.toLowerCase();
          return lower === 'colorless' ? 'c' : COLOR_MAP[lower];
        }),
      ),
    ];

    for (const match of colorMatches) {
      remaining = remaining.replace(new RegExp(`\\b${match}\\b`, 'i'), '').trim();
    }

    return {
      colors: {
        values: uniqueColors,
        mode: identityContext ? 'identity' : 'color',
        operator:
          uniqueColors.length > 1 ? 'and' : exactContext ? 'exact' : 'include',
      },
      remaining,
    };
  }

  return { colors: null, remaining };
}
