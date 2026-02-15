/**
 * Slot Extraction – Numeric, Year, and Price Constraints
 * @module pipeline/slots/extract-numeric
 */

export function extractNumericConstraint(
  query: string,
  aliases: string[],
): { constraint: { op: string; value: number } | null; remaining: string } {
  let remaining = query;
  const aliasGroup = aliases
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const patterns: Array<{
    regex: RegExp;
    extractOp: (match: RegExpMatchArray) => string;
  }> = [
    {
      regex: new RegExp(`(>=?|<=?|=)(\\d+)\\s*(?:${aliasGroup})?\\b`, 'i'),
      extractOp: (m) => m[1],
    },
    {
      regex: new RegExp(`(?:${aliasGroup})\\s*(>=?|<=?|=)\\s*(\\d+)\\b`, 'i'),
      extractOp: (m) => m[1],
    },
    {
      regex: new RegExp(`(?:${aliasGroup})\\s*(\\d+)\\s+or\\s+less\\b`, 'i'),
      extractOp: () => '<=',
    },
    {
      regex: new RegExp(`(?:${aliasGroup})\\s*(\\d+)\\s+or\\s+more\\b`, 'i'),
      extractOp: () => '>=',
    },
    {
      regex: new RegExp(`(\\d+)\\s*(?:${aliasGroup})\\b`, 'i'),
      extractOp: () => '=',
    },
    {
      regex: new RegExp(`(?:${aliasGroup})\\s*(\\d+)\\b`, 'i'),
      extractOp: () => '=',
    },
  ];

  for (const { regex, extractOp } of patterns) {
    const match = remaining.match(regex);
    if (match) {
      const numMatch = match[0].match(/\d+/);
      if (numMatch) {
        const value = Number(numMatch[0]);
        if (!Number.isNaN(value)) {
          remaining = remaining.replace(match[0], '').trim();
          return { constraint: { op: extractOp(match), value }, remaining };
        }
      }
    }
  }

  return { constraint: null, remaining };
}

export function extractYearConstraint(query: string): {
  constraint: { op: string; value: number } | null;
  remaining: string;
} {
  let remaining = query;

  const patterns: Array<{ regex: RegExp; op: string; fixedValue?: number }> = [
    { regex: /\b(?:after|since|post)\s+(\d{4})\b/i, op: '>' },
    { regex: /\b(?:before|pre)\s+(\d{4})\b/i, op: '<' },
    { regex: /\b(?:from|in|released in)\s+(\d{4})\b/i, op: '=' },
    {
      regex: /\b(?:recent|new)\s+cards?\b/i,
      op: '>=',
      fixedValue: new Date().getFullYear() - 2,
    },
    { regex: /\b(?:old|classic)\s+cards?\b/i, op: '<', fixedValue: 2003 },
  ];

  for (const pattern of patterns) {
    const match = remaining.match(pattern.regex);
    if (match) {
      const value =
        pattern.fixedValue !== undefined ? pattern.fixedValue : Number(match[1]);
      remaining = remaining.replace(match[0], '').trim();
      return { constraint: { op: pattern.op, value }, remaining };
    }
  }

  return { constraint: null, remaining };
}

export function extractPriceConstraint(query: string): {
  constraint: { op: string; value: number } | null;
  remaining: string;
} {
  let remaining = query;

  const usdMatch = remaining.match(/\busd([<>=]+)(\d+)\b/i);
  if (usdMatch) {
    remaining = remaining.replace(usdMatch[0], '').trim();
    return {
      constraint: { op: usdMatch[1], value: Number(usdMatch[2]) },
      remaining,
    };
  }

  if (/\b(cheap|budget|affordable|inexpensive)\b/i.test(remaining)) {
    remaining = remaining
      .replace(/\b(cheap|budget|affordable|inexpensive)\b/gi, '')
      .trim();
    return { constraint: { op: '<', value: 5 }, remaining };
  }

  if (/\b(expensive|costly|pricey)\b/i.test(remaining)) {
    remaining = remaining.replace(/\b(expensive|costly|pricey)\b/gi, '').trim();
    return { constraint: { op: '>', value: 20 }, remaining };
  }

  return { constraint: null, remaining };
}
