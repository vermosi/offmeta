# src\components\MatchedConceptChips.tsx

- MatchedConceptChipsProps · interface · L18-L28 — interface MatchedConceptChipsProps
- AggregatedChip · interface · L30-L34 — interface AggregatedChip
- aggregateReasons · function · L36-L64 — function aggregateReasons( cards: ScryfallCard[], intent: SearchIntent | null | undefined, sampleSize: number, ): AggregatedChip[]
- labelForToken · function · L70-L85 — function labelForToken(token: string, fallback: string): string
- stripQuotes · function · L87-L89 — function stripQuotes(s: string): string
- tokenAlreadyInQuery · function · L91-L94 — function tokenAlreadyInQuery(query: string, token: string): boolean
- MatchedConceptChips · function · L96-L160 — function MatchedConceptChips({ cards, intent, searchQuery, originalQuery, onRefine, limit = 8, sampleSize = 40, }: MatchedConceptChipsProps)
