# src\pages\market-trends-utils.ts

- SortField · type · L3-L3 — type SortField = 'change' | 'current' | 'name' | 'previous';
- SortDir · type · L4-L4 — type SortDir = 'asc' | 'desc';
- MarketFilters · interface · L6-L13 — interface MarketFilters
- countActiveFilters · function · L33-L42 — function countActiveFilters(filters: MarketFilters): number
- applyFilters · function · L44-L73 — function applyFilters( movers: PriceMover[], filters: MarketFilters, ): PriceMover[]
- sortMovers · function · L75-L100 — function sortMovers( movers: PriceMover[], field: SortField, dir: SortDir, ): PriceMover[]
