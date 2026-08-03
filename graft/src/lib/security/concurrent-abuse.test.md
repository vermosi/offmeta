# src\lib\security\concurrent-abuse.test.ts

- getWithDedup · function · L69-L92 — async function getWithDedup(key: string): Promise<string>
- getOrPopulate · function · L108-L117 — async function getOrPopulate(key: string): Promise<string>
- createSession · function · L137-L145 — function createSession(): string | null
- createSessionWithEviction · function · L160-L181 — function createSessionWithEviction(): string
- validateSessionData · function · L203-L206 — function validateSessionData(data: Record<string, unknown>): boolean
- enqueue · function · L225-L239 — function enqueue(task: () => Promise<void>): boolean
- processQueue · function · L262-L272 — async function processQueue(): Promise<void>
- enqueue · function · L274-L279 — function enqueue(id: number): void
- incrementWithLock · function · L303-L317 — async function incrementWithLock(): Promise<void>
- processRequest · function · L329-L337 — async function processRequest(requestId: string): Promise<boolean>
- Account · interface · L353-L355 — interface Account
- transfer · function · L364-L393 — async function transfer( from: string, to: string, amount: number, ): Promise<boolean>
