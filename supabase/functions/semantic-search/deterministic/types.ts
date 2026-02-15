/**
 * Deterministic Translation – Type Definitions
 * @module deterministic/types
 */

export interface ParsedIntent {
  colors: {
    values: string[];
    isIdentity: boolean;
    isExact: boolean;
    isOr: boolean;
  } | null;

  types: string[];
  subtypes: string[];

  cmc: { op: string; value: number } | null;
  power: { op: string; value: number } | null;
  toughness: { op: string; value: number } | null;

  isCommander: boolean;
  format: string | null;
  yearConstraint: { op: string; year: number } | null;
  priceConstraint: { op: string; value: number } | null;

  remainingQuery: string;
  warnings: string[];

  oraclePatterns: string[];
  tagTokens: string[];
  statTotalApprox: number | null;
}

export interface NumericConstraint {
  field: string;
  op: string;
  value: number;
}

export interface SearchIR {
  monoColor?: string;
  colorConstraint?: {
    values: string[];
    mode: 'color' | 'identity';
    operator: 'or' | 'and' | 'exact' | 'within' | 'include';
  };
  colorCountConstraint?: NumericConstraint;
  types: string[];
  subtypes: string[];
  excludedTypes: string[];
  numeric: NumericConstraint[];
  tags: string[];
  artTags: string[];
  oracle: string[];
  specials: string[];
  warnings: string[];
  remaining: string;
}
