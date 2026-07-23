import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroSection } from '../HeroSection';

function renderHero() {
  return render(
    <MemoryRouter>
      <HeroSection />
    </MemoryRouter>,
  );
}

describe('HeroSection', () => {
  it('renders a single H1 with the hero id', () => {
    renderHero();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('id', 'hero-heading');
  });

  it('exposes a section labelled by the hero heading', () => {
    renderHero();
    const section = screen.getByRole('region', { name: /find the card/i });
    expect(section).toHaveAttribute('aria-labelledby', 'hero-heading');
  });

  it('wires the subtitle paragraph to the heading via aria-describedby', () => {
    const { container } = renderHero();
    const subtitle = container.querySelector('#hero-subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle?.tagName).toBe('P');
    expect(subtitle).toHaveAttribute('aria-describedby', 'hero-heading');
  });

  it('splits the subtitle into two semantic lines', () => {
    const { container } = renderHero();
    const spans = container.querySelectorAll('#hero-subtitle > span');
    expect(spans.length).toBe(2);
    expect(spans[0]?.textContent).toMatch(/natural language/i);
    expect(spans[1]?.textContent).toMatch(/regex|operators/i);
  });

  it('marks decorative icons with aria-hidden', () => {
    const { container } = renderHero();
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('provides accessible names for both CTAs', () => {
    renderHero();
    expect(
      screen.getByRole('button', { name: /start searching/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /explore archetypes/i }),
    ).toBeInTheDocument();
  });
});
