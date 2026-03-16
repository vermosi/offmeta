/**
 * Feedback input validation (native — no zod dependency).
 */

export type ValidationResult =
  | { success: true; data: { issueDescription: string } }
  | { success: false; message: string };

export function validateIssue(issueDescription: string): ValidationResult {
  const desc = issueDescription.trim();
  if (desc.length < 10)
    return {
      success: false,
      message: 'Please provide more details (at least 10 characters)',
    };
  if (desc.length > 1000)
    return {
      success: false,
      message: 'Description too long (max 1000 characters)',
    };
  return { success: true, data: { issueDescription: desc } };
}

export function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error)
    return String((error as { message: unknown }).message);
  return 'Unknown error';
}
