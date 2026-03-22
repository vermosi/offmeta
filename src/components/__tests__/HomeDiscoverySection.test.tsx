/**
 * Behavioral tests for HomeDiscoverySection component.
 * Verifies structure, child section presence, and prop forwarding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeDiscoverySection } from '../HomeDiscoverySection';

vi.mock('../RecentSearches', () => ({
  RecentSearches: ({ onSearch }: { onSearch: (q: string) => void }) => (
    <div data-testid="recent-searches" onClick={() => onSearch('mock-search')}>
      RecentSearches
    </div>
  ),
}));

vi.mock('../CuratedSearchesWidget', () => ({
  CuratedSearchesWidget: () => (
    <div data-testid="curated-searches">CuratedSearches</div>
  ),
}));

vi.mock('../FAQSection', () => ({
  FAQSection: () => <div data-testid="faq-section">FAQ</div>,
}));

function renderSection(onSearch = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomeDiscoverySection onSearch={onSearch} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomeDiscoverySection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all child sections', () => {
    renderSection();

    expect(screen.getByTestId('recent-searches')).toBeInTheDocument();
    expect(screen.getByTestId('curated-searches')).toBeInTheDocument();
    expect(screen.getByTestId('faq-section')).toBeInTheDocument();
  });

  it('renders sections in correct order', () => {
    const { container } = renderSection();
    const testIds = Array.from(container.querySelectorAll('[data-testid]')).map(
      (el) => el.getAttribute('data-testid'),
    );

    const recentIdx = testIds.indexOf('recent-searches');
    const curatedIdx = testIds.indexOf('curated-searches');
    const faqIdx = testIds.indexOf('faq-section');

    expect(curatedIdx).toBeLessThan(recentIdx);
    expect(recentIdx).toBeLessThan(faqIdx);
  });

  it('forwards onSearch to RecentSearches', () => {
    const onSearch = vi.fn();
    renderSection(onSearch);

    screen.getByTestId('recent-searches').click();
    expect(onSearch).toHaveBeenCalledWith('mock-search');
  });

  it('has anchor ID for faq', () => {
    const { container } = renderSection();
    expect(container.querySelector('#faq')).not.toBeNull();
  });
});
