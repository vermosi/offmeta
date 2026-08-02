/** Persists view mode preference in localStorage. */

export type ViewMode = 'grid' | 'list';

const VIEW_MODE_KEY = 'offmeta_view_mode';

export function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'grid';
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch {
    // Ignore
  }
  return 'grid';
}

export function storeViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // Ignore
  }
}

