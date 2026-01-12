export interface SearchIntent {
  colors: {
    values: string[];
    isIdentity: boolean;
    isExact: boolean;
    isOr: boolean;
  } | null;
  types: string[];
  cmc: { op: string; value: number } | null;
  power: { op: string; value: number } | null;
  toughness: { op: string; value: number } | null;
  tags: string[];
  oraclePatterns: string[];
  warnings: string[];
  deterministicQuery?: string;
}
