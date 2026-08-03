# src\pages\admin-analytics\components\RumPanel.tsx

- VitalName · type · L13-L13 — type VitalName = 'LCP' | 'CLS' | 'INP' | 'FID';
- VitalRow · interface · L15-L22 — interface VitalRow
- VitalStats · interface · L24-L30 — interface VitalStats
- percentile · function · L53-L60 — function percentile(sorted: number[], p: number): number
- rate · function · L62-L67 — function rate(name: VitalName, value: number): 'good' | 'needs-improvement' | 'poor'
- fetchRumStats · function · L69-L127 — async function fetchRumStats(days: number): Promise<{ stats: Record<VitalName, VitalStats>; sessionCount: number; totalSamples: number; }>
- VitalCard · function · L129-L187 — function VitalCard({ name, stats }: { name: VitalName; stats: VitalStats })
- RumPanel · function · L189-L251 — function RumPanel({ days }: { days: number })
