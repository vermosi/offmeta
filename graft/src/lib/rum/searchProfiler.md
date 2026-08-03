# src\lib\rum\searchProfiler.ts

- SearchTracePhase · interface · L26-L32 — interface SearchTracePhase
- SearchTrace · interface · L34-L42 — interface SearchTrace
- Window · interface · L45-L48 — interface Window
- isEnabled · function · L53-L67 — function isEnabled(): boolean
- getTraces · function · L69-L73 — function getTraces(): SearchTrace[]
- now · function · L77-L79 — function now(): number
- safeMark · function · L81-L87 — function safeMark(name: string)
- safeMeasure · function · L89-L95 — function safeMeasure(name: string, from: string, to: string)
- startSearchTrace · function · L101-L118 — function startSearchTrace( query: string, meta: Record<string, unknown> = {}, ): string
- markSearchPhase · function · L123-L147 — function markSearchPhase( id: string, phase: string, meta?: Record<string, unknown>, ): void
- endSearchTrace · function · L153-L193 — function endSearchTrace( id: string, meta?: Record<string, unknown>, ): SearchTrace | null
- setSearchProfilingEnabled · function · L198-L206 — function setSearchProfilingEnabled(on: boolean): void
