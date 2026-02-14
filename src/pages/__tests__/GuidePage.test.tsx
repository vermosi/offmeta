import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GuidePage from '@/pages/GuidePage';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock Header and Footer
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
  });

  describe('valid guide rendering', () => {
    it('renders the guide heading', () => {
      renderGuidePage('search-by-creature-type');
      const headings = screen.getAllByText('Search by Creature Type');
      // Should appear in breadcrumb + h1
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
      expect(screen.getByText(/simplest search you can do/i)).toBeInTheDocument();
    });

    it('renders the search CTA button', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText(/Search "dragons"/)).toBeInTheDocument();
    });

    it('navigates to search when CTA is clicked', () => {
      renderGuidePage('search-by-creature-type');
      const button = screen.getByText(/Search "dragons"/);
      fireEvent.click(button);
      expect(mockNavigate).toHaveBeenCalledWith('/?q=dragons');
    });

    it('renders the "How OffMeta Helps" section', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText('How OffMeta Helps')).toBeInTheDocument();
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
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
      expect(screen.getByText(/creature types does OffMeta recognize/i)).toBeInTheDocument();
    });

    it('renders related guides section', () => {
      renderGuidePage('search-by-creature-type');
      expect(screen.getByText('Related Guides')).toBeInTheDocument();
      // Should link to filter-by-color and tribal-synergies
      expect(screen.getByText('Filter by Color')).toBeInTheDocument();
    });

    it('renders breadcrumb with Home, Guides, and current title', () => {
      renderGuidePage('search-by-creature-type');
      const breadcrumb = screen.getByLabelText('Breadcrumb');
      expect(breadcrumb).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      // There are multiple "Guides" texts (breadcrumb + related) — just verify breadcrumb exists
      expect(breadcrumb).toHaveTextContent('Guides');
    });

    it('sets the document title for SEO', () => {
      renderGuidePage('search-by-creature-type');
      expect(document.title).toBe('How to Search by Creature Type — OffMeta MTG Guide');
    });

    it('renders JSON-LD structured data', () => {
      const { container } = renderGuidePage('search-by-creature-type');
      const scripts = container.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts.length).toBe(2); // Article + FAQPage
      const articleLd = JSON.parse(scripts[0].textContent || '{}');
      expect(articleLd['@type']).toBe('Article');
      const faqLd = JSON.parse(scripts[1].textContent || '{}');
      expect(faqLd['@type']).toBe('FAQPage');
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
        // Should render the main article
        expect(container.querySelector('article')).toBeInTheDocument();
        // Should have Tips & Strategy
        expect(screen.getByText('Tips & Strategy')).toBeInTheDocument();
        // Should have FAQ
        expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
      });
    }
  });

  describe('invalid guide handling', () => {
    it('renders "Guide not found" for non-existent slug', () => {
      renderGuidePage('non-existent-guide');
      expect(screen.getByText('Guide not found')).toBeInTheDocument();
    });

    it('shows a back link when guide is not found', () => {
      renderGuidePage('non-existent-guide');
      expect(screen.getByText('← Back to search')).toBeInTheDocument();
    });

    it('does not render article for non-existent guide', () => {
      const { container } = renderGuidePage('non-existent-guide');
      expect(container.querySelector('article')).not.toBeInTheDocument();
    });
  });

  describe('guide-specific content', () => {
    it('Level 10 guide mentions multi-constraint search', () => {
      renderGuidePage('multi-constraint-complex-search');
      expect(screen.getByText(/FIVE distinct constraints/i)).toBeInTheDocument();
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
