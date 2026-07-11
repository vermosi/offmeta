import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import { DeckEditorShortcutsModal } from '@/components/deckbuilder/DeckEditorShortcutsModal';

describe('DeckEditorShortcutsModal', () => {
  it('renders as an accessible dialog and closes on escape', () => {
    const onClose = vi.fn();
    render(<DeckEditorShortcutsModal isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(/focusSearch/i)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

