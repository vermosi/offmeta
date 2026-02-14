/**
 * Stages 6-8: Validation, Repair, and Broadening
 * Ensures queries are valid and return results
 */

import type { ValidationResult, RepairResult, BroadenResult } from './types.ts';
import { fetchWithRetry } from '../utils.ts';

const SCRYFALL_SEARCH_URL = 'https://api.scryfall.com/cards/search';

/**
 * Fast, synchronous pre-pass that fixes common syntax defects
 * (e.g. "or or", leading/trailing "or" in groups, empty parens)
 * without hitting Scryfall.
 */
export function sanitizeQuerySyntax(query: string): string {
  let q = query;
  // Collapse "or or" → "or"
  q = q.replace(/\bor(\s+or)+\b/gi, 'or');
  // Remove leading "or" inside parens: "( or …" → "( …"
  q = q.replace(/\(\s*or\b/g, '(');
  // Remove trailing "or" before parens: "… or )" → "… )"
  q = q.replace(/\bor\s*\)/g, ')');
  // Remove empty parens
  q = q.replace(/\(\s*\)/g, '');
  // Collapse whitespace
  q = q.replace(/\s+/g, ' ').trim();
  return q;
}

/**
 * Validates a query against Scryfall API
 */
export async function validateWithScryfall(
  query: string,
  overlyBroadThreshold: number = 1500,
): Promise<ValidationResult> {
  const url = `${SCRYFALL_SEARCH_URL}?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchWithRetry(url);

    if (response.status === 200) {
      const data = await response.json();
      return {
        valid: true,
        status: 200,
        totalCards: data.total_cards,
        overlyBroad: data.total_cards > overlyBroadThreshold,
        zeroResults: data.total_cards === 0,
        warnings: data.warnings,
      };
    }

    if (response.status === 404) {
      return {
        valid: true,
        status: 404,
        totalCards: 0,
        zeroResults: true,
      };
    }

    const errorData = await response.json();
    return {
      valid: false,
      status: response.status,
      error: errorData.details || 'Unknown Scryfall error',
      warnings: errorData.warnings,
    };
  } catch (e) {
    return {
      valid: false,
      status: 500,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

// Repair strategies in order of preference
const REPAIR_STRATEGIES: Array<{
  name: string;
  pattern: RegExp;
  action: 'remove' | 'replace';
  replacement?: string;
}> = [
  // 0. Fix double-or syntax ("or or" → "or")
  {
    name: 'fix_double_or',
    pattern: /\bor\s+or\b/gi,
    action: 'replace',
    replacement: 'or',
  },

  // 0b. Fix leading or inside parens ("( or" → "(")
  {
    name: 'fix_leading_or',
    pattern: /\(\s+or\b/g,
    action: 'replace',
    replacement: '(',
  },

  // 0c. Fix trailing or before parens ("or )" → ")")
  {
    name: 'fix_trailing_or',
    pattern: /\bor\s+\)/g,
    action: 'replace',
    replacement: ')',
  },

  // 0d. Remove empty parens left after cleanup
  {
    name: 'remove_empty_parens',
    pattern: /\(\s*\)/g,
    action: 'remove',
  },

  // 1. Remove regex tokens (often problematic)
  { name: 'remove_regex', pattern: /\bo:\/[^/]+\//g, action: 'remove' },

  // 2. Remove invalid oracle tags
  {
    name: 'remove_unknown_otag',
    pattern: /\botag:[a-z-]+\b/gi,
    action: 'remove',
  },

  // 3. Fix common syntax errors
  {
    name: 'fix_double_colon',
    pattern: /::/g,
    action: 'replace',
    replacement: ':',
  },
  {
    name: 'fix_double_equals',
    pattern: /==/g,
    action: 'replace',
    replacement: '=',
  },

  // 4. Remove speculative constraints
  { name: 'remove_is_reprint', pattern: /\s*is:reprint\b/gi, action: 'remove' },
  {
    name: 'remove_is_firstprint',
    pattern: /\s*is:firstprint\b/gi,
    action: 'remove',
  },
  { name: 'remove_year', pattern: /\s*year[<>=]+\d+\b/gi, action: 'remove' },
  { name: 'remove_usd', pattern: /\s*usd[<>=]+\d+\b/gi, action: 'remove' },

  // 5. Simplify complex oracle searches
  { name: 'simplify_oracle', pattern: /\bo:"[^"]{40,}"/g, action: 'remove' },

  // 6. Remove nested parentheses (simplify)
  {
    name: 'flatten_parens',
    pattern: /\(\s*\(/g,
    action: 'replace',
    replacement: '(',
  },
];

/**
 * Attempts to repair an invalid query
 */
export async function repairQuery(
  query: string,
  originalError?: string,
  overlyBroadThreshold: number = 1500,
): Promise<RepairResult> {
  let currentQuery = query;
  const steps: string[] = [];

  // Try each repair strategy
  for (const strategy of REPAIR_STRATEGIES) {
    if (!strategy.pattern.test(currentQuery)) continue;

    const before = currentQuery;

    if (strategy.action === 'remove') {
      currentQuery = currentQuery.replace(strategy.pattern, '').trim();
    } else if (
      strategy.action === 'replace' &&
      strategy.replacement !== undefined
    ) {
      currentQuery = currentQuery
        .replace(strategy.pattern, strategy.replacement)
        .trim();
    }

    // Clean up extra whitespace
    currentQuery = currentQuery.replace(/\s+/g, ' ').trim();

    if (currentQuery !== before) {
      steps.push(strategy.name);

      // Validate after each repair
      const validation = await validateWithScryfall(
        currentQuery,
        overlyBroadThreshold,
      );

      if (validation.valid && !validation.zeroResults) {
        return {
          originalQuery: query,
          repairedQuery: currentQuery,
          steps,
          success: true,
          validation,
        };
      }
    }
  }

  // If all strategies failed, return the best attempt
  const finalValidation = await validateWithScryfall(
    currentQuery,
    overlyBroadThreshold,
  );

  return {
    originalQuery: query,
    repairedQuery: currentQuery,
    steps,
    success: finalValidation.valid,
    validation: finalValidation,
  };
}

// Broadening strategies for zero-result queries
const BROADEN_STRATEGIES: Array<{
  name: string;
  pattern: RegExp;
  action: 'remove' | 'relax_mv';
  description: string;
}> = [
  // 1. Relax mana value constraints
  {
    name: 'relax_mv',
    pattern: /\bmv<=(\d+)\b/gi,
    action: 'relax_mv',
    description: 'Increased mana value limit',
  },

  // 2. Remove format restrictions
  {
    name: 'remove_format',
    pattern: /\s*f:\w+\b/gi,
    action: 'remove',
    description: 'Removed format restriction',
  },

  // 3. Remove price restrictions
  {
    name: 'remove_price',
    pattern: /\s*usd[<>=]+\d+\b/gi,
    action: 'remove',
    description: 'Removed price filter',
  },

  // 4. Remove secondary type exclusions
  {
    name: 'remove_type_exclusion',
    pattern: /\s*-t:\w+\b/gi,
    action: 'remove',
    description: 'Removed type exclusion',
  },

  // 5. Simplify color constraints
  {
    name: 'simplify_color',
    pattern: /\bci?<=?\w+\b/gi,
    action: 'remove',
    description: 'Removed color restriction',
  },

  // 6. Remove year constraints
  {
    name: 'remove_year',
    pattern: /\s*year[<>=]+\d+\b/gi,
    action: 'remove',
    description: 'Removed year filter',
  },
];

/**
 * Attempts to broaden a query that returns zero results
 */
export async function broadenQuery(
  query: string,
  overlyBroadThreshold: number = 1500,
): Promise<BroadenResult> {
  let currentQuery = query;
  const relaxedConstraints: string[] = [];

  for (const strategy of BROADEN_STRATEGIES) {
    if (!strategy.pattern.test(currentQuery)) continue;

    const before = currentQuery;

    if (strategy.action === 'remove') {
      currentQuery = currentQuery.replace(strategy.pattern, '').trim();
    } else if (strategy.action === 'relax_mv') {
      // Special handling for mana value relaxation
      currentQuery = currentQuery
        .replace(/\bmv<=(\d+)\b/gi, (_match, num) => {
          const value = parseInt(num);
          return `mv<=${value + 1}`;
        })
        .trim();
    }

    // Clean up
    currentQuery = currentQuery.replace(/\s+/g, ' ').trim();

    if (currentQuery !== before) {
      relaxedConstraints.push(strategy.description);

      // Validate
      const validation = await validateWithScryfall(
        currentQuery,
        overlyBroadThreshold,
      );

      if (validation.valid && !validation.zeroResults) {
        return {
          originalQuery: query,
          broadenedQuery: currentQuery,
          relaxedConstraints,
          validation,
        };
      }
    }
  }

  // Return best attempt
  const finalValidation = await validateWithScryfall(
    currentQuery,
    overlyBroadThreshold,
  );

  return {
    originalQuery: query,
    broadenedQuery: currentQuery,
    relaxedConstraints,
    validation: finalValidation,
  };
}

/**
 * Full validation, repair, and broadening pipeline
 */
export async function validateAndFixQuery(
  query: string,
  options: {
    enableRepair?: boolean;
    enableBroadening?: boolean;
    overlyBroadThreshold?: number;
  } = {},
): Promise<{
  finalQuery: string;
  validation: ValidationResult | null;
  repairs: RepairResult | null;
  broadening: BroadenResult | null;
}> {
  const {
    enableRepair = true,
    enableBroadening = true,
    overlyBroadThreshold = 1500,
  } = options;

  // Pre-pass: fix common syntax defects without hitting Scryfall
  const sanitized = sanitizeQuerySyntax(query);

  // Initial validation
  let validation = await validateWithScryfall(sanitized, overlyBroadThreshold);
  let finalQuery = sanitized;
  let repairs: RepairResult | null = null;
  let broadening: BroadenResult | null = null;

  // If invalid, try to repair
  if (!validation.valid && enableRepair) {
    repairs = await repairQuery(query, validation.error, overlyBroadThreshold);
    if (repairs.success) {
      finalQuery = repairs.repairedQuery;
      validation = repairs.validation!;
    }
  }

  // If zero results, try to broaden
  if (validation.valid && validation.zeroResults && enableBroadening) {
    broadening = await broadenQuery(finalQuery, overlyBroadThreshold);
    if (broadening.validation && !broadening.validation.zeroResults) {
      finalQuery = broadening.broadenedQuery;
      validation = broadening.validation;
    }
  }

  return { finalQuery, validation, repairs, broadening };
}
