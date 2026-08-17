import type { SearchIntent } from '@/types/search';

export const RECOMMENDATION_VERSION = 'v2' as const;

export type RecommendationMode =
  'search' | 'similarity' | 'budget' | 'role-replacement';

export interface RecommendationConstraints {
  maxPrice?: number;
  format?: string;
  colors?: string[];
  exactColorIdentity?: boolean;
  types?: string[];
  minManaValue?: number;
  maxManaValue?: number;
}

export interface RecommendationSignal {
  signal: string;
  confidence: number;
}

export interface StructuralSignals {
  types: string[];
  manaValue?: number;
  colorIdentity: string[];
}

export interface RecommendationIntent {
  version: typeof RECOMMENDATION_VERSION;
  mode: RecommendationMode;
  sourceCardId?: string;
  sourceCardName?: string;
  hardConstraints: RecommendationConstraints;
  functionalSignals: RecommendationSignal[];
  structuralSignals: StructuralSignals;
  exclusions: string[];
  confidence: number;
  searchIntent?: SearchIntent | null;
}

export type QueryPlanStrategy =
  | 'exact-functional'
  | 'functional-expansion'
  | 'oracle-mechanic'
  | 'structural'
  | 'fallback';

export interface QueryPlan {
  id: string;
  strategy: QueryPlanStrategy;
  query: string;
  signal: string;
  confidence: number;
  weight: number;
  priceCeiling?: number;
}

export interface CandidateProvenance {
  planId: string;
  strategy: QueryPlanStrategy;
  sourceRank: number;
  planWeight: number;
  signal: string;
}

export interface RankingScoreBreakdown {
  semanticCoverage: number;
  structuralCoverage: number;
  popularity: number;
  provenancePrior: number;
  affordability?: number;
  finalScore: number;
  confidence: number;
  rankerVersion: typeof RECOMMENDATION_VERSION;
}
