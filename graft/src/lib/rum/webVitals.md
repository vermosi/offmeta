# src\lib\rum\webVitals.ts

- VitalName · type · L13-L13 — type VitalName = 'LCP' | 'CLS' | 'INP' | 'FID';
- VitalReport · interface · L15-L19 — interface VitalReport
- LayoutShiftEntry · interface · L21-L25 — interface LayoutShiftEntry extends PerformanceEntry
- FirstInputEntry · interface · L27-L29 — interface FirstInputEntry extends PerformanceEntry
- EventTimingEntry · interface · L31-L34 — interface EventTimingEntry extends PerformanceEntry
- rate · function · L51-L63 — function rate(name: VitalName, value: number): VitalReport['rating']
- isInternal · function · L65-L67 — function isInternal(): boolean
- shouldSuppressInsert · function · L69-L71 — function shouldSuppressInsert(): boolean
- queue · function · L75-L79 — function queue(report: VitalReport)
- flush · function · L83-L111 — function flush()
- observeLCP · function · L113-L150 — function observeLCP()
- stop · function · L133-L136 — stop = ()
- observeCLS · function · L152-L169 — function observeCLS()
- observeFID · function · L171-L184 — function observeFID()
- observeINP · function · L186-L212 — function observeINP()
- initWebVitals · function · L219-L235 — function initWebVitals(): void
- onHide · function · L230-L230 — onHide = ()
