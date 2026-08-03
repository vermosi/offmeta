# src\components\UnderstoodSummary.tsx

- Translate · type · L24-L24 — type Translate = (k: string, f?: string) => string;
- categoryDescription · function · L207-L258 — function categoryDescription(key: string, t: Translate): string
- tokenCategory · function · L261-L292 — function tokenCategory(token: string): string
- extractRationale · function · L298-L340 — function extractRationale( token: string, originalQuery: string, ): { category: string; triggers: string[]; value: string | null; }
- UnderstoodSummaryProps · interface · L342-L350 — interface UnderstoodSummaryProps
- Signal · interface · L352-L355 — interface Signal
- tokenToSignal · function · L358-L413 — function tokenToSignal( token: string, t: (k: string, f?: string) => string, ): Signal | null
- splitTokens · function · L418-L437 — function splitTokens(query: string): string[]
- UnderstoodSummary · function · L439-L825 — function UnderstoodSummary({ originalQuery, onAdjust, }: UnderstoodSummaryProps)
- toggleChip · function · L520-L536 — toggleChip = (token: string)
- applyAdjustment · function · L538-L548 — applyAdjustment = ()
