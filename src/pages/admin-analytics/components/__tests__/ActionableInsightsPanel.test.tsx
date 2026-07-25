import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActionableInsightsPanel } from '../ActionableInsightsPanel';
import type { AnalyticsData } from '@/pages/admin-analytics/types';

const analyticsData: AnalyticsData = {
  summary: {
    totalSearches: 250,
    avgConfidence: 0.66,
    avgResponseTime: 840,
    fallbackRate: 22,
    days: 7,
  },
  sourceBreakdown: { ai: 100, deterministic: 140, cache: 10 },
  confidenceBuckets: { high: 120, medium: 90, low: 40 },
  dailyVolume: { '2026-07-24': 25 },
  eventBreakdown: { search: 250 },
  lowConfidenceQueries: [
    {
      query: 'find cheap dragon token makers',
      translated: 't:creature o:dragon usd<5',
      confidence: 0.31,
      source: 'ai',
      time: new Date().toISOString(),
    },
  ],
  popularQueries: [],
  responsePercentiles: { p50: 300, p95: 1400, p99: 2200 },
  deterministicCoverage: { '2026-07-24': 74 },
};

describe('ActionableInsightsPanel', () => {
  it('links operators to the next best admin actions', () => {
    render(
      <MemoryRouter>
        <ActionableInsightsPanel data={analyticsData} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Actionable insights')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Review curated searches' }),
    ).toHaveAttribute('href', '/admin/curated-searches');
    expect(
      screen.getByRole('link', { name: 'Improve translation rules' }),
    ).toHaveAttribute('href', '/admin/curated-searches');
    expect(
      screen.getByRole('link', { name: 'Inspect search flow' }),
    ).toHaveAttribute('href', '/search/treasure');
  });
});
