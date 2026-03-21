import {
  hasMinimumAlphanumeric,
  hasRepetitiveChars,
  sanitizeInput,
} from '@/lib/security';

export type ClientValidationResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SEARCH_QUERY_LENGTH = 300;
const MAX_ADMIN_QUERY_LENGTH = 200;

export function validateEmailAddress(
  email: string,
): ClientValidationResult<{ email: string }> {
  const sanitized = sanitizeInput(email).toLowerCase();

  if (!sanitized || !EMAIL_REGEX.test(sanitized) || sanitized.length > 254) {
    return { success: false, message: 'Enter a valid email address.' };
  }

  return { success: true, data: { email: sanitized } };
}

export function validatePasswordInput(
  password: string,
): ClientValidationResult<{ password: string }> {
  if (password.length < 6) {
    return {
      success: false,
      message: 'Password must be at least 6 characters.',
    };
  }

  if (password.length > 128) {
    return {
      success: false,
      message: 'Password must be 128 characters or fewer.',
    };
  }

  return { success: true, data: { password } };
}

export function validateSearchInput(
  query: string,
): ClientValidationResult<{ query: string }> {
  const sanitized = sanitizeInput(query);

  if (!sanitized) {
    return { success: false, message: 'Enter a search query.' };
  }

  if (sanitized.length > MAX_SEARCH_QUERY_LENGTH) {
    return {
      success: false,
      message: 'Search queries must be 300 characters or fewer.',
    };
  }

  if (
    hasRepetitiveChars(sanitized, 8) ||
    !hasMinimumAlphanumeric(sanitized, 0.2)
  ) {
    return {
      success: false,
      message: 'Search query looks invalid. Please revise it and try again.',
    };
  }

  return { success: true, data: { query: sanitized } };
}

export function validateAdminSeoQuery(
  query: string,
): ClientValidationResult<{ query: string }> {
  const sanitized = sanitizeInput(query);

  if (sanitized.length < 3) {
    return { success: false, message: 'Query must be at least 3 characters.' };
  }

  if (sanitized.length > MAX_ADMIN_QUERY_LENGTH) {
    return {
      success: false,
      message: 'Query must be 200 characters or fewer.',
    };
  }

  if (
    hasRepetitiveChars(sanitized, 8) ||
    !hasMinimumAlphanumeric(sanitized, 0.25)
  ) {
    return {
      success: false,
      message: 'Query looks invalid. Please revise it and try again.',
    };
  }

  return { success: true, data: { query: sanitized } };
}
