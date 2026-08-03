# src\lib\search\matchExplanation.ts

- MatchReason · interface · L23-L31 — interface MatchReason
- cardText · function · L33-L42 — function cardText(card: ScryfallCard): string
- cardTypeLine · function · L44-L53 — function cardTypeLine(card: ScryfallCard): string
- cardCmc · function · L55-L57 — function cardCmc(card: ScryfallCard): number | undefined
- compare · function · L59-L70 — function compare(op: string, a: number, b: number): boolean
- quoteIfNeeded · function · L73-L75 — function quoteIfNeeded(value: string): string
- explainCardMatch · function · L81-L169 — function explainCardMatch( card: ScryfallCard, intent: SearchIntent | null | undefined, ): MatchReason[]
