import { KNOWN_OTAGS } from './tags.ts';
import { VALID_SEARCH_KEYS } from './constants.ts';

export interface ValidationCase {
  name: string;
  query: string;
  expectedValid: boolean;
  expectedIssues: string[];
  expectedSanitized?: string;
  expectedSanitizedPrefix?: string;
  expectedSanitizedLength?: number;
  expectedSanitizedMaxLength?: number;
  expectSanitizedValid?: boolean;
}

export interface AutoCorrectionCase {
  name: string;
  query: string;
  expectedCorrectedQuery: string;
  expectedCorrections: string[];
}

export const VALIDATION_CASES: ValidationCase[] = [
  {
    name: 'missing_closing_quote',
    query: 't:creature o:"draw',
    expectedValid: false,
    expectedIssues: ['Added missing closing quote'],
    expectedSanitized: 't:creature o:"draw"',
    expectSanitizedValid: true,
  },
  {
    name: 'unknown_search_key',
    query: 'foo:bar t:creature',
    expectedValid: false,
    expectedIssues: ['Unknown search key(s): foo'],
    expectedSanitized: 't:creature',
    expectSanitizedValid: true,
  },
  {
    name: 'oversized_query',
    query: `t:creature ${'o:"draw" '.repeat(60)}`.trim(),
    expectedValid: false,
    expectedIssues: ['Query truncated to 400 characters'],
    expectedSanitizedPrefix: 't:creature o:"draw"',
    expectedSanitizedMaxLength: 400,
    expectSanitizedValid: true,
  },
  {
    name: 'unbalanced_parentheses',
    query: 't:creature (o:"draw" OR o:"cards"',
    expectedValid: false,
    expectedIssues: ['Removed unbalanced parentheses'],
    expectedSanitized: 't:creature o:"draw" OR o:"cards"',
    expectSanitizedValid: true,
  },
];

export const AUTO_CORRECTION_CASES: AutoCorrectionCase[] = [
  {
    name: 'verbose_etb_syntax',
    query: 't:creature o:"enters the battlefield"',
    expectedCorrectedQuery: 't:creature o:"enters"',
    expectedCorrections: ['Simplified ETB syntax for broader results'],
  },
];

/**
 * Remove duplicate parameters from a query string.
 * e.g., "t:creature t:creature c:r c:r" → "t:creature c:r"
 */
export function removeDuplicateParameters(query: string): string {
  const parts = query.split(/\s+/);
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const part of parts) {
    const normalized = part.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(part);
    }
  }

  return deduped.join(' ');
}

/**
 * Input sanitization - reject malformed/spam queries before processing
 * This prevents wasting API resources on junk input.
 */
export function sanitizeInputQuery(query: string): {
  valid: boolean;
  reason?: string;
  sanitized?: string;
} {
  const trimmed = query.trim();

  // Reject queries under 3 characters
  if (trimmed.length < 3) {
    return { valid: false, reason: 'Query too short (minimum 3 characters)' };
  }

  // Detect repeated empty operators (spam pattern: "t: t: t: t:")
  const repeatedEmptyOps = /(?:[toc]:[\s]*){3,}/gi;
  if (repeatedEmptyOps.test(trimmed)) {
    return {
      valid: false,
      reason: 'Invalid query format - repeated empty operators detected',
    };
  }

  // Detect malformed operator spam (like "t:t:t:t:")
  const operatorSpam = /(?:[toc]:){3,}/gi;
  if (operatorSpam.test(trimmed)) {
    return {
      valid: false,
      reason: 'Invalid query format - malformed operator syntax',
    };
  }

  // Count total search parameters - reject if excessive (prevents spam)
  const parameterMatches = trimmed.match(/\b[a-zA-Z]+[:=<>]/g) || [];
  if (parameterMatches.length > 15) {
    return {
      valid: false,
      reason: 'Too many search parameters (maximum 15)',
    };
  }

  // Strip trailing empty operators (e.g., "t:creature t: t: t:")
  let sanitized = trimmed.replace(/\s+[toc]:\s*(?=[toc]:|$)/gi, ' ').trim();

  // Also strip inline empty operators anywhere in query (e.g., "t:artifact t: t: o:draw")
  sanitized = sanitized.replace(/\s+[toc]:\s+/gi, ' ').trim();

  // Remove duplicate parameters
  sanitized = removeDuplicateParameters(sanitized);

  // NEW: Count remaining empty operators (pattern: " t: " or " o: " with spaces)
  const emptyOpCount = (sanitized.match(/\b[toc]:\s*(?=\s|$)/gi) || []).length;
  if (emptyOpCount > 2) {
    return {
      valid: false,
      reason: 'Too many empty search operators',
    };
  }

  // Check for excessive non-alphanumeric characters (>50%)
  // Include CJK, Hangul, Cyrillic, and other Unicode letter ranges as valid
  const wordCharCount = (sanitized.match(/[\p{L}\p{N}]/gu) || []).length;
  if (wordCharCount < sanitized.length * 0.5 && sanitized.length > 10) {
    return {
      valid: false,
      reason: 'Query contains too many special characters',
    };
  }

  // Detect repetitive single character spam (like "aaaaaaa" or "tttttt")
  const repetitiveChars = /(.)\1{5,}/g;
  if (repetitiveChars.test(sanitized)) {
    return {
      valid: false,
      reason: 'Invalid query format - repetitive character spam detected',
    };
  }

  return { valid: true, sanitized };
}

/**
 * Validates and sanitizes a Scryfall query string.
 * Ensures the query is safe to execute and fixes common issues.
 */
export function validateQuery(query: string): {
  valid: boolean;
  sanitized: string;
  issues: string[];
} {
  const issues: string[] = [];
  let sanitized = query;

  // Remove newlines and extra whitespace
  sanitized = sanitized
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize boolean precedence (wrap OR groups)
  const normalizedOr = normalizeOrGroups(sanitized);
  if (normalizedOr !== sanitized) {
    sanitized = normalizedOr;
    issues.push('Normalized OR groups with parentheses');
  }

  // Enforce max length
  if (sanitized.length > 400) {
    sanitized = sanitized.substring(0, 400);
    issues.push('Query truncated to 400 characters');
  }

  // Remove potentially unsafe characters (keep common Scryfall syntax + regex for oracle/name searches)
  // eslint-disable-next-line no-useless-escape
  sanitized = sanitized.replace(/[^\w\s:="'()<>!=+\-\/*\\{}.,^$|?[\]]/g, '');

  // Fix invalid year set usage (e:2021 -> year=2021)
  const yearSetPattern = /\be:(\d{4})\b/gi;
  if (yearSetPattern.test(sanitized)) {
    sanitized = sanitized.replace(yearSetPattern, 'year=$1');
    issues.push('Replaced invalid year set syntax with year=YYYY');
  }

  // Remove unsupported power+toughness math
  if (/\b(pow|power)\s*\+\s*(tou|toughness)\b/i.test(sanitized)) {
    sanitized = sanitized
      .replace(/\b(pow|power)\s*\+\s*(tou|toughness)\s*[<>=]+?\s*\d+\b/gi, '')
      .trim();
    issues.push('Removed unsupported power+toughness math');
  }

  // Handle unbalanced curly braces
  const openCurly = (sanitized.match(/{/g) || []).length;
  const closeCurly = (sanitized.match(/}/g) || []).length;
  if (openCurly !== closeCurly) {
    if (openCurly > closeCurly) {
      const missing = openCurly - closeCurly;
      sanitized = sanitized + '}'.repeat(missing);
      issues.push('Added missing closing brace(s)');
    } else {
      sanitized = sanitized.replace(/^[^{]*}/, '');
      issues.push('Removed orphan closing brace(s)');
    }
  }

  // Validate search keys against allowlist
  const keyPattern = /\b([a-zA-Z]+)[:=<>]/g;
  let keyMatch;
  const unknownKeys: string[] = [];
  while ((keyMatch = keyPattern.exec(sanitized)) !== null) {
    const key = keyMatch[1].toLowerCase();
    if (!VALID_SEARCH_KEYS.has(key)) {
      unknownKeys.push(key);
    }
  }
  if (unknownKeys.length > 0) {
    issues.push(`Unknown search key(s): ${unknownKeys.join(', ')}`);
    for (const key of unknownKeys) {
      sanitized = sanitized
        .replace(new RegExp(`\\b${key}[:=<>][^\\s]*`, 'gi'), '')
        .trim();
    }
  }

  // Validate oracle tags against known list
  const otagPattern = /\botag:([a-z0-9-]+)\b/gi;
  const unknownTags: string[] = [];
  let tagMatch;
  while ((tagMatch = otagPattern.exec(sanitized)) !== null) {
    const tag = tagMatch[1].toLowerCase();
    if (!KNOWN_OTAGS.has(tag)) {
      unknownTags.push(tag);
    }
  }
  if (unknownTags.length > 0) {
    issues.push(`Unknown oracle tag(s): ${unknownTags.join(', ')}`);
    for (const tag of unknownTags) {
      sanitized = sanitized
        .replace(new RegExp(`\\botag:${tag}\\b`, 'gi'), '')
        .trim();
    }
    // Clean up orphaned boolean operators left after stripping tags
    sanitized = sanitized
      .replace(/\bor(\s+or)+\b/gi, 'or')   // "or or" → "or"
      .replace(/\(\s*or\b/g, '(')           // "( or …" → "( …"
      .replace(/\bor\s*\)/g, ')')           // "… or )" → "… )"
      .replace(/\(\s*\)/g, '')              // "()" → ""
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of sanitized) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) break;
  }
  if (parenCount !== 0) {
    sanitized = sanitized.replace(/[()]/g, '');
    issues.push('Removed unbalanced parentheses');
  }

  // Check for balanced quotes
  const doubleQuoteCount = (sanitized.match(/"/g) || []).length;
  if (doubleQuoteCount % 2 !== 0) {
    sanitized = sanitized + '"';
    issues.push('Added missing closing quote');
  }

  // Count single quotes that are NOT apostrophes (word-internal like "Thassa's" or plural possessive like "Praetors'")
  const strippedOfApostrophes = sanitized.replace(/\w'\w/g, '').replace(/\w'(?=\s|$)/g, '');
  const nonApostropheSingleQuotes = (strippedOfApostrophes.match(/'/g) || []).length;
  if (nonApostropheSingleQuotes % 2 !== 0) {
    sanitized = sanitized + "'";
    issues.push('Added missing closing quote');
  }

  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return { valid: issues.length === 0, sanitized, issues };
}

/**
 * Normalize OR groups by wrapping them in parentheses for Scryfall.
 * NOTE: A similar implementation exists in src/lib/scryfall/query.ts (client-side)
 * which additionally handles regex `/` delimiters. Keep both in sync.
 */
export function normalizeOrGroups(query: string): string {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;
  let inQuote = false;

  for (const char of query) {
    if (char === '"') {
      inQuote = !inQuote;
    }
    if (!inQuote && char === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);

  const output: string[] = [];
  let orGroup: string[] = [];
  let inOrGroup = false;

  const flushGroup = () => {
    if (inOrGroup && orGroup.length > 0) {
      output.push(`(${orGroup.join(' ')})`);
    }
    orGroup = [];
    inOrGroup = false;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const openCount = (token.match(/\(/g) || []).length;
    const closeCount = (token.match(/\)/g) || []).length;
    const depthBefore = depth;
    depth += openCount - closeCount;

    if (depthBefore === 0 && token === 'OR') {
      if (!inOrGroup) {
        const previous = output.pop();
        if (previous) {
          orGroup.push(previous);
        }
        inOrGroup = true;
      }
      orGroup.push(token);
      continue;
    }

    if (inOrGroup && depthBefore === 0) {
      orGroup.push(token);
      const nextToken = tokens[i + 1];
      if (!nextToken || nextToken !== 'OR') {
        flushGroup();
      }
      continue;
    }

    output.push(token);
  }

  if (inOrGroup) {
    flushGroup();
  }

  return output.join(' ');
}

/**
 * Detect quality flags in translated queries
 */
export function detectQualityFlags(translatedQuery: string): string[] {
  const flags: string[] = [];

  if (/game:(paper|arena|mtgo)/i.test(translatedQuery)) {
    flags.push('unnecessary_game_filter');
  }

  if (translatedQuery.includes('o:"enters the battlefield"')) {
    flags.push('verbose_etb_syntax');
  }
  if (translatedQuery.includes('o:"leaves the battlefield"')) {
    flags.push('verbose_ltb_syntax');
  }
  if (translatedQuery.includes('o:"when this creature dies"')) {
    flags.push('verbose_dies_syntax');
  }

  if ((translatedQuery.match(/o:"[^"]{50,}"/g) || []).length > 0) {
    flags.push('overly_long_oracle_text');
  }

  if ((translatedQuery.match(/\([^()]*\([^()]*\)/g) || []).length > 1) {
    flags.push('complex_nested_logic');
  }

  if (/o:"[a-zA-Z]+"(?!\s)/.test(translatedQuery)) {
    flags.push('unnecessary_quotes_single_word');
  }

  return flags;
}

/**
 * Apply automatic corrections for known mistakes.
 */
export function applyAutoCorrections(
  query: string,
  qualityFlags: string[],
): { correctedQuery: string; corrections: string[] } {
  let correctedQuery = query;
  const corrections: string[] = [];

  const beforeTagNorm = correctedQuery;
  correctedQuery = correctedQuery.replace(/\bfunction:/gi, 'otag:');
  correctedQuery = correctedQuery.replace(/\boracletag:/gi, 'otag:');
  if (correctedQuery !== beforeTagNorm) {
    corrections.push('Normalized tag syntax to otag: for consistency');
  }

  if (qualityFlags.includes('unnecessary_game_filter')) {
    const beforeFix = correctedQuery;
    correctedQuery = correctedQuery.replace(/game:paper\s*/gi, '').trim();
    if (correctedQuery !== beforeFix) {
      corrections.push('Removed unnecessary "game:paper" filter');
    }
  }

  if (qualityFlags.includes('verbose_etb_syntax')) {
    const beforeFix = correctedQuery;
    correctedQuery = correctedQuery.replace(
      /o:"enters the battlefield"/gi,
      'o:"enters"',
    );
    if (correctedQuery !== beforeFix) {
      corrections.push('Simplified ETB syntax for broader results');
    }
  }

  if (qualityFlags.includes('verbose_ltb_syntax')) {
    const beforeFix = correctedQuery;
    correctedQuery = correctedQuery.replace(
      /o:"leaves the battlefield"/gi,
      'o:"leaves"',
    );
    if (correctedQuery !== beforeFix) {
      corrections.push('Simplified LTB syntax for broader results');
    }
  }

  if (qualityFlags.includes('verbose_dies_syntax')) {
    const beforeFix = correctedQuery;
    correctedQuery = correctedQuery.replace(
      /o:"when this creature dies"/gi,
      'o:"dies"',
    );
    if (correctedQuery !== beforeFix) {
      corrections.push('Simplified "dies" syntax for broader results');
    }
  }

  correctedQuery = correctedQuery.replace(/\s+/g, ' ').trim();
  correctedQuery = correctedQuery.replace(/\(\s*\)/g, '').trim();

  return { correctedQuery, corrections };
}

export function runValidationTables(): void {
  const failures: string[] = [];

  for (const testCase of VALIDATION_CASES) {
    const result = validateQuery(testCase.query);

    if (result.valid !== testCase.expectedValid) {
      failures.push(
        `${testCase.name}: expected valid=${testCase.expectedValid} got ${result.valid}`,
      );
    }

    for (const expectedIssue of testCase.expectedIssues) {
      if (!result.issues.includes(expectedIssue)) {
        failures.push(`${testCase.name}: missing issue "${expectedIssue}"`);
      }
    }

    if (
      testCase.expectedSanitized !== undefined &&
      result.sanitized !== testCase.expectedSanitized
    ) {
      failures.push(
        `${testCase.name}: sanitized mismatch "${result.sanitized}"`,
      );
    }

    if (
      testCase.expectedSanitizedPrefix &&
      !result.sanitized.startsWith(testCase.expectedSanitizedPrefix)
    ) {
      failures.push(
        `${testCase.name}: sanitized prefix mismatch "${result.sanitized}"`,
      );
    }

    if (
      testCase.expectedSanitizedLength &&
      result.sanitized.length !== testCase.expectedSanitizedLength
    ) {
      failures.push(
        `${testCase.name}: sanitized length ${result.sanitized.length}`,
      );
    }

    if (
      testCase.expectedSanitizedMaxLength &&
      result.sanitized.length > testCase.expectedSanitizedMaxLength
    ) {
      failures.push(
        `${testCase.name}: sanitized length exceeds ${testCase.expectedSanitizedMaxLength}`,
      );
    }

    if (testCase.expectSanitizedValid) {
      const revalidation = validateQuery(result.sanitized);
      if (!revalidation.valid || revalidation.sanitized !== result.sanitized) {
        failures.push(`${testCase.name}: sanitized output fails revalidation`);
      }
    }
  }

  for (const testCase of AUTO_CORRECTION_CASES) {
    const flags = detectQualityFlags(testCase.query);
    const { correctedQuery, corrections } = applyAutoCorrections(
      testCase.query,
      flags,
    );
    if (correctedQuery !== testCase.expectedCorrectedQuery) {
      failures.push(
        `${testCase.name}: corrected query mismatch "${correctedQuery}"`,
      );
    }
    for (const expectedCorrection of testCase.expectedCorrections) {
      if (!corrections.includes(expectedCorrection)) {
        failures.push(
          `${testCase.name}: missing correction "${expectedCorrection}"`,
        );
      }
    }
  }

  if (failures.length > 0) {
    console.warn(
      JSON.stringify({ event: 'validation_table_failed', failures }),
    );
  } else {
    console.log(JSON.stringify({ event: 'validation_table_passed' }));
  }
}
