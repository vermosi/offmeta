# src\lib\search\local-index.ts

- LocalSearchHit · interface · L4-L7 — interface LocalSearchHit
- SearchIndex · type · L9-L9 — type SearchIndex = Index;
- createCardSearchIndex · function · L11-L23 — function createCardSearchIndex(cards: ScryfallCard[]): SearchIndex
- searchCardIndex · function · L25-L42 — function searchCardIndex( index: SearchIndex | null, cards: ScryfallCard[], query: string, limit = 8, ): LocalSearchHit[]
