# src\services\hit-rate-tracker.ts

- HitSource · type · L10-L10 — type HitSource = 'local' | 'scryfall' | 'cache';
- HitOperation · type · L11-L16 — type HitOperation = | 'card_by_name' | 'cards_batch' | 'autocomplete' | 'random_card' | 'price_lookup';
- HitEvent · interface · L18-L23 — interface HitEvent
- HitRateStats · interface · L25-L36 — interface HitRateStats
- persist · function · L55-L64 — function persist(): void
- flushToDb · function · L73-L76 — async function flushToDb(): Promise<void>
- scheduleFlush · function · L78-L84 — function scheduleFlush(): void
- handleVisibilityChange · function · L86-L90 — function handleVisibilityChange(): void
- registerVisibilityFlush · function · L92-L99 — function registerVisibilityFlush(): void
- recordHit · function · L109-L124 — function recordHit( source: HitSource, operation: HitOperation, count = 1, ): void
- getHitRateStats · function · L129-L178 — function getHitRateStats(): HitRateStats
- clearHitRateStats · function · L181-L189 — function clearHitRateStats(): void
- forceFlushHitRates · function · L192-L194 — function forceFlushHitRates(): Promise<void>
