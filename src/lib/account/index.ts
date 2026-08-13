/**
 * Account persistence helpers barrel.
 * @module lib/account
 */

export { requestSignIn, onSignInRequested, type SignInPromptDetail } from './authPrompt';
export {
  setPendingSave,
  takePendingSave,
  clearPendingSave,
  type PendingSave,
  type PendingCardSave,
  type PendingSearchSave,
  type SavedCardInput,
} from './pendingSave';
export { normalizeQueryKey, toSavedCardInput } from './cardMapping';
