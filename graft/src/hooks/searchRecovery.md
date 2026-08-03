# src\hooks\searchRecovery.ts

- SearchResult · type · L8-L18 — type SearchResult = { scryfallQuery: string; explanation?: { readable: string; assumptions: string[]; confidence: number; }; source?: string; validationIssues?: string[]; showAffiliate?: boolean; };
- RecoveryContext · type · L20-L29 — type RecoveryContext = { originalQuery: string; currentResult: SearchResult | null; currentRequestId: string | null; scryfallLang: string; queryClient: QueryClient; setSearchQuery: (query: string) => void; setLastSearchResult: Dispatch<SetStateAction<SearchResult | null>>; trackEvent: (event: string, payload: Record<string, unknown>) => void; };
- RecoveryOutcome · type · L31-L33 — type RecoveryOutcome = | { handled: true } | { handled: false };
- buildBroadenedResult · function · L37-L47 — function buildBroadenedResult(originalQuery: string, fallbackQuery: string): SearchResult
- applyFuzzyRecovery · function · L49-L111 — async function applyFuzzyRecovery( ctx: RecoveryContext, nameCandidate: string, ): Promise<RecoveryOutcome>
- applyFuzzy · function · L70-L89 — applyFuzzy = ()
- handleZeroResultRecovery · function · L113-L150 — async function handleZeroResultRecovery( ctx: RecoveryContext, hasAttemptedRecovery: boolean, ): Promise<RecoveryOutcome>
