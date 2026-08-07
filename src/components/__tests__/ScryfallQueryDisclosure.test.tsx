import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScryfallQueryDisclosure } from '@/components/ScryfallQueryDisclosure';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

describe('ScryfallQueryDisclosure', () => {
  it('shows provenance on the closed disclosure trigger', () => {
    render(
      <ScryfallQueryDisclosure
        scryfallQuery='o:"treasure"'
        metaLabel={'Deterministic \u00b7 95%'}
      >
        <div>query body</div>
      </ScryfallQueryDisclosure>,
    );

    expect(screen.getByText('Deterministic · 95%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('query body')).toBeInTheDocument();
  });
});
