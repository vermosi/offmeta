# src\pages\FindMyCombos.tsx

- SortMode · type · L42-L47 — type SortMode = | 'popularity' | 'cards-asc' | 'cards-desc' | 'price-asc' | 'price-desc';
- PriceCeiling · type · L48-L48 — type PriceCeiling = 'any' | '10' | '25' | '50' | '100';
- getComboPrice · function · L51-L56 — getComboPrice = (combo: Combo): number | null
- FindMyCombos · function · L58-L536 — function FindMyCombos()
- clearFilters · function · L109-L114 — clearFilters = ()
- toggleColor · function · L116-L119 — toggleColor = (c: string)
- filterAndSortCombos · function · L121-L163 — filterAndSortCombos = (combos: Combo[]): Combo[]
- handleFetchMoxfield · function · L165-L167 — handleFetchMoxfield = async ()
- handleFindCombos · function · L169-L194 — handleFindCombos = async ()
