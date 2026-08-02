/**
 * Hooks barrel export.
 * @module hooks
 */

export { useAdminAnalyticsData } from './useAdminAnalyticsData';
export { useAdminAnalyticsFilters } from './useAdminAnalyticsFilters';
export { useAffiliateConfig, wrapAffiliateUrl } from './useAffiliateConfig';
export { useAnalytics } from './useAnalytics';
export { useAuth, useAuthProvider, AuthContext } from './useAuth';
export { useBatchPriceHistory } from './useBatchPriceHistory';
export { useCompare } from './useCompare';
export { useDeckIdeas, type DeckIdea } from './useDeckIdeas';
export { useFocusTrap } from './useFocusTrap';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useMarketTrends, type PriceMover } from './useMarketTrends';
export { useIsMobile } from './useMobile';
export { useNoIndex } from './useNoIndex';
export { usePriceHistory, computePriceTrend, type PriceSnapshot } from './usePriceHistory';
export { useQueryIntelligence, type QueryIntelligence } from './useQueryIntelligence';
export { useQuerySuggestions, type QuerySuggestion } from './useQuerySuggestions';
export { useRealtimeCache, RealtimeCacheProvider } from './useRealtimeCache';
export { useRovingTabIndex } from './useRovingTabIndex';
export { useSearch } from './useSearch';
export { useSearchContext } from './useSearchContext';
export { useSearchHandler, type SearchPhase } from './useSearchHandler';
export { useSearchHistory } from './useSearchHistory';
export { useTranslateQuery, usePrefetchPopularQueries, type TranslationResult } from './useSearchQuery';
export { useSimilarCards, type SimilarityData } from './useSimilarCards';
export { useToast, toast } from './useToast';
export { useUndoRedo, type UndoableAction } from './useUndoRedo';
export { useUserRole } from './useUserRole';
export { useVoiceInput } from './useVoiceInput';
