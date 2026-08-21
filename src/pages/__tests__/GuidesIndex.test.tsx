import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuidesIndex from '@/pages/GuidesIndex';

const mockWriteText = vi.fn();
const mockShare = vi.fn();

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
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
      share: mockShare,
    });
  });

  it('renders the editorial masthead heading', () => {
    renderGuidesIndex();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/learn to find/i);
    expect(heading).toHaveTextContent(/anything in magic/i);
  });

  it('renders 11 guide cards', () => {
    renderGuidesIndex();
    const guideLinks = screen
      .getAllByRole('link')
      .map((el) => el.getAttribute('href'))
      .filter((href): href is string => Boolean(href?.startsWith('/guides/')));
    expect(new Set(guideLinks).size).toBe(11);
  });

  it('renders a level section for every difficulty band', () => {
    renderGuidesIndex();
    for (const key of ['beginner', 'intermediate', 'advanced', 'expert']) {
      expect(document.getElementById(key)).toBeInTheDocument();
    }
  });

  it('renders difficulty filter buttons', () => {
    renderGuidesIndex();
    for (const label of [
      'All',
      'Beginner',
      'Intermediate',
      'Advanced',
      'Expert',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('renders guide titles', () => {
    renderGuidesIndex();
    expect(screen.getByText('Search by Creature Type')).toBeInTheDocument();
    expect(screen.getByText('Filter by Color')).toBeInTheDocument();
    expect(
      screen.getByText('Multi-Constraint Complex Search'),
    ).toBeInTheDocument();
  });

  it('renders example search queries', () => {
    renderGuidesIndex();
    expect(screen.getByText(/"dragons"/)).toBeInTheDocument();
    expect(screen.getByText(/"mono red creatures"/)).toBeInTheDocument();
  });

  it('renders a copy-query action for every guide row', () => {
    renderGuidesIndex();
    expect(
      screen.getAllByRole('button', { name: /copy query/i }).length,
    ).toBeGreaterThanOrEqual(10);
  });

  it('renders the breadcrumb with Home link', () => {
    renderGuidesIndex();
    const breadcrumb = screen.getByLabelText('Breadcrumb');
    expect(breadcrumb).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OffMeta' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByText('Field Guide')).toBeInTheDocument();
  });

  it('renders the closing CTA linking back to search', () => {
    renderGuidesIndex();
    const cta = screen
      .getAllByRole('link')
      .filter((el) => /start searching/i.test(el.textContent ?? ''));
    expect(cta.length).toBeGreaterThan(0);
    expect(cta[0]).toHaveAttribute('href', '/');
  });

  it('orders level sections from beginner to expert', () => {
    renderGuidesIndex();
    const order = Array.from(document.querySelectorAll('section[id]'))
      .map((el) => el.id)
      .filter((id) =>
        ['beginner', 'intermediate', 'advanced', 'expert'].includes(id),
      );
    expect(order).toEqual(['beginner', 'intermediate', 'advanced', 'expert']);
  });

  it('sets the document title', () => {
    renderGuidesIndex();
    expect(document.title).toBe(
      'MTG Search Guides — Learn to Find Any Magic Card | OffMeta',
    );
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
    expect(screen.getByText(/\d+ Guides \/ Beginner/i)).toBeInTheDocument();
  });
});
