/**
 * Parsed search intent returned by the backend translation pipeline.
 * Used to populate the ExplainCompilationPanel and drive filter pre-population.
 * @module types/search
 */

export interface SearchIntent {
  /** Parsed color constraints from the user query */
  colors: {
    values: string[];
    isIdentity: boolean;
    isExact: boolean;
    isOr: boolean;
  } | null;
  /** Card types extracted (e.g., ["creature", "enchantment"]) */
  types: string[];
  /** CMC constraint (e.g., { op: "<=", value: 3 }) */
  cmc: { op: string; value: number } | null;
  /** Power constraint for creatures */
  power: { op: string; value: number } | null;
  /** Toughness constraint for creatures */
  toughness: { op: string; value: number } | null;
  /** Scryfall oracle/function tags matched */
  tags: string[];
  /** Oracle text patterns matched (regex or keyword) */
  oraclePatterns: string[];
  /** Translation warnings shown to the user */
  warnings: string[];
  /** The deterministic query string before AI fallback (if used) */
  deterministicQuery?: string;
}
