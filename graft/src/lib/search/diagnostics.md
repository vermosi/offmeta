# src\lib\search\diagnostics.ts

- SearchDiagnosticEvent · type · L15-L35 — type SearchDiagnosticEvent = | { type: 'strategy_hate_compile'; query: string; matched: string[]; compiledQuery: string; timestamp: number; } | { type: 'similar_tab_error'; query: string; fallbackCardId: string | null; reason: string; detail?: unknown; timestamp: number; } | { type: 'similar_tab_no_source'; query: string; timestamp: number; };
- push · function · L40-L43 — function push(event: SearchDiagnosticEvent): void
- recordStrategyHate · function · L45-L60 — function recordStrategyHate( query: string, matched: string[], compiledQuery: string, ): void
- friendlySimilarErrorMessage · function · L66-L77 — function friendlySimilarErrorMessage(reason: string): string
- recordSimilarError · function · L79-L99 — function recordSimilarError( query: string, fallbackCardId: string | null, reason: string, detail?: unknown, ): void
- recordSimilarNoSource · function · L101-L109 — function recordSimilarNoSource(query: string): void
- recentDiagnostics · function · L111-L113 — function recentDiagnostics(): SearchDiagnosticEvent[]
- clearDiagnostics · function · L115-L117 — function clearDiagnostics(): void
