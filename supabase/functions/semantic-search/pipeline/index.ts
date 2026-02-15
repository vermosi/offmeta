/**
 * Semantic Search Translation Pipeline
 *
 * Orchestrates the full translation pipeline:
 * 1. Normalize - Text cleanup
 * 2. Classify - Intent detection
 * 3. Extract slots - Structured constraints
 * 4. Match concepts - Vector/alias similarity
 * 5. Assemble query - Build Scryfall syntax
 * 6. Validate - Check with Scryfall API
 * 7. Repair - Fix invalid queries
 * 8. Broaden - Relax zero-result queries
 */

import type {
  PipelineResult,
  PipelineContext,
  ExtractedSlots,
  ConceptMatch,
  ValidationResult,
  RepairResult,
  BroadenResult,
} from './types.ts';
import { normalizeQuery, isRawScryfallSyntax } from './normalize.ts';
import { classifyIntent } from './classify.ts';
import { extractSlots } from './slots.ts';
import { findConceptMatches } from './concepts.ts';
import { assembleQuery, applyExternalFilters } from './assemble.ts';
import { validateAndFixQuery } from './repair.ts';
import {
  detectQueryConflicts,
  hasImpossibleTypeCombination,
} from './conflicts.ts';
import { buildDeterministicIntent } from '../deterministic/index.ts';
import { validateQuery as sanitizeQuery } from '../validation.ts';

/**
 * Main pipeline entry point
 */
export async function runPipeline(
  query: string,
  context: PipelineContext,
): Promise<PipelineResult> {
  const { startTime, options, filters } = context;

  const {
    validateWithScryfall = false,
    maxConcepts = 5,
    conceptThreshold = 0.7,
    overlyBroadThreshold = 1500,
    enableRepair = true,
    enableBroadening = true,
    debug = false,
  } = options;

  // Stage 1: Normalize
  const normalized = normalizeQuery(query);

  // Check if query is already Scryfall syntax
  if (isRawScryfallSyntax(query)) {
    const sanitized = sanitizeQuery(query);
    return buildResult({
      originalQuery: query,
      normalizedQuery: query,
      finalQuery: sanitized.sanitized,
      source: 'deterministic',
      explanation: {
        readable: 'Using raw Scryfall syntax',
        assumptions: sanitized.issues,
        confidence: 1.0,
      },
      startTime,
      debug,
      slots: emptySlots(),
      concepts: [],
    });
  }

  // Stage 2: Classify intent
  const intent = classifyIntent(normalized.normalized);

  // Stage 3: Extract slots
  const slots = extractSlots(normalized.normalized);

  // Try deterministic path first
  const deterministicResult = buildDeterministicIntent(query);
  const hasDeterministicQuery =
    deterministicResult.deterministicQuery.trim().length > 0;
  const hasResidual =
    slots.residual.trim().length > 0 ||
    deterministicResult.intent.remainingQuery?.trim().length > 0;

  // If we have a complete deterministic query with no residual, use it
  if (hasDeterministicQuery && !hasResidual) {
    let finalQuery = deterministicResult.deterministicQuery;
    finalQuery = applyExternalFilters(finalQuery, filters);
    const sanitized = sanitizeQuery(finalQuery);

    return buildResult({
      originalQuery: query,
      normalizedQuery: normalized.normalized,
      intent,
      slots,
      concepts: [],
      finalQuery: sanitized.sanitized,
      source: 'deterministic',
      explanation: {
        readable: `Searching for: ${query}`,
        assumptions: [
          ...deterministicResult.intent.warnings,
          ...sanitized.issues,
        ],
        confidence: 0.95,
      },
      startTime,
      debug,
    });
  }

  // Stage 4: Match concepts from residual
  const residualForConcepts =
    slots.residual || deterministicResult.intent.remainingQuery || '';
  let concepts: ConceptMatch[] = [];

  if (residualForConcepts.trim().length > 0) {
    concepts = await findConceptMatches(
      residualForConcepts,
      maxConcepts,
      conceptThreshold,
    );
  }

  // Stage 5: Assemble query
  const assembled = assembleQuery(slots, concepts, { maxQueryLength: 400 });

  // IMPROVED MERGE LOGIC: Prevent duplicate types between deterministic and assembled query
  //
  // The key insight: both paths can extract types independently, causing duplicates.
  // Solution: If slots already extracted types, don't take type parts from deterministic.
  // If deterministic has OR groups in specials (like "(t:instant or t:sorcery)"), only add
  // those if slots didn't already create them.

  const slotsHaveTypes =
    slots.types.include.length > 0 ||
    (slots.types.includeOr && slots.types.includeOr.length > 0);

  let mergedQuery = assembled.query;

  if (hasDeterministicQuery) {
    const deterministicParts = deterministicResult.deterministicQuery
      .split(' ')
      .filter(Boolean);

    // Categorize deterministic parts
    const typeParts: string[] = [];
    const nonTypeParts: string[] = [];

    for (const part of deterministicParts) {
      if (
        part.startsWith('t:') ||
        part.startsWith('-t:') ||
        (part.startsWith('(') && part.includes('t:'))
      ) {
        typeParts.push(part);
      } else {
        nonTypeParts.push(part);
      }
    }

    if (slotsHaveTypes) {
      // Slots already handled types - only take non-type parts from deterministic
      if (nonTypeParts.length > 0 && assembled.query) {
        // Add non-type parts that aren't already in assembled query
        const assembledLower = assembled.query.toLowerCase();
        const newParts = nonTypeParts.filter(
          (p) => !assembledLower.includes(p.toLowerCase()),
        );
        if (newParts.length > 0) {
          mergedQuery = `${assembled.query} ${newParts.join(' ')}`;
        }
      }
    } else if (!assembled.query) {
      // No slots extracted anything, use deterministic query
      mergedQuery = deterministicResult.deterministicQuery;
    } else {
      // Assembled has some parts but no types - merge carefully
      // Start with assembled, add deterministic parts that aren't duplicates
      const assembledParts = assembled.query.split(' ').filter(Boolean);
      const allParts = [...assembledParts];

      for (const part of deterministicParts) {
        // Skip if already present (case-insensitive)
        if (!allParts.some((p) => p.toLowerCase() === part.toLowerCase())) {
          allParts.push(part);
        }
      }
      mergedQuery = allParts.join(' ');
    }
  }

  // Run conflict detection to remove duplicates and fix impossible combinations
  const queryParts = mergedQuery.split(' ').filter(Boolean);
  const {
    conflicts,
    deduplicated,
    warnings: conflictWarnings,
  } = detectQueryConflicts(queryParts);
  mergedQuery = deduplicated.join(' ');

  // Check for impossible type combinations and warn
  if (hasImpossibleTypeCombination(mergedQuery)) {
    conflictWarnings.push('Query may have impossible type combinations');
  }

  // Apply external filters
  mergedQuery = applyExternalFilters(mergedQuery, filters);

  // Sanitize
  const sanitized = sanitizeQuery(mergedQuery);
  let finalQuery = sanitized.sanitized;

  // Stage 6-8: Validate, repair, broaden
  let validation = null;
  let repairs = null;
  let broadening = null;

  if (validateWithScryfall) {
    const validationResult = await validateAndFixQuery(finalQuery, {
      enableRepair,
      enableBroadening,
      overlyBroadThreshold,
    });

    finalQuery = validationResult.finalQuery;
    validation = validationResult.validation;
    repairs = validationResult.repairs;
    broadening = validationResult.broadening;
  }

  // Determine source
  const source = concepts.length > 0 ? 'concept_match' : 'deterministic';

  // Build explanation
  const assumptions: string[] = [
    ...deterministicResult.intent.warnings,
    ...assembled.warnings,
    ...sanitized.issues,
    ...conflicts,
    ...conflictWarnings,
  ];

  if (concepts.length > 0) {
    assumptions.push(
      `Matched concepts: ${concepts.map((c) => c.conceptId).join(', ')}`,
    );
  }

  if (repairs?.steps.length) {
    assumptions.push(`Repaired query: ${repairs.steps.join(', ')}`);
  }

  if (broadening?.relaxedConstraints.length) {
    assumptions.push(
      `Broadened search: ${broadening.relaxedConstraints.join(', ')}`,
    );
  }

  const confidence = calculateConfidence(
    hasDeterministicQuery,
    concepts.length,
    validation?.valid ?? true,
    repairs?.success ?? true,
  );

  return buildResult({
    originalQuery: query,
    normalizedQuery: normalized.normalized,
    intent,
    slots,
    concepts,
    assembled,
    finalQuery,
    validation,
    repairs,
    broadening,
    source,
    explanation: {
      readable: buildReadableExplanation(query, slots, concepts),
      assumptions,
      confidence,
    },
    startTime,
    debug,
  });
}

interface ValidationResultWrapper {
  finalQuery: string;
  validation: ValidationResult | null;
  repairs: RepairResult | null;
  broadening: BroadenResult | null;
}

/**
 * Builds the final pipeline result
 */
function buildResult(params: {
  originalQuery: string;
  normalizedQuery: string;
  intent?: ReturnType<typeof classifyIntent>;
  slots: ExtractedSlots;
  concepts: ConceptMatch[];
  assembled?: ReturnType<typeof assembleQuery>;
  finalQuery: string;
  validation?: ValidationResultWrapper['validation'];
  repairs?: ValidationResultWrapper['repairs'];
  broadening?: ValidationResultWrapper['broadening'];
  source: PipelineResult['source'];
  explanation: PipelineResult['explanation'];
  startTime: number;
  debug: boolean;
}): PipelineResult {
  const responseTimeMs = Date.now() - params.startTime;

  return {
    originalQuery: params.originalQuery,
    normalizedQuery: params.normalizedQuery,
    intent: params.intent || {
      mode: 'find_cards',
      functions: [],
      cardNameCandidate: null,
      isCardNameSearch: false,
    },
    slots: params.slots,
    concepts: params.concepts,
    assembledQuery: params.assembled || {
      query: params.finalQuery,
      parts: [],
      conceptsApplied: [],
      warnings: [],
    },
    finalQuery: params.finalQuery,
    validation: params.validation ?? null,
    repairs: params.repairs ?? null,
    broadening: params.broadening ?? null,
    explanation: params.explanation,
    source: params.source,
    responseTimeMs,
    debug: params.debug
      ? {
          slots: params.slots,
          concepts: params.concepts,
          repairSteps: params.repairs?.steps,
        }
      : undefined,
  };
}

/**
 * Creates empty slots structure
 */
function emptySlots(): ExtractedSlots {
  return {
    format: null,
    colors: null,
    types: { include: [], includeOr: [], exclude: [] },
    subtypes: [],
    mv: null,
    power: null,
    toughness: null,
    year: null,
    price: null,
    rarity: null,
    includeText: [],
    excludeText: [],
    tags: [],
    specials: [],
    residual: '',
  };
}

/**
 * Calculates confidence score based on pipeline stages
 */
function calculateConfidence(
  hasDeterministic: boolean,
  conceptCount: number,
  isValid: boolean,
  repairSucceeded: boolean,
): number {
  let confidence = 0.5;

  if (hasDeterministic) confidence += 0.3;
  if (conceptCount > 0) confidence += 0.1;
  if (isValid) confidence += 0.05;
  if (repairSucceeded) confidence += 0.05;

  return Math.min(confidence, 1.0);
}

/**
 * Builds a human-readable explanation of what the query is searching for
 */
function buildReadableExplanation(
  originalQuery: string,
  slots: ExtractedSlots,
  concepts: ConceptMatch[],
): string {
  const parts: string[] = [];

  // Format
  if (slots.format) {
    parts.push(`${slots.format}-legal`);
  }

  // Colors
  if (slots.colors) {
    const colorNames: Record<string, string> = {
      w: 'white',
      u: 'blue',
      b: 'black',
      r: 'red',
      g: 'green',
      c: 'colorless',
    };
    const colors = slots.colors.values.map((c) => colorNames[c] || c).join('/');
    parts.push(colors);
  }

  // Types
  if (slots.types.include.length > 0) {
    parts.push(slots.types.include.join('/'));
  }

  // Concepts
  if (concepts.length > 0) {
    const conceptDescriptions = concepts.map(
      (c) => c.description || c.conceptId,
    );
    parts.push(conceptDescriptions.join(', '));
  }

  if (parts.length === 0) {
    return `Searching for: ${originalQuery}`;
  }

  return `Searching for ${parts.join(' ')}`;
}

// Re-export types for convenience
export * from './types.ts';
