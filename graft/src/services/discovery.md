# src\services\discovery.ts

- RecommendationRow · interface · L14-L23 — interface RecommendationRow
- mapRow · function · L25-L36 — function mapRow(row: RecommendationRow): RankedRelationship
- getRelatedCards · function · L42-L92 — async function getRelatedCards( oracleId: string, options?: { relationshipType?: RelationshipType; format?: string; limit?: number; }, ): Promise<RankedRelationship[]>
- invoke · function · L53-L61 — invoke = ()
- withTimeout · function · L63-L66 — withTimeout = (timeoutMs: number)
- getTopRelationships · function · L97-L102 — async function getTopRelationships( oracleId: string, limit = 10, ): Promise<RankedRelationship[]>
- getRelatedCardsForSearchResults · function · L108-L136 — async function getRelatedCardsForSearchResults( oracleIds: string[], limit = 8, ): Promise<RankedRelationship[]>
