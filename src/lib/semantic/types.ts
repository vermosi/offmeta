/**
 * Shared types for the OffMeta semantic layer (Phase 8).
 * These mirror the shapes returned by the `get_card_profiles`,
 * `search_card_profiles` and `list_ontology_concepts` database functions.
 */

/** The four ontology dimensions a concept can belong to. */
export type ConceptDimension = 'ROLE' | 'METHOD' | 'PROBLEM' | 'CHARACTERISTIC';

/** A single ontology concept as attached to a card. */
export interface ConceptRef {
  key: string;
  label: string;
  description: string | null;
}

/** A strategic approach cluster (Disable, Destroy, Prevent, ...). */
export interface ApproachRef {
  key: string;
  label: string;
}

/** Full functional profile of a card. */
export interface CardProfile {
  oracleId: string;
  name: string;
  manaCost: string | null;
  cmc: number;
  typeLine: string | null;
  colors: string[];
  rarity: string | null;
  legalities: Record<string, string>;
  imageUrl: string | null;
  roles: ConceptRef[];
  methods: ConceptRef[];
  problems: ConceptRef[];
  characteristics: ConceptRef[];
  approaches: ApproachRef[];
}

/** A card returned by concept search. */
export interface ConceptSearchHit {
  oracleId: string;
  name: string;
  manaCost: string | null;
  cmc: number;
  typeLine: string | null;
  colors: string[];
  rarity: string | null;
  imageUrl: string | null;
  matchedTags: string[];
  matchCount: number;
}

/** An entry in the public concept directory. */
export interface ConceptDirectoryEntry {
  tagKey: string;
  dimension: ConceptDimension;
  label: string;
  description: string | null;
  cardCount: number;
  approaches: string[];
  related: string[];
}

/** Options accepted by {@link searchByConcepts}. */
export interface ConceptSearchOptions {
  /** WUBRG letters; results are restricted to cards inside these colors. */
  colors?: string[];
  /** `any` matches at least one concept, `all` requires every concept. */
  match?: 'any' | 'all';
  /** 1-200, defaults to 40. */
  limit?: number;
}
