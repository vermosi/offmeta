# supabase\functions\semantic-search\card-name-lookup.ts

- loadCardNames · function · L32-L62 — async function loadCardNames(): Promise<Set<string>>
- getCardNames · function · L68-L83 — async function getCardNames(): Promise<Set<string>>
- lookupCardName · function · L89-L96 — async function lookupCardName(query: string): Promise<boolean>
- getLoadedCount · function · L102-L104 — function getLoadedCount(): number
- getCardNameDiagnostics · function · L109-L128 — function getCardNameDiagnostics(): { loadedCount: number; lastLoadTime: number; lastLoadTimeISO: string | null; isLoaded: boolean; refreshIntervalMs: number; nextRefreshAt: string | null; }
