import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorksSection } from '../HowItWorksSection';
import { I18nProvider } from '@/lib/i18n';

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

describe('HowItWorksSection', () => {
  it('renders the heading', () => {
    renderWithI18n(<HowItWorksSection />);
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });

  it('renders all 4 steps', () => {
    renderWithI18n(<HowItWorksSection />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText('Step 4')).toBeInTheDocument();
  });

  it('renders step titles', () => {
    renderWithI18n(<HowItWorksSection />);
    expect(screen.getByText("Describe what you're looking for")).toBeInTheDocument();
    expect(screen.getByText('Review the translation')).toBeInTheDocument();
    expect(screen.getByText('Browse your results')).toBeInTheDocument();
    expect(screen.getByText('Refine with filters')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    renderWithI18n(<HowItWorksSection />);
    expect(screen.getByText(/natural language description/i)).toBeInTheDocument();
    expect(screen.getByText(/Scryfall query it generated/i)).toBeInTheDocument();
    expect(screen.getByText(/Scroll through the matching cards/i)).toBeInTheDocument();
    expect(screen.getByText(/filter chips to narrow results/i)).toBeInTheDocument();
  });

  it('has proper section landmark with aria-labelledby', () => {
    renderWithI18n(<HowItWorksSection />);
    const section = screen.getByRole('region', { name: 'How It Works' });
    expect(section).toBeInTheDocument();
  });

  it('uses scroll-reveal transitions instead of animate-fade-in', () => {
    const { container } = renderWithI18n(<HowItWorksSection />);
    const cards = container.querySelectorAll('[class*="transition-all"]');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    const fadeInCards = container.querySelectorAll('[class*="animate-fade-in"]');
    expect(fadeInCards.length).toBe(0);
  });

  it('applies staggered transition delays', () => {
    const { container } = renderWithI18n(<HowItWorksSection />);
    const cards = container.querySelectorAll('[class*="translate-y"]');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    // Verify staggered delays exist via inline styles
    expect(cards[0]).toHaveStyle({ transitionDelay: '0ms' });
    expect(cards[1]).toHaveStyle({ transitionDelay: '120ms' });
    expect(cards[2]).toHaveStyle({ transitionDelay: '240ms' });
    expect(cards[3]).toHaveStyle({ transitionDelay: '360ms' });
  });

  it('has a 4-column grid layout class on large screens', () => {
    const { container } = renderWithI18n(<HowItWorksSection />);
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });
});
