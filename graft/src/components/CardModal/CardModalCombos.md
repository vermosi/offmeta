# src\components\CardModal\CardModalCombos.tsx

- ComboCard · interface · L29-L33 — interface ComboCard
- Combo · interface · L35-L49 — interface Combo
- CardModalCombosProps · interface · L51-L54 — interface CardModalCombosProps
- ComboState · type · L56-L61 — type ComboState = { combos: Combo[]; total: number; isLoading: boolean; error: string | null; };
- ComboAction · type · L63-L66 — type ComboAction = | { type: 'FETCH' } | { type: 'SUCCESS'; combos: Combo[]; total: number } | { type: 'ERROR'; error: string };
- comboReducer · function · L68-L77 — function comboReducer(_state: ComboState, action: ComboAction): ComboState
- CardModalCombos · function · L79-L320 — function CardModalCombos({ cardName, isMobile }: CardModalCombosProps)
