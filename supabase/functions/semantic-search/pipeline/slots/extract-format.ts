/**
 * Slot Extraction – Format
 * @module pipeline/slots/extract-format
 */

import { FORMAT_MAP } from './constants.ts';

export function extractFormat(query: string): {
  format: string | null;
  remaining: string;
} {
  for (const [alias, format] of Object.entries(FORMAT_MAP)) {
    const patterns = [
      new RegExp(`\\b${alias}\\s+(?:legal|format|deck)\\b`, 'gi'),
      new RegExp(`\\b(?:legal|format)\\s+(?:in\\s+)?${alias}\\b`, 'gi'),
      new RegExp(`\\bfor\\s+${alias}\\b`, 'gi'),
      new RegExp(`\\b${alias}\\b`, 'gi'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(query)) {
        return {
          format,
          remaining: query.replace(pattern, '').trim(),
        };
      }
    }
  }

  return { format: null, remaining: query };
}
