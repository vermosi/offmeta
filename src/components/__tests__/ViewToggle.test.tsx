import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ViewToggle } from '../ViewToggle';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/view-mode-storage', () => ({
  storeViewMode: vi.fn(),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('ViewToggle', () => {
  it('renders three toggle options', () => {
    const onChange = vi.fn();
    renderWithProviders(<ViewToggle value="grid" onChange={onChange} />);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    const onChange = vi.fn();
    renderWithProviders(<ViewToggle value="grid" onChange={onChange} />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'view.label');
  });

  it('renders all three toggle items', () => {
    const onChange = vi.fn();
    renderWithProviders(<ViewToggle value="list" onChange={onChange} />);
    // Should have 3 toggle items for grid, list, images
    const items = screen.getAllByRole('radio');
    expect(items.length).toBe(3);
  });
});
