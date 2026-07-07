import { useCallback, useMemo, useRef, useState } from 'react';
import type { FilterState } from '@/types/filters';
import { buildDefaultFilters } from '@/components/SearchFilters/constants';

interface UseSearchFilterStateParams {
  defaultMaxCmc: number;
  initialFilters?: Partial<FilterState> | null;
  resetKey: number;
  /** External patch to merge into filters when `overrideKey` changes. */
  pendingOverride?: Partial<FilterState> | null;
  /** Bumped by parent whenever `pendingOverride` should be applied. */
  overrideKey?: number;
}

export function useSearchFilterState({
  defaultMaxCmc,
  initialFilters,
  resetKey,
  pendingOverride,
  overrideKey = 0,
}: UseSearchFilterStateParams) {
  const buildFilters = useCallback(
    (maxCmc: number): FilterState => {
      const defaults = buildDefaultFilters(maxCmc);
      if (!initialFilters) {
        return defaults;
      }

      return {
        ...defaults,
        ...initialFilters,
        cmcRange: initialFilters.cmcRange || defaults.cmcRange,
      };
    },
    [initialFilters],
  );

  const [filters, setFilters] = useState<FilterState>(() =>
    buildFilters(defaultMaxCmc),
  );
  const defaultFilters = useMemo(
    () => buildDefaultFilters(defaultMaxCmc),
    [defaultMaxCmc],
  );
  const lastDefaultMaxCmc = useRef(defaultMaxCmc);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  const [prevOverrideKey, setPrevOverrideKey] = useState(overrideKey);

  const applyResetIfNeeded = useCallback(() => {
    if (prevResetKey !== resetKey) {
      setPrevResetKey(resetKey);
      setFilters(defaultFilters);
      return true;
    }
    return false;
  }, [prevResetKey, resetKey, defaultFilters]);

  const applyOverrideIfNeeded = useCallback(() => {
    if (prevOverrideKey === overrideKey || !pendingOverride) {
      return false;
    }
    setPrevOverrideKey(overrideKey);
    setFilters((prev) => {
      const next: FilterState = { ...prev, ...pendingOverride };
      // Guard cmcRange shape when patch supplies partial range.
      if (pendingOverride.cmcRange) {
        next.cmcRange = pendingOverride.cmcRange;
      }
      return next;
    });
    return true;
  }, [prevOverrideKey, overrideKey, pendingOverride]);

  const syncCmcRangeIfPristine = useCallback(() => {
    if (lastDefaultMaxCmc.current === defaultMaxCmc) {
      return;
    }

    setFilters((prev) => {
      const isDefaultRange =
        prev.colors.length === 0 &&
        prev.types.length === 0 &&
        prev.sortBy === 'name-asc' &&
        prev.cmcRange[0] === 0 &&
        prev.cmcRange[1] === lastDefaultMaxCmc.current;

      lastDefaultMaxCmc.current = defaultMaxCmc;

      if (!isDefaultRange) {
        return prev;
      }

      return { ...prev, cmcRange: [0, defaultMaxCmc] };
    });
  }, [defaultMaxCmc]);

  return {
    filters,
    setFilters,
    defaultFilters,
    applyResetIfNeeded,
    applyOverrideIfNeeded,
    syncCmcRangeIfPristine,
  };
}

