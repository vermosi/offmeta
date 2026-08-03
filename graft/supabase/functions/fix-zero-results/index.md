# supabase\functions\fix-zero-results\index.ts

- ZeroResultCandidate · interface · L51-L55 — interface ZeroResultCandidate
- FixResult · interface · L57-L64 — interface FixResult
- sleep · function · L66-L68 — async function sleep(ms: number): Promise<void>
- getZeroResultCandidates · function · L73-L90 — async function getZeroResultCandidates(): Promise<ZeroResultCandidate[]>
- getZeroResultCandidatesFallback · function · L92-L135 — async function getZeroResultCandidatesFallback(since: Date): Promise<ZeroResultCandidate[]>
- ruleExists · function · L140-L149 — async function ruleExists(query: string): Promise<boolean>
- generateFix · function · L154-L236 — async function generateFix( query: string, failedTranslation: string, ): Promise<{ pattern: string; scryfall_syntax: string; description: string; confidence: number } | null>
- validateScryfall · function · L241-L262 — async function validateScryfall( query: string, ): Promise<{ valid: boolean; totalCards: number }>
