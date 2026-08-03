# src\lib\search\quality-model.ts

- QueryQualitySignals · interface · L1-L7 — interface QueryQualitySignals
- QueryQualityResult · interface · L9-L12 — interface QueryQualityResult extends QueryQualitySignals
- readStore · function · L16-L24 — function readStore(): Record<string, QueryQualityResult>
- writeStore · function · L26-L32 — function writeStore(store: Record<string, QueryQualityResult>): void
- normalizeQuery · function · L34-L36 — function normalizeQuery(query: string): string
- computeScore · function · L38-L51 — function computeScore(signals: QueryQualitySignals): number
- getQueryQuality · function · L53-L58 — function getQueryQuality(query: string): QueryQualityResult | null
- updateQueryQuality · function · L60-L100 — function updateQueryQuality( query: string, update: Partial<QueryQualitySignals>, ): QueryQualityResult | null
