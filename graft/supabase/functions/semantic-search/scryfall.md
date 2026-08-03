# supabase\functions\semantic-search\scryfall.ts

- ScryfallValidationResult · interface · L3-L11 — interface ScryfallValidationResult
- validateAgainstScryfall · function · L17-L58 — async function validateAgainstScryfall( scryfallQuery: string, overlyBroadThreshold: number, ): Promise<ScryfallValidationResult>
- relaxSpeculativeClauses · function · L64-L88 — function relaxSpeculativeClauses(query: string): { relaxedQuery: string; removed: string[]; }
- validateAndRelaxQuery · function · L93-L134 — async function validateAndRelaxQuery( query: string, deterministicQuery: string | null, overlyBroadThreshold: number, ): Promise<{ query: string; relaxedClauses: string[]; validation: ScryfallValidationResult | null; }>
