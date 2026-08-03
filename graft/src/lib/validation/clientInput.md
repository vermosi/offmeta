# src\lib\validation\clientInput.ts

- ClientValidationResult · type · L1-L3 — type ClientValidationResult<T> = | { success: true; data: T } | { success: false; message: string };
- sanitizeInput · function · L8-L19 — function sanitizeInput(input: string): string
- hasRepetitiveChars · function · L21-L24 — function hasRepetitiveChars(input: string, threshold: number = 6): boolean
- hasMinimumAlphanumeric · function · L26-L30 — function hasMinimumAlphanumeric(input: string, ratio: number = 0.5): boolean
- validateEmailAddress · function · L32-L42 — function validateEmailAddress( email: string, ): ClientValidationResult<{ email: string }>
- validatePasswordInput · function · L44-L62 — function validatePasswordInput( password: string, ): ClientValidationResult<{ password: string }>
- validateSearchInput · function · L64-L74 — function validateSearchInput( query: string, ): ClientValidationResult<{ query: string }>
- validateAdminSeoQuery · function · L76-L103 — function validateAdminSeoQuery( query: string, ): ClientValidationResult<{ query: string }>
