/**
 * Tests for ScrollToTop component.
 * @module components/__tests__/ScrollToTop.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ScrollToTop } from '../ScrollToTop';

describe('ScrollToTop', () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  it('is hidden when scroll position is below threshold', () => {
    render(<ScrollToTop threshold={500} />);
    expect(screen.queryByLabelText('Scroll to top')).not.toBeInTheDocument();
  });

  it('becomes visible when scrolled past threshold', () => {
    render(<ScrollToTop threshold={500} />);

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 600 });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();
  });

  it('scrolls to top when clicked', () => {
    render(<ScrollToTop threshold={100} />);

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 200 });
      window.dispatchEvent(new Event('scroll'));
    });

    fireEvent.click(screen.getByLabelText('Scroll to top'));
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('hides when scrolled back above threshold', () => {
    render(<ScrollToTop threshold={500} />);

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 600 });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 100 });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(screen.queryByLabelText('Scroll to top')).not.toBeInTheDocument();
  });
});
