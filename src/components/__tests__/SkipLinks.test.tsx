import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLinks } from '../SkipLinks';

vi.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('SkipLinks', () => {
  it('renders skip to content link', () => {
    render(<SkipLinks />);
    expect(screen.getByText('a11y.skipToContent')).toBeInTheDocument();
  });

  it('does not render skip to search link by default', () => {
    render(<SkipLinks />);
    expect(screen.queryByText('a11y.skipToSearch')).not.toBeInTheDocument();
  });

  it('renders skip to search link when showSearchLink is true', () => {
    render(<SkipLinks showSearchLink />);
    expect(screen.getByText('a11y.skipToSearch')).toBeInTheDocument();
  });

  it('has correct href for skip to content', () => {
    render(<SkipLinks />);
    const link = screen.getByText('a11y.skipToContent');
    expect(link.getAttribute('href')).toBe('#main-content');
  });

  it('has correct href for skip to search', () => {
    render(<SkipLinks showSearchLink />);
    const link = screen.getByText('a11y.skipToSearch');
    expect(link.getAttribute('href')).toBe('#search-input');
  });
});
