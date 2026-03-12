/**
 * Card relationships module barrel export.
 * @module lib/relationships
 */

export { normalizeCardId, normalizeDeckEntry, canonicalPairKey } from './normalization';
export { computeCoPlayScore, normalizeRelationshipWeight, RELATIONSHIP_TYPES } from './scoring';
export type { RelationshipType } from './scoring';
export { rankRelationships, filterByType, getRelationshipLabel } from './ranking';
export type { RankedRelationship } from './ranking';
