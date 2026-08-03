# src\hooks\useSearchQuery.ts

- resetSearchRateLimitState · function · L24-L28 — function resetSearchRateLimitState()
- TranslationResult · interface · L30-L43 — interface TranslationResult
- TranslationParams · interface · L45-L51 — interface TranslationParams
- TranslationChannelMessage · interface · L58-L62 — interface TranslationChannelMessage
- getRecentCrossTabResult · function · L108-L116 — function getRecentCrossTabResult(key: string): TranslationResult | null
- waitForCrossTabResult · function · L118-L150 — function waitForCrossTabResult( key: string, timeoutMs: number, ): Promise<TranslationResult | null>
- resolveWithResult · function · L141-L144 — resolveWithResult = (result: TranslationResult)
- getTranslationKey · function · L155-L163 — function getTranslationKey( query: string, filters?: FilterState | null, cacheSalt?: string, locale?: string, ): string
- checkSearchRateLimit · function · L168-L200 — function checkSearchRateLimit(query: string): { allowed: boolean; reason?: string; }
- recordSearch · function · L205-L217 — function recordSearch(query: string): void
- translateQueryWithDedup · function · L222-L368 — async function translateQueryWithDedup( params: TranslationParams, ): Promise<TranslationResult>
- useTranslateQuery · function · L374-L388 — function useTranslateQuery(params: TranslationParams | null)
- usePrefetchPopularQueries · function · L395-L473 — function usePrefetchPopularQueries()
