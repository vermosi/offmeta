const VALID_SEARCH_KEYS = new Set([
  'c', 'color', 'id', 'identity', 'o', 'oracle', 't', 'type',
  'm', 'mana', 'cmc', 'mv', 'manavalue',
  'power', 'pow', 'toughness', 'tou', 'loyalty', 'loy',
  'e', 'set', 's', 'b', 'block', 'r', 'rarity',
  'f', 'format', 'legal', 'banned', 'restricted',
  'is', 'not', 'has',
  'usd', 'eur', 'tix',
  'a', 'artist', 'ft', 'flavor',
  'wm', 'watermark', 'border', 'frame', 'game',
  'year', 'date', 'new', 'prints', 'lang', 'in',
  'st', 'cube', 'order', 'direction', 'unique', 'prefer', 'include',
  'produces', 'devotion', 'name',
  'otag', 'oracletag', 'function',
  'atag', 'arttag',
]);

export function normalizeBooleanPrecedence(query: string): string {
  return query.replace(/(\S+\s+OR\s+\S+(?:\s+OR\s+\S+)*)/gi, '($1)');
}

export function validateScryfallQuery(query: string): { sanitized: string; issues: string[] } {
  const issues: string[] = [];
  let sanitized = query.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!sanitized) {
    return { sanitized: '', issues: ['Query is empty'] };
  }

  const keyPattern = /\b([a-zA-Z]+)[:=<>]/g;
  const unknownKeys: string[] = [];
  let keyMatch;
  while ((keyMatch = keyPattern.exec(sanitized)) !== null) {
    const key = keyMatch[1].toLowerCase();
    if (!VALID_SEARCH_KEYS.has(key)) {
      unknownKeys.push(key);
    }
  }
  if (unknownKeys.length > 0) {
    issues.push(`Unknown search key(s): ${unknownKeys.join(', ')}`);
  }

  let parenCount = 0;
  for (const char of sanitized) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) break;
  }
  if (parenCount !== 0) {
    issues.push('Unbalanced parentheses');
  }

  const doubleQuoteCount = (sanitized.match(/"/g) || []).length;
  if (doubleQuoteCount % 2 !== 0) {
    issues.push('Unbalanced double quotes');
  }

  const singleQuoteCount = (sanitized.match(/'/g) || []).length;
  if (singleQuoteCount % 2 !== 0) {
    issues.push('Unbalanced single quotes');
  }

  return { sanitized, issues };
}
