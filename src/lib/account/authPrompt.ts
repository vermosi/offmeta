/**
 * Contextual sign-in prompts.
 *
 * Saving is the first moment OffMeta asks for an account, and the ask has to
 * happen wherever the user is (a card in a grid, the search desk) without every
 * one of those components owning an auth modal. Components fire a request; the
 * app chrome (Header) listens and opens the modal with the matching pitch.
 */

const EVENT = 'offmeta:request-sign-in';

export interface SignInPromptDetail {
  /** Short sentence explaining what signing in unlocks right now. */
  reason?: string;
}

/** Ask the app chrome to open the sign-in modal. */
export function requestSignIn(reason?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<SignInPromptDetail>(EVENT, { detail: { reason } }),
  );
}

/** Subscribe to sign-in requests. Returns an unsubscribe function. */
export function onSignInRequested(
  handler: (detail: SignInPromptDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    handler((event as CustomEvent<SignInPromptDetail>).detail ?? {});
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
