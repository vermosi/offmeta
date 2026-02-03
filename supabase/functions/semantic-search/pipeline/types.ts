/**
 * Pipeline Type Definitions
 * Shared types for the semantic search translation pipeline
 */

export type IntentMode =
  | 'find_cards'
  | 'find_card_by_name'
  | 'rules_question'
  | 'deck_help';

export type CardFunction =
  | 'ramp'
  | 'removal'
  | 'counterspell'
  | 'draw'
  | 'tutor'
  | 'wipe'
  | 'reanimation'
  | 'recursion'
  | 'blink'
  | 'stax'
  | 'tokens'
  | 'sacrifice'
  | 'graveyard'
  | 'artifacts_matter'
  | 'enchantress'
  | 'lifegain'
  | 'mill'
  | 'wheel'
  | 'voltron';

export interface ClassifiedIntent {
  mode: IntentMode;
  functions: Array<{ function: CardFunction; confidence: number }>;
  cardNameCandidate: string | null;
  isCardNameSearch: boolean;
}

export interface ExtractedSlots {
  format: string | null;
  colors: {
    values: string[];
    mode: 'identity' | 'color';
    operator: 'or' | 'and' | 'exact' | 'within' | 'include';
  } | null;
  types: {
    include: string[]; // AND'd types: t:creature t:legendary (must have ALL)
    includeOr: string[]; // OR'd types: (t:artifact or t:land) (must have ANY)
    exclude: string[]; // Negated: -t:creature (must NOT have)
  };
  subtypes: string[];
  mv: { op: string; value: number } | null;
  power: { op: string; value: number } | null;
  toughness: { op: string; value: number } | null;
  year: { op: string; value: number } | null;
  price: { op: string; value: number } | null;
  rarity: string | null;
  includeText: string[];
  excludeText: string[];
  tags: string[];
  specials: string[];
  residual: string;
}

export interface ConceptMatch {
  conceptId: string;
  pattern: string;
  scryfallSyntax: string;
  templates: string[];
  negativeTemplates: string[];
  description: string | null;
  confidence: number;
  category: string;
  priority: number;
  similarity: number;
  matchType: 'vector' | 'alias' | 'exact';
}

export interface AssembledQuery {
  query: string;
  parts: string[];
  conceptsApplied: string[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  status: number;
  totalCards?: number;
  error?: string;
  warnings?: string[];
  overlyBroad?: boolean;
  zeroResults?: boolean;
}

export interface RepairResult {
  originalQuery: string;
  repairedQuery: string;
  steps: string[];
  success: boolean;
  validation: ValidationResult | null;
}

export interface BroadenResult {
  originalQuery: string;
  broadenedQuery: string;
  relaxedConstraints: string[];
  validation: ValidationResult | null;
}

export interface PipelineResult {
  originalQuery: string;
  normalizedQuery: string;
  intent: ClassifiedIntent;
  slots: ExtractedSlots;
  concepts: ConceptMatch[];
  assembledQuery: AssembledQuery;
  finalQuery: string;
  validation: ValidationResult | null;
  repairs: RepairResult | null;
  broadening: BroadenResult | null;
  explanation: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  source: 'deterministic' | 'concept_match' | 'ai' | 'fallback';
  responseTimeMs: number;
  debug?: {
    slots: ExtractedSlots;
    concepts: ConceptMatch[];
    repairSteps?: string[];
  };
}

export interface PipelineOptions {
  useCache?: boolean;
  cacheSalt?: string;
  validateWithScryfall?: boolean;
  maxConcepts?: number;
  conceptThreshold?: number;
  overlyBroadThreshold?: number;
  enableRepair?: boolean;
  enableBroadening?: boolean;
  debug?: boolean;
}

export interface PipelineContext {
  requestId: string;
  startTime: number;
  options: PipelineOptions;
  filters?: {
    format?: string;
    colorIdentity?: string[];
    maxCmc?: number;
  };
}
