/**
 * Search feedback utilities.
 * @module lib/feedback
 */

export { checkRateLimit, recordSubmission, type RateLimitStatus } from './rate-limit';
export { submitFeedback, type FeedbackPayload } from './submit';
export { validateIssue, extractErrorDetail, type ValidationResult } from './validate';
