/**
 * Tests for FAQSection component.
 * @module components/__tests__/FAQSection.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FAQSection } from '../FAQSection';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'faq.heading': 'Frequently Asked Questions',
        'faq.q1': 'What is OffMeta?',
        'faq.a1': 'OffMeta is a card search tool.',
        'faq.q2': 'How does it work?',
        'faq.a2': 'It translates natural language to Scryfall queries.',
        'faq.q3': 'Q3',
        'faq.a3': 'A3',
        'faq.q4': 'Q4',
        'faq.a4': 'A4',
        'faq.q5': 'Q5',
        'faq.a5': 'A5',
        'faq.q6': 'Q6',
        'faq.a6': 'A6',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock IntersectionObserver
beforeEach(() => {
  const mockObserver = vi.fn().mockImplementation((callback) => {
    callback([{ isIntersecting: true }]);
    return { observe: vi.fn(), disconnect: vi.fn() };
  });
  vi.stubGlobal('IntersectionObserver', mockObserver);
});

describe('FAQSection', () => {
  it('renders heading', () => {
    render(<FAQSection />);
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });

  it('renders all FAQ questions', () => {
    render(<FAQSection />);
    expect(screen.getByText('What is OffMeta?')).toBeInTheDocument();
    expect(screen.getByText('How does it work?')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<FAQSection />);
    const section = screen.getByLabelText('Frequently Asked Questions');
    expect(section).toBeInTheDocument();
  });

  it('renders 6 FAQ items', () => {
    const { container } = render(<FAQSection />);
    const items = container.querySelectorAll('[data-state]');
    expect(items.length).toBe(6);
  });
});
