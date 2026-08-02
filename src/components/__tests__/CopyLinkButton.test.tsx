import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopyLinkButton } from '../CopyLinkButton';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackShareClicked: vi.fn() }),
}));

vi.mock('@/lib/search/search-state', () => ({
  encodeFiltersToUrl: (params: URLSearchParams, _filters: unknown) => {
    params.set('filters', 'encoded');
  },
}));

describe('CopyLinkButton', () => {
  it('renders copy link button', () => {
    render(<CopyLinkButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<CopyLinkButton />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Copy link to this search',
    );
  });

  it('copies URL to clipboard on click', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<CopyLinkButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
