# supabase\functions\deck-recommendations\index.ts

- ScryfallCardData · interface · L7-L16 — interface ScryfallCardData
- parseDecklist · function · L19-L57 — function parseDecklist(raw: string): { cards: string[]; commander: string | null; }
- cleanCardName · function · L59-L64 — function cleanCardName(n: string): string
- resolveCards · function · L67-L94 — async function resolveCards( names: string[], ): Promise<Record<string, ScryfallCardData>>
- isColorLegal · function · L332-L335 — isColorLegal = (card: ScryfallCardData | null): boolean
- isCommanderLegal · function · L337-L341 — isCommanderLegal = (card: ScryfallCardData | null): boolean
- hasImage · function · L343-L348 — hasImage = (card: ScryfallCardData | null): boolean
