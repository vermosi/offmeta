# src\lib\edge-functions\contracts.ts

- DeckCategorizeRequest · type · L1-L3 — type DeckCategorizeRequest = { cards?: unknown; };
- DeckSuggestRequest · type · L5-L10 — type DeckSuggestRequest = { commander?: unknown; cards?: unknown; color_identity?: unknown; format?: unknown; };
- FetchMoxfieldDeckRequest · type · L12-L14 — type FetchMoxfieldDeckRequest = { url?: unknown; };
- ComboSearchRequest · type · L16-L21 — type ComboSearchRequest = { action?: unknown; cardName?: unknown; commanders?: unknown; cards?: unknown; };
- ContractResult · type · L23-L25 — type ContractResult<T> = | { ok: true; data: T } | { ok: false; error: string; status: number };
- isStringArray · function · L27-L29 — function isStringArray(value: unknown): value is string[]
- isUnknownRecord · function · L31-L33 — function isUnknownRecord(value: unknown): value is Record<string, unknown>
- validateDeckCategorizeRequest · function · L35-L68 — function validateDeckCategorizeRequest( body: DeckCategorizeRequest, ): ContractResult<{ cards: string[] }>
- validateDeckSuggestRequest · function · L70-L115 — function validateDeckSuggestRequest( body: DeckSuggestRequest, ): ContractResult<{ commander: string | null; cards: Array<{ name: string; category?: string }>; colorIdentity: string[]; format: string; }>
- validateFetchMoxfieldDeckRequest · function · L117-L136 — function validateFetchMoxfieldDeckRequest( body: FetchMoxfieldDeckRequest, ): ContractResult<{ publicId: string }>
- validateComboSearchRequest · function · L138-L164 — function validateComboSearchRequest( body: ComboSearchRequest, ): ContractResult< | { action: 'card'; cardName: string } | { action: 'deck'; commanders: string[]; cards: string[] } >
