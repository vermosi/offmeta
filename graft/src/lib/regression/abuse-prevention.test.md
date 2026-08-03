# src\lib\regression\abuse-prevention.test.ts

- attemptSearch · function · L18-L27 — function attemptSearch(query: string, isValid: boolean): boolean
- ErrorType · type · L35-L35 — type ErrorType = 'validation' | 'network' | 'unknown';
- getErrorType · function · L37-L57 — function getErrorType(error: { status?: number; message?: string; }): ErrorType
- shouldRetry · function · L78-L82 — function shouldRetry(errorType: string): boolean
- showErrorToast · function · L97-L103 — function showErrorToast(message: string): boolean
- showErrorToast · function · L118-L124 — function showErrorToast(message: string): boolean
- resetToasts · function · L126-L128 — function resetToasts(): void
- hasRepetitiveChars · function · L156-L159 — function hasRepetitiveChars(query: string): boolean
- hasExcessiveSpecialChars · function · L167-L171 — function hasExcessiveSpecialChars(query: string): boolean
- countParameters · function · L180-L183 — function countParameters(query: string): number
