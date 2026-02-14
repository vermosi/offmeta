/**
 * Global keyboard shortcuts for power users.
 * - `/` or `Ctrl+K`: Focus search input
 * - `Escape`: Close modals / clear focus
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  /** Ref to the search input element or a handle with focus method */
  onFocusSearch?: () => void;
  /** Called when Escape is pressed and no modal is open */
  onEscape?: () => void;
}

export function useKeyboardShortcuts({
  onFocusSearch,
  onEscape,
}: KeyboardShortcutsOptions = {}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // `/` to focus search (only when not in an input)
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      // Ctrl/Cmd+K to focus search (works even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      // Escape — only when not in an input
      if (e.key === 'Escape' && !isInput) {
        onEscape?.();
      }
    },
    [onFocusSearch, onEscape],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
