# src\pages\admin-analytics\components\SystemStatusPanel.tsx

- CronJob · interface · L19-L30 — interface CronJob
- DataFreshnessEntry · interface · L32-L37 — interface DataFreshnessEntry
- SystemStatus · interface · L39-L43 — interface SystemStatus
- StatusTone · type · L45-L45 — type StatusTone = 'success' | 'danger' | 'warning' | 'muted';
- getCronStatusTone · function · L54-L57 — function getCronStatusTone(lastStatus: string | null): StatusTone
- getFailureBadgeTone · function · L59-L61 — function getFailureBadgeTone(failures24h: number): StatusTone
- timeAgo · function · L63-L73 — function timeAgo(dateStr: string | null | undefined): string
- cronHumanReadable · function · L75-L89 — function cronHumanReadable(schedule: string): string
- SystemStatusPanel · function · L101-L264 — function SystemStatusPanel()
