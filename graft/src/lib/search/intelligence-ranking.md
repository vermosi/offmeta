# src\lib\search\intelligence-ranking.ts

- RankingContext · interface · L5-L20 — interface RankingContext
- popularityScore · function · L22-L25 — function popularityScore(card: ScryfallCard): number
- ownershipScore · function · L27-L29 — function ownershipScore(card: ScryfallCard, ownedCards: Map<string, number>): number
- matchStrengthScore · function · L35-L40 — function matchStrengthScore(card: ScryfallCard, intent: SearchIntent | null | undefined): number
- rerankCardsWithIntelligence · function · L42-L72 — function rerankCardsWithIntelligence( cards: ScryfallCard[], context: RankingContext, ): ScryfallCard[]
