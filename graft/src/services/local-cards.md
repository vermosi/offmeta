# src\services\local-cards.ts

- hasSupabaseConfig · function · L22-L34 — function hasSupabaseConfig(): boolean
- getSupabaseClient · function · L36-L39 — async function getSupabaseClient()
- LocalCard · interface · L41-L52 — interface LocalCard
- LocalCardPrice · interface · L54-L59 — interface LocalCardPrice
- LocalCardPrinting · interface · L61-L89 — interface LocalCardPrinting
- getLocalCardByName · function · L97-L141 — async function getLocalCardByName(name: string): Promise<LocalCard | null>
- getLocalCardsByNames · function · L147-L210 — async function getLocalCardsByNames(names: string[]): Promise<Map<string, LocalCard>>
- getLocalRandomCard · function · L216-L253 — async function getLocalRandomCard(): Promise<LocalCard | null>
- localAutocomplete · function · L261-L278 — async function localAutocomplete(query: string): Promise<string[]>
- getLocalPrices · function · L286-L328 — async function getLocalPrices( cardNames: string[], ): Promise<Map<string, LocalCardPrice>>
- getLocalCardPrintings · function · L334-L371 — async function getLocalCardPrintings( cardName: string, ): Promise<LocalCardPrinting[]>
- getLocalCardImage · function · L376-L379 — async function getLocalCardImage(cardName: string): Promise<string | null>
- localCardToScryfallShape · function · L387-L401 — function localCardToScryfallShape(card: LocalCard): Partial<ScryfallCard>
