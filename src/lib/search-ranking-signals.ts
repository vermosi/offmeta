const FAST_CLICK_KEY = 'offmeta_fast_click_query';
const FIRST_REFINEMENT_KEY = 'offmeta_once:first_refinement';

export function getSearchRankingSignals(originalQuery: string): {
  hadFastClick: boolean;
  hadRefinement: boolean;
} {
  return {
    hadFastClick: sessionStorage.getItem(FAST_CLICK_KEY) === originalQuery,
    hadRefinement: sessionStorage.getItem(FIRST_REFINEMENT_KEY) === '1',
  };
}

