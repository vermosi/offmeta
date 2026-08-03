# src\hooks\useSearchHandler.ts

- SearchPhase · type · L27-L27 — type SearchPhase = 'idle' | 'translating' | 'fetching';
- UseSearchHandlerOptions · interface · L29-L39 — interface UseSearchHandlerOptions
- trackFallbackEvent · function · L45-L51 — function trackFallbackEvent( reason: 'timeout' | 'error' | 'rate_limit', query: string, details: Record<string, unknown>, ): void
- useSearchHandler · function · L53-L399 — function useSearchHandler({ query, filters, onSearch, addToHistory, saveContext, }: UseSearchHandlerOptions)
- updateCountdown · function · L84-L93 — updateCountdown = ()
