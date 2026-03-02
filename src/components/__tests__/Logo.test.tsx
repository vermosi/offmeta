import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from '../Logo';

describe('Logo', () => {
  it('renders an SVG element', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is hidden from screen readers', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders gradient variant by default', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('linearGradient')).toBeInTheDocument();
  });

  it('renders mono variant without gradient', () => {
    const { container } = render(<Logo variant="mono" />);
    expect(container.querySelector('linearGradient')).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<Logo className="custom-class" />);
    expect(container.querySelector('svg')?.classList.contains('custom-class')).toBe(true);
  });
});
