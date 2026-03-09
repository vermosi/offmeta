/**
 * Behavioral tests for HomeDiscoverySection component.
 * Verifies structure, child section presence, and prop forwarding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeDiscoverySection } from '../HomeDiscoverySection';

// Mock child components to isolate the section's own behavior
vi.mock('../RecentSearches', () => ({
  RecentSearches: ({ onSearch }: { onSearch: (q: string) => void }) => (
    <div data-testid="recent-searches" onClick={() => onSearch('mock-search')}>
      RecentSearches
    </div>
  ),
}));

vi.mock('../DailyPick', () => ({
  DailyPick: () => <div data-testid="daily-pick">DailyPick</div>,
}));

vi.mock('../FeaturesShowcase', () => ({
  FeaturesShowcase: () => <div data-testid="features-showcase">Features</div>,
}));

vi.mock('../HowItWorksSection', () => ({
  HowItWorksSection: () => <div data-testid="how-it-works">HowItWorks</div>,
}));

vi.mock('../FAQSection', () => ({
  FAQSection: () => <div data-testid="faq-section">FAQ</div>,
}));

vi.mock('../TrendingCardsWidget', () => ({
  TrendingCardsWidget: ({ onSearch }: { onSearch: (q: string) => void }) => (
    <div data-testid="trending-cards" onClick={() => onSearch('mock-trend')}>
      Trending
    </div>
  ),
}));

vi.mock('../SearchCTA', () => ({
  SearchCTA: () => <div data-testid="search-cta">CTA</div>,
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
    expect(screen.getByTestId('daily-pick')).toBeInTheDocument();
    expect(screen.getByTestId('features-showcase')).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works')).toBeInTheDocument();
    expect(screen.getByTestId('faq-section')).toBeInTheDocument();
    expect(screen.getByTestId('trending-cards')).toBeInTheDocument();
  });

  it('renders sections in correct order', () => {
    const { container } = renderSection();
    const testIds = Array.from(container.querySelectorAll('[data-testid]')).map(
      (el) => el.getAttribute('data-testid'),
    );

    const recentIdx = testIds.indexOf('recent-searches');
    const featuresIdx = testIds.indexOf('features-showcase');
    const dailyIdx = testIds.indexOf('daily-pick');
    const howIdx = testIds.indexOf('how-it-works');
    const faqIdx = testIds.indexOf('faq-section');

    expect(recentIdx).toBeLessThan(featuresIdx);
    expect(featuresIdx).toBeLessThan(dailyIdx);
    expect(dailyIdx).toBeLessThan(howIdx);
    expect(howIdx).toBeLessThan(faqIdx);
  });

  it('forwards onSearch to RecentSearches', () => {
    const onSearch = vi.fn();
    renderSection(onSearch);

    screen.getByTestId('recent-searches').click();
    expect(onSearch).toHaveBeenCalledWith('mock-search');
  });

  it('forwards onSearch to TrendingCardsWidget', () => {
    const onSearch = vi.fn();
    renderSection(onSearch);

    screen.getByTestId('trending-cards').click();
    expect(onSearch).toHaveBeenCalledWith('mock-trend');
  });

  it('has anchor IDs for daily-pick, how-it-works, and faq', () => {
    const { container } = renderSection();

    expect(container.querySelector('#daily-pick')).not.toBeNull();
    expect(container.querySelector('#how-it-works')).not.toBeNull();
    expect(container.querySelector('#faq')).not.toBeNull();
  });
});
