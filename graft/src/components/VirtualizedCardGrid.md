# src\components\VirtualizedCardGrid.tsx

- useGridKeyboardNav · function · L12-L70 — function useGridKeyboardNav( cards: ScryfallCard[], columns: number, onCardClick: (card: ScryfallCard, index: number) => void, )
- VirtualizedCardGridProps · interface · L72-L78 — interface VirtualizedCardGridProps
- buildVirtualizedRowKey · function · L86-L99 — function buildVirtualizedRowKey( cards: ScryfallCard[], columns: number, cardHeight: number, index: number, ): string
- VirtualizedCardGrid · function · L108-L267 — function VirtualizedCardGrid({ cards, onCardClick, onLoadMore, hasNextPage, isFetchingNextPage, }: VirtualizedCardGridProps)
- updateScrollMargin · function · L154-L156 — updateScrollMargin = ()
