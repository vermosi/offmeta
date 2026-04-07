/**
 * Hooks barrel export.
 * @module hooks
 */

export { useAdminAnalyticsData } from './useAdminAnalyticsData';
export { useAdminAnalyticsFilters } from './useAdminAnalyticsFilters';
export { useAffiliateConfig, wrapAffiliateUrl } from './useAffiliateConfig';
export { useAnalytics } from './useAnalytics';
export {
  useArchetypeData,
  useArchetypeDeckCounts,
  useArchetypeTrends,
  type ArchetypeEntry,
  type MacroGroup,
  type ArchetypesByFormat,
  type TrendData,
} from './useArchetypeData';
export { useAuth, useAuthProvider, AuthContext } from './useAuth';
export { useBatchPriceHistory } from './useBatchPriceHistory';
export {
  useCollection,
  useCollectionLookup,
  useAddToCollection,
  useRemoveFromCollection,
  useUpdateCollectionQuantity,
  useCollectionCard,
  type CollectionCard,
} from './useCollection';
export { useCollectionValue, type CollectionValueData, type SetCompletionEntry } from './useCollectionValue';
export { useCompare } from './useCompare';
export {
  useDecks,
  useDeck,
  useDeckCards,
  useDeckMutations,
  useDeckCardMutations,
  type Deck,
  type DeckCard,
} from './useDeck';
export { useDeckActions } from './useDeckActions';
export { useDeckComments, type DeckComment } from './useDeckComments';
export { useDeckEditorDerivedState } from './useDeckEditorDerivedState';
export { useDeckEditorHandlers, type DeckViewMode } from './useDeckEditorHandlers';
export { useDeckIdeas, type DeckIdea } from './useDeckIdeas';
export { useDeckKeyboardShortcuts } from './useDeckKeyboardShortcuts';
export { useDeckPrice } from './useDeckPrice';
export { useDeckTags, useDeckTagMutations, usePopularTags, type DeckTag } from './useDeckTags';
export { useDeckVotes } from './useDeckVotes';
export { useFocusTrap } from './useFocusTrap';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useMarketTrends, type PriceMover } from './useMarketTrends';
export { useIsMobile } from './useMobile';
export { useNoIndex } from './useNoIndex';
export {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  type UserNotification,
} from './useNotifications';
export {
  usePriceAlerts,
  useCardPriceAlerts,
  useCreatePriceAlert,
  useDeletePriceAlert,
  type PriceAlert,
} from './usePriceAlerts';
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
export { useSignatureCards, type SignatureCard } from './useSignatureCards';
export { useSimilarCards, type SynergyCard, type SimilarityData } from './useSimilarCards';
export { toast } from './useToast';
export { useTypingPlaceholder } from './useTypingPlaceholder';
export { useUndoRedo, type UndoableAction } from './useUndoRedo';
export { useUserRole } from './useUserRole';
export { useVoiceInput } from './useVoiceInput';
