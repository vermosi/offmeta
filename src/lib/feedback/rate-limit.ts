/**
 * Client-side rate limiting for feedback submissions.
 * Uses localStorage with a sliding window.
 */

const RATE_LIMIT_KEY = 'search_feedback_submissions';
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_WINDOW = 5;

interface RateLimitData {
  submissions: number[];
}

function getRateLimitData(): RateLimitData {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    if (!data) return { submissions: [] };
    return JSON.parse(data) as RateLimitData;
  } catch {
    return { submissions: [] };
  }
}

function setRateLimitData(data: RateLimitData): void {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage errors (private browsing, quota exceeded)
  }
}

function cleanExpiredSubmissions(submissions: number[]): number[] {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  return submissions.filter((ts) => ts > cutoff);
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingSubmissions: number;
  resetInMinutes: number;
}

export function checkRateLimit(): RateLimitStatus {
  const data = getRateLimitData();
  const validSubmissions = cleanExpiredSubmissions(data.submissions);
  setRateLimitData({ submissions: validSubmissions });

  const remainingSubmissions =
    MAX_SUBMISSIONS_PER_WINDOW - validSubmissions.length;
  const oldestSubmission = validSubmissions[0] || Date.now();
  const resetInMs = Math.max(
    0,
    oldestSubmission + RATE_LIMIT_WINDOW_MS - Date.now(),
  );
  const resetInMinutes = Math.ceil(resetInMs / 60000);

  return {
    allowed: validSubmissions.length < MAX_SUBMISSIONS_PER_WINDOW,
    remainingSubmissions: Math.max(0, remainingSubmissions),
    resetInMinutes,
  };
}

export function recordSubmission(): void {
  const data = getRateLimitData();
  const validSubmissions = cleanExpiredSubmissions(data.submissions);
  validSubmissions.push(Date.now());
  setRateLimitData({ submissions: validSubmissions });
}
