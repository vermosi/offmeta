import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GuidePage from '@/pages/GuidePage';

const mockNavigate = vi.fn();
const mockWriteText = vi.fn();
const mockShare = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/Header', () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock('@/components/Footer', () => ({
  Footer: () => <footer data-testid="mock-footer">Footer</footer>,
}));

vi.mock('@/components/ScrollToTop', () => ({
  ScrollToTop: () => null,
}));

function renderGuidePage(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/guides/${slug}`]}>
      <Routes>
        <Route path="/guides/:slug" element={<GuidePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GuidePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
      share: mockShare,
    });
  });

  describe('valid guide rendering', () => {
    it('renders the guide heading', () => {
      renderGuidePage('search-by-creature-type');
      const headings = screen.getAllByText('Search by Creature Type');
      expect(headings.length).toBeGreaterThanOrEqual(2);
      const h1 = headings.find((el) => el.tagName === 'H1');
      expect(h1).toBeTruthy();
    });

    it('renders the subheading', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText(/just name a tribe/)).toBeInTheDocument();
    });

    it('renders the intro text', () => {
      renderGuidePage('search-by-creature-type');
      expect(
        screen.getByText(/simplest search you can do/i),
      ).toBeInTheDocument();
    });

    it('renders the search CTA button', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText(/Search "dragons"/)).toBeInTheDocument();
    });

    it('renders the copy and share actions', () => {
      renderGuidePage('search-by-creature-type');
      expect(
        screen.getByRole('button', { name: 'Copy link' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Share guide' }),
      ).toBeInTheDocument();
    });

    it('navigates to search when CTA is clicked', () => {
      renderGuidePage('search-by-creature-type');
      fireEvent.click(screen.getByText(/Search "dragons"/));
      expect(mockNavigate).toHaveBeenCalledWith('/search/dragons');
    });

    it('copies the guide link when Copy link is clicked', async () => {
      mockWriteText.mockResolvedValueOnce(undefined);
      renderGuidePage('search-by-creature-type');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      });
      expect(mockWriteText).toHaveBeenCalledWith(
        'https://offmeta.app/guides/search-by-creature-type',
      );
    });

    it('uses the Web Share API when available', async () => {
      mockShare.mockResolvedValueOnce(undefined);
      renderGuidePage('search-by-creature-type');
      fireEvent.click(screen.getByRole('button', { name: 'Share guide' }));
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Search by Creature Type',
          url: 'https://offmeta.app/guides/search-by-creature-type',
        }),
      );
    });

    it('renders the "How OffMeta Helps" section', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText('How OffMeta Helps')).toBeInTheDocument();
    });

    it('renders the on-page navigation links', () => {
      renderGuidePage('search-by-creature-type');
      expect(
        screen.getByRole('link', { name: 'Search this guide' }),
      ).toHaveAttribute('href', '#search');
      expect(
        screen.getByRole('link', { name: 'Tips & strategy' }),
      ).toHaveAttribute('href', '#tips');
      expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute(
        'href',
        '#faq',
      );
      expect(
        screen.getByRole('link', { name: 'Related guides' }),
      ).toHaveAttribute('href', '#related');
    });

    it('renders copy actions for on-page sections', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getAllByRole('button', { name: 'Copy' }).length).toBe(4);
    });

    it('shows the user input and translated query', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText('dragons')).toBeInTheDocument();
      expect(screen.getByText('t:dragon')).toBeInTheDocument();
    });

    it('renders tips section with numbered items', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText('Tips & Strategy')).toBeInTheDocument();
      expect(screen.getByText(/plural.*or singular/i)).toBeInTheDocument();
    });

    it('renders FAQ section', () => {
      renderGuidePage('search-by-creature-type');
      expect(
        screen.getByText('Frequently Asked Questions'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/creature types does OffMeta recognize/i),
      ).toBeInTheDocument();
    });

    it('renders related guides section', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText('Related Guides')).toBeInTheDocument();
      expect(
        screen.getAllByText('Filter by Color').length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders previous and next guide navigation', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText('Starting point')).toBeInTheDocument();
      expect(screen.getByText('Next guide')).toBeInTheDocument();
      expect(
        screen.getAllByText('Filter by Color').length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders breadcrumb with Home, Guides, and current title', () => {
      renderGuidePage('search-by-creature-type');
      const breadcrumb = screen.getByLabelText('Breadcrumb');
      expect(breadcrumb).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(breadcrumb).toHaveTextContent('Guides');
    });

    it('sets the document title for SEO', () => {
      renderGuidePage('search-by-creature-type');
      expect(document.title).toBe(
        'MTG Tribe Search — Find Dragons, Elves & More | OffMeta',
      );
    });

    it('renders JSON-LD structured data', () => {
      const { container } = renderGuidePage('search-by-creature-type');
      const scripts = container.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      expect(scripts.length).toBe(2);
      const articleLd = JSON.parse(scripts[0].textContent || '{}');
      expect(articleLd['@type']).toBe('Article');
      const breadcrumbLd = JSON.parse(scripts[1].textContent || '{}');
      expect(breadcrumbLd['@type']).toBe('BreadcrumbList');
      expect(breadcrumbLd.itemListElement).toHaveLength(3);
    });

    it('renders the bottom CTA', () => {
      renderGuidePage('filter-by-color');
      expect(screen.getByText('Ready to find your cards?')).toBeInTheDocument();
    });

    it('renders Header and Footer', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    });
  });

  describe('all 10 guides render without errors', () => {
    const slugs = [
      'search-by-creature-type',
      'filter-by-color',
      'budget-price-filters',
      'format-legality-search',
      'keyword-ability-search',
      'ramp-and-card-draw',
      'tribal-synergies-for-commander',
      'token-and-sacrifice-synergies',
      'etb-and-flicker-combos',
      'multi-constraint-complex-search',
    ];

    for (const slug of slugs) {
      it(`renders guide "${slug}" without errors`, () => {
        const { container } = renderGuidePage(slug);
        expect(container.querySelector('article')).toBeInTheDocument();
        expect(screen.getByText('Tips & Strategy')).toBeInTheDocument();
        expect(
          screen.getByText('Frequently Asked Questions'),
        ).toBeInTheDocument();
      });
    }
  });

  describe('invalid guide handling', () => {
    it('renders "Guide not found" for non-existent slug', () => {
      renderGuidePage('non-existent-guide');
      expect(screen.getByText('Guide not found')).toBeInTheDocument();
    });

    it('shows recovery links when guide is not found', () => {
      renderGuidePage('non-existent-guide');
      expect(screen.getByRole('link', { name: 'Guides' })).toHaveAttribute(
        'href',
        '/guides',
      );
      expect(
        screen.getByRole('link', { name: /back to search/i }),
      ).toHaveAttribute('href', '/');
    });

    it('does not render article for non-existent guide', () => {
      const { container } = renderGuidePage('non-existent-guide');
      expect(container.querySelector('article')).not.toBeInTheDocument();
    });
  });

  describe('guide-specific content', () => {
    it('Level 10 guide mentions multi-constraint search', () => {
      renderGuidePage('multi-constraint-complex-search');
      expect(
        screen.getByText(/FIVE distinct constraints/i),
      ).toBeInTheDocument();
    });

    it('Level 3 guide mentions budget/price', () => {
      renderGuidePage('budget-price-filters');
      const budgetMatches = screen.getAllByText(/budget/i);
      expect(budgetMatches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/\$5/).length).toBeGreaterThanOrEqual(1);
    });

    it('Level 5 guide shows keyword operators', () => {
      renderGuidePage('keyword-ability-search');
      expect(screen.getByText(/kw:flying kw:deathtouch/)).toBeInTheDocument();
    });
  });
});
