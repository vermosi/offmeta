import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuidesIndex from '@/pages/GuidesIndex';

// Mock Header and Footer to isolate GuidesIndex
vi.mock('@/components/Header', () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock('@/components/Footer', () => ({
  Footer: () => <footer data-testid="mock-footer">Footer</footer>,
}));

vi.mock('@/components/ScrollToTop', () => ({
  ScrollToTop: () => null,
}));

function renderGuidesIndex() {
  return render(
    <MemoryRouter>
      <GuidesIndex />
    </MemoryRouter>,
  );
}

describe('GuidesIndex', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the page title', () => {
    renderGuidesIndex();
    expect(screen.getByText('Search Guides')).toBeInTheDocument();
  });

  it('renders 10 guide cards', () => {
    renderGuidesIndex();
    const links = screen.getAllByRole('link').filter((el) =>
      el.getAttribute('href')?.startsWith('/guides/'),
    );
    expect(links).toHaveLength(10);
  });

  it('renders difficulty badges for all guides', () => {
    renderGuidesIndex();
    expect(screen.getAllByText(/Beginner/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/Intermediate/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/Advanced/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Expert/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders guide titles', () => {
    renderGuidesIndex();
    expect(screen.getByText('Search by Creature Type')).toBeInTheDocument();
    expect(screen.getByText('Filter by Color')).toBeInTheDocument();
    expect(screen.getByText('Multi-Constraint Complex Search')).toBeInTheDocument();
  });

  it('renders example search queries', () => {
    renderGuidesIndex();
    expect(screen.getByText(/"dragons"/)).toBeInTheDocument();
    expect(screen.getByText(/"mono red creatures"/)).toBeInTheDocument();
  });

  it('renders the breadcrumb with Home link', () => {
    renderGuidesIndex();
    const breadcrumb = screen.getByLabelText('Breadcrumb');
    expect(breadcrumb).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Guides')).toBeInTheDocument();
  });

  it('renders the bottom CTA with Start Searching link', () => {
    renderGuidesIndex();
    expect(screen.getByText('Ready to search?')).toBeInTheDocument();
    expect(screen.getByText('Start Searching')).toBeInTheDocument();
  });

  it('renders guides sorted by level (ascending)', () => {
    renderGuidesIndex();
    const badges = screen.getAllByText(/Level \d+/);
    const levels = badges.map((el) => {
      const match = el.textContent?.match(/Level (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const sortedLevels = [...levels].sort((a, b) => a - b);
    expect(levels).toEqual(sortedLevels);
  });

  it('sets the document title', () => {
    renderGuidesIndex();
    expect(document.title).toBe('Search Guides — OffMeta MTG');
  });

  it('renders Header and Footer', () => {
    renderGuidesIndex();
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });

  it('renders description subtitle', () => {
    renderGuidesIndex();
    expect(screen.getByText(/from simple type searches/i)).toBeInTheDocument();
  });

  it('renders guide count text', () => {
    renderGuidesIndex();
    expect(screen.getByText(/10 guides/)).toBeInTheDocument();
  });
});
