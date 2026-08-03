# src\pages\admin-analytics\components\HitRatePanel.tsx

- HistoricalStats · interface · L27-L38 — interface HistoricalStats
- fetchHistoricalStats · function · L56-L106 — async function fetchHistoricalStats(days: number): Promise<HistoricalStats>
- HitBar · function · L108-L147 — function HitBar({ local, cache, scryfall, total, }: { local: number; cache: number; scryfall: number; total: number; })
- barWidth · function · L119-L120 — barWidth = (value: number)
- HitLegend · function · L149-L174 — function HitLegend({ local, cache, scryfall, }: { local: number; cache: number; scryfall: number; })
- OperationBreakdown · function · L176-L238 — function OperationBreakdown({ byOperation, }: { byOperation: Record< HitOperation, { local: number; scryfall: number; cache: number } >; })
- barWidth · function · L184-L185 — barWidth = (value: number, total: number)
- HitRatePanel · function · L240-L373 — function HitRatePanel({ days }: { days: number })
