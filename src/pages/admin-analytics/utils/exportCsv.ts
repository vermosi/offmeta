import type { AnalyticsData } from '@/pages/admin-analytics/types';

export function exportToCsv(data: AnalyticsData) {
  const rows: string[] = [];

  rows.push('Section,Metric,Value');
  rows.push(`Summary,Total Searches,${data.summary.totalSearches}`);
  rows.push(`Summary,Avg Confidence,${data.summary.avgConfidence}`);
  rows.push(`Summary,Avg Response Time (ms),${data.summary.avgResponseTime}`);
  rows.push(`Summary,Fallback Rate (%),${data.summary.fallbackRate}`);
  rows.push(`Summary,P50 Response (ms),${data.responsePercentiles.p50}`);
  rows.push(`Summary,P95 Response (ms),${data.responsePercentiles.p95}`);
  rows.push(`Summary,P99 Response (ms),${data.responsePercentiles.p99}`);
  rows.push('');

  rows.push('Source,Count');
  for (const [source, count] of Object.entries(data.sourceBreakdown)) {
    rows.push(`${source},${count}`);
  }
  rows.push('');

  rows.push('Popular Query,Count,Avg Confidence,Primary Source');
  for (const pq of data.popularQueries) {
    rows.push(
      `"${pq.query.replace(/"/g, '""')}",${pq.count},${pq.avg_confidence},${pq.primary_source}`,
    );
  }
  rows.push('');

  rows.push('Date,Searches');
  for (const [day, count] of Object.entries(data.dailyVolume).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    rows.push(`${day},${count}`);
  }
  rows.push('');

  rows.push('Date,Deterministic Coverage (%)');
  for (const [day, pct] of Object.entries(data.deterministicCoverage).sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    rows.push(`${day},${pct}`);
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `offmeta-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
