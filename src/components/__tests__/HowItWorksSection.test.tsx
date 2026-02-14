import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorksSection } from '../HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders the heading', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });

  it('renders all 4 steps', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText('Step 4')).toBeInTheDocument();
  });

  it('renders step titles', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("Describe what you're looking for")).toBeInTheDocument();
    expect(screen.getByText('Review the translation')).toBeInTheDocument();
    expect(screen.getByText('Browse your results')).toBeInTheDocument();
    expect(screen.getByText('Refine with filters')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/natural language description/i)).toBeInTheDocument();
    expect(screen.getByText(/Scryfall query it generated/i)).toBeInTheDocument();
    expect(screen.getByText(/Scroll through the matching cards/i)).toBeInTheDocument();
    expect(screen.getByText(/filter chips to narrow results/i)).toBeInTheDocument();
  });

  it('has proper section landmark with aria-labelledby', () => {
    render(<HowItWorksSection />);
    const section = screen.getByRole('region', { name: 'How It Works' });
    expect(section).toBeInTheDocument();
  });

  it('uses animate-reveal class instead of animate-fade-in', () => {
    const { container } = render(<HowItWorksSection />);
    const cards = container.querySelectorAll('[class*="animate-reveal"]');
    expect(cards.length).toBe(4);
    // Should NOT have animate-fade-in (which was the bug)
    const fadeInCards = container.querySelectorAll('[class*="animate-fade-in"]');
    expect(fadeInCards.length).toBe(0);
  });

  it('applies staggered animation delays', () => {
    const { container } = render(<HowItWorksSection />);
    const cards = container.querySelectorAll('[class*="animate-reveal"]');
    expect(cards[0]).toHaveStyle({ animationDelay: '0ms' });
    expect(cards[1]).toHaveStyle({ animationDelay: '150ms' });
    expect(cards[2]).toHaveStyle({ animationDelay: '300ms' });
    expect(cards[3]).toHaveStyle({ animationDelay: '450ms' });
  });

  it('has a 4-column grid layout class on large screens', () => {
    const { container } = render(<HowItWorksSection />);
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });
});
