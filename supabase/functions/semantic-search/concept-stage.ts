import { applyFiltersToQuery } from './fallback.ts';
import { validateQuery } from './validation.ts';
import { logTranslation } from './logging.ts';
import { createSearchSuccessResponse } from './responses.ts';

export type ConceptMatchLike = {
  conceptId: string;
  confidence: number;
  category: string;
  description?: string;
  pattern?: string;
  scryfallSyntax: string;
  matchType?: string;
  similarity: number;
};

type JsonHeaders = Record<string, string>;

type ConceptStageArgs = {
  query: string;
  filters: Record<string, unknown> | null;
  cacheSalt: string | undefined;
  deterministicQuery: string;
  deterministicHandledWords: Set<string>;
  meaningfulResidual: string;
  residualForConcepts: string;
  requestStartTime: number;
  stageDurationsMs: Partial<Record<string, number>>;
  queryPrefix?: number;
  logInfo: (event: string, payload: Record<string, unknown>) => void;
  logWarn: (event: string, payload: Record<string, unknown>) => void;
  jsonHeaders: JsonHeaders;
  setCachedResult: (
    query: string,
    filters: Record<string, unknown> | null,
    payload: Record<string, unknown>,
    cacheSalt: string | undefined,
  ) => void;
  flushLogQueue: () => void;
  findConceptMatches: (
    residual: string,
    maxConcepts: number,
    threshold: number,
    skipLLMClassification?: boolean,
  ) => Promise<ConceptMatchLike[]>;
};

function buildPerfLogFields(
  stageDurationsMs: Partial<Record<string, number>>,
  source: string,
  responseTimeMs: number,
): Record<string, unknown> {
  return {
    source,
    responseTimeMs,
    stageDurationsMs: {
      deterministic: stageDurationsMs.deterministic ?? null,
      cache: stageDurationsMs.cache ?? null,
      pattern: stageDurationsMs.pattern ?? null,
      preTranslate: stageDurationsMs.preTranslate ?? null,
      ai: stageDurationsMs.ai ?? null,
      fallback: stageDurationsMs.fallback ?? null,
    },
  };
}

export async function tryConceptStage(
  args: ConceptStageArgs,
): Promise<Response | null> {
  if (args.meaningfulResidual.length < 3) {
    return null;
  }

  const budgetBeforeConcepts = 8000; // caller already enforces request budget
  const skipLLMClassification = budgetBeforeConcepts < 4000;

  try {
    const concepts = await args.findConceptMatches(
      args.residualForConcepts,
      5,
      0.7,
      skipLLMClassification,
    );

    const deterministicTypes = (
      (args.deterministicQuery || '').match(/\bt:(\w+)/g) || []
    ).map((t) => t.replace('t:', ''));

    const relevantConcepts = concepts.filter((c) => {
      const conceptTypes = (c.scryfallSyntax.match(/\bt:(\w+)/g) || []).map(
        (t) => t.replace('t:', ''),
      );

      if (conceptTypes.length > 0 && deterministicTypes.length > 0) {
        const hasConflict = conceptTypes.some(
          (ct) =>
            deterministicTypes.length > 0 && !deterministicTypes.includes(ct),
        );
        if (hasConflict) return false;
      }

      if (c.matchType === 'alias' && c.similarity < 0.9) {
        const aliasWords = (c.pattern || '').toLowerCase().split(/\s+/);
        const queryWords = new Set(
          args.residualForConcepts.toLowerCase().split(/\s+/),
        );
        const aliasWordsCovered = aliasWords.filter((w) => queryWords.has(w));
        if (aliasWordsCovered.length < aliasWords.length) return false;
      }

      return true;
    });

    const allResidualWords = args.meaningfulResidual
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3);
    const residualWords = allResidualWords.filter(
      (w) => !args.deterministicHandledWords.has(w),
    );

    const conceptCoveredWords = new Set<string>();
    for (const c of relevantConcepts) {
      for (const w of (c.conceptId || '').toLowerCase().split(/[_\s]+/)) {
        if (w.length >= 3) conceptCoveredWords.add(w);
      }
      for (const alias of (c.pattern || '').toLowerCase().split(/\s+/)) {
        if (alias.length >= 3) conceptCoveredWords.add(alias);
      }
    }

    const coveredWords = residualWords.filter((w) =>
      conceptCoveredWords.has(w),
    );
    const coverageRatio =
      residualWords.length > 0
        ? coveredWords.length / residualWords.length
        : relevantConcepts.length > 0
          ? 1
          : 0;

    args.logInfo('concept_match_coverage_check', {
      query: args.query.substring(0, 50),
      residualWords: residualWords.length,
      coveredCount: coveredWords.length,
      coverageRatio: Math.round(coverageRatio * 100),
      conceptIds: relevantConcepts.map((c) => c.conceptId),
    });

    const isShortResidual = residualWords.length <= 2;
    const effectiveConcepts = isShortResidual
      ? relevantConcepts.filter((c) => c.confidence >= 0.95).slice(0, 1)
      : relevantConcepts;

    if (
      effectiveConcepts.length > 0 &&
      effectiveConcepts[0].confidence >= 0.85 &&
      coverageRatio >= 0.4
    ) {
      const seenCategories = new Set<string>();
      const dedupedConcepts = effectiveConcepts.filter((c) => {
        const normCat = (c.category || '')
          .toLowerCase()
          .replace(/\b(cards?\s+that\s+|spells?\s*)/g, '')
          .trim();
        if (seenCategories.has(normCat)) return false;
        seenCategories.add(normCat);
        return true;
      });

      const userSpecifiedColor =
        args.deterministicQuery &&
        /\b(c|ci)(:|<=|>=|=|<|>)\S+/i.test(args.deterministicQuery);
      const conceptParts = dedupedConcepts
        .map((c) => {
          let syntax = c.scryfallSyntax;
          if (!userSpecifiedColor) {
            syntax = syntax
              .replace(/\b(c|ci)(:|<=|>=|=|<|>)\S+/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
          }
          return syntax;
        })
        .filter(Boolean);

      let conceptQuery = conceptParts.join(' ');
      if (args.deterministicQuery) {
        conceptQuery = `${args.deterministicQuery} ${conceptQuery}`;
      }
      conceptQuery = applyFiltersToQuery(conceptQuery, args.filters);
      const validation = validateQuery(conceptQuery);
      const responseTimeMs = Date.now() - args.requestStartTime;
      const readableDesc = dedupedConcepts
        .map((c) => c.description || c.conceptId)
        .join(', ');
      const conceptIds = dedupedConcepts.map((c) => c.conceptId).join(', ');

      args.logInfo('concept_match_hit', {
        query: args.query.substring(0, 50),
        concepts: dedupedConcepts.map((c) => c.conceptId),
        responseTimeMs,
      });
      args.logInfo(
        'request_completed',
        buildPerfLogFields(
          args.stageDurationsMs,
          'pattern_match',
          responseTimeMs,
        ),
      );

      args.setCachedResult(
        args.query,
        args.filters,
        {
          scryfallQuery: validation.sanitized,
          explanation: {
            readable: `Searching for: ${readableDesc}`,
            assumptions: [`Matched concepts: ${conceptIds}`],
            confidence: concepts[0].confidence,
          },
          showAffiliate: true,
        },
        args.cacheSalt,
      );

      logTranslation(
        args.query,
        validation.sanitized,
        concepts[0].confidence,
        responseTimeMs,
        [],
        [],
        args.filters,
        false,
        'concept_match',
      );
      args.flushLogQueue();

      return createSearchSuccessResponse(
        args.query,
        {
          scryfallQuery: validation.sanitized,
          explanation: {
            readable: `Searching for: ${readableDesc}`,
            assumptions: [`Matched concepts: ${conceptIds}`],
            confidence: concepts[0].confidence,
          },
        },
        responseTimeMs,
        'concept_match',
        args.jsonHeaders,
      );
    }

    if (concepts.length > 0 && coverageRatio < 0.4) {
      args.logInfo('concept_match_low_coverage', {
        query: args.query.substring(0, 50),
        coverageRatio: Math.round(coverageRatio * 100),
        residualWords: residualWords.length,
        coveredWords: coveredWords.length,
      });
    }
  } catch (conceptErr) {
    args.logWarn('concept_match_error', {
      error:
        conceptErr instanceof Error ? conceptErr.message : String(conceptErr),
    });
  }

  return null;
}
