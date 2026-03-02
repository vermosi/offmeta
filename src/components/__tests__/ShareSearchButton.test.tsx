import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareSearchButton } from '../ShareSearchButton';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('ShareSearchButton', () => {
  it('renders share button', () => {
    render(<ShareSearchButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<ShareSearchButton />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Share this search');
  });

  it('copies URL to clipboard on click', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: undefined,
    });
    render(<ShareSearchButton />);
    fireEvent.click(screen.getByRole('button'));
    // Clipboard should have been called
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
