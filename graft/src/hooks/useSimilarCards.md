# src\hooks\useSimilarCards.ts

- SimilarityData · interface · L20-L24 — interface SimilarityData
- cacheKey · function · L43-L45 — function cacheKey(query: string, fallbackId: string | null): string
- readCache · function · L47-L54 — function readCache(key: string): SimilarityData | null | undefined
- writeCache · function · L56-L64 — function writeCache(key: string, value: SimilarityData | null): void
- __clearSimilarityCache · function · L67-L69 — function __clearSimilarityCache(): void
- detectCardName · function · L75-L88 — async function detectCardName(query: string): Promise<ScryfallCard | null>
- useSimilarCards · function · L90-L199 — function useSimilarCards(query: string, fallbackCard?: ScryfallCard | null)
