# supabase\functions\semantic-search\index.ts

- BudgetStage · type · L71-L71 — type BudgetStage = 'dynamic_rules' | 'pre_translation' | 'ai_call';
- seedTranslationRule · function · L77-L105 — async function seedTranslationRule( query: string, scryfallQuery: string, confidence: number, ): Promise<void>
- DebugOptions · interface · L113-L119 — interface DebugOptions
- RequestFilters · interface · L121-L125 — interface RequestFilters
- StageName · type · L127-L134 — type StageName = | 'deterministic' | 'cache' | 'pattern' | 'preTranslate' | 'ai' | 'fallback' | 'card_name_lookup';
- EdgeRuntimeLike · interface · L138-L140 — interface EdgeRuntimeLike
- runInBackground · function · L142-L151 — function runInBackground(task: Promise<unknown>): void
- withTimeoutFallback · function · L157-L175 — async function withTimeoutFallback<T>( promise: Promise<T>, timeoutMs: number, fallback: T, ): Promise<T>
- markStage · function · L205-L215 — markStage = async <T>( stage: StageName, task: () => Promise<T> | T, ): Promise<T>
- createBudgetExceededResponse · function · L254-L271 — createBudgetExceededResponse = (): Response
- buildBudgetExceededResponse · function · L770-L796 — buildBudgetExceededResponse = ( stage: BudgetStage, confidence: number, assumptions: string[], ): Response
- probeScryfall · function · L1072-L1083 — probeScryfall = async (candidateQuery: string): Promise<void>
