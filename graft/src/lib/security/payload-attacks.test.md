# src\lib\security\payload-attacks.test.ts

- getDepth · function · L70-L75 — function getDepth(obj: Record<string, unknown>, current: number = 0): number
- getDepth · function · L84-L89 — function getDepth(obj: Record<string, unknown>, current: number = 0): number
- validateDepth · function · L96-L111 — function validateDepth( obj: unknown, maxDepth: number, currentDepth: number = 0, ): boolean
- safeTraverse · function · L148-L167 — function safeTraverse( obj: unknown, maxDepth: number = 50, currentDepth: number = 0, ): number
- validateBody · function · L183-L188 — function validateBody(body: unknown): { valid: boolean; error?: string }
- validateBody · function · L196-L204 — function validateBody(body: unknown): { valid: boolean; error?: string }
- validateQuery · function · L236-L248 — function validateQuery(body: unknown): { valid: boolean; error?: string }
- normalizeWhitespace · function · L294-L300 — function normalizeWhitespace(input: string): string
- hasControlChars · function · L308-L312 — function hasControlChars(input: string): boolean
- checkBodySize · function · L329-L331 — function checkBodySize(body: string): boolean
- checkHeaderSize · function · L343-L349 — function checkHeaderSize(headers: Record<string, string>): boolean
- checkURLLength · function · L367-L369 — function checkURLLength(url: string): boolean
