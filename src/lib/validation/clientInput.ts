export type ClientValidationResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ADMIN_QUERY_LENGTH = 200;

function sanitizeInput(input: string): string {
  const zeroWidthRegex = /[\u200B-\u200D\uFEFF]/g;
  const nullByte = String.fromCharCode(0);
  const controlChars = new RegExp(`[${String.fromCharCode(1)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}${String.fromCharCode(14)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`, 'g');

  return input
    .replaceAll(nullByte, '')
    .replace(controlChars, '')
    .replace(zeroWidthRegex, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasRepetitiveChars(input: string, threshold: number = 6): boolean {
  const pattern = new RegExp(`(.)\\1{${threshold - 1},}`);
  return pattern.test(input);
}

function hasMinimumAlphanumeric(input: string, ratio: number = 0.5): boolean {
  if (input.length <= 10) return true;
  const alphanumericCount = (input.match(/[a-zA-Z0-9]/g) || []).length;
  return alphanumericCount >= input.length * ratio;
}

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
