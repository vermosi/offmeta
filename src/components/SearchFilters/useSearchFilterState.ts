import { useCallback, useMemo, useRef, useState } from 'react';
import type { FilterState } from '@/types/filters';
import { buildDefaultFilters } from '@/components/SearchFilters/constants';

interface UseSearchFilterStateParams {
  defaultMaxCmc: number;
  initialFilters?: Partial<FilterState> | null;
  resetKey: number;
}

export function useSearchFilterState({
  defaultMaxCmc,
  initialFilters,
  resetKey,
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

  const applyResetIfNeeded = () => {
    if (prevResetKey !== resetKey) {
      setPrevResetKey(resetKey);
      setFilters(defaultFilters);
      return true;
    }
    return false;
  };

  const syncCmcRangeIfPristine = () => {
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
  };

  return {
    filters,
    setFilters,
    defaultFilters,
    applyResetIfNeeded,
    syncCmcRangeIfPristine,
  };
}
