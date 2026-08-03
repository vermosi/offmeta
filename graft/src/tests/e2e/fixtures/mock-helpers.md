# src\tests\e2e\fixtures\mock-helpers.ts

- mockSearchAPIs · function · L35-L60 — async function mockSearchAPIs( page: Page, opts: { semanticResponse?: Record<string, unknown>; scryfallResponse?: Record<string, unknown>; } = {}, )
- mockBoltSearchAPIs · function · L65-L70 — async function mockBoltSearchAPIs(page: Page)
- searchForCard · function · L75-L85 — async function searchForCard(page: Page, query: string)
- buildMockUser · function · L92-L102 — function buildMockUser(overrides: { id: string; email: string })
- MockAuthOptions · interface · L104-L115 — interface MockAuthOptions
- mockAuthAPIs · function · L127-L198 — async function mockAuthAPIs( page: Page, opts: MockAuthOptions = {}, )
- MockAdminOptions · interface · L220-L229 — interface MockAdminOptions extends MockAuthOptions
- mockAdminAPIs · function · L237-L278 — async function mockAdminAPIs( page: Page, opts: MockAdminOptions = {}, )
- emptyJson · function · L257-L261 — emptyJson = (data: unknown)
- signInViaDialog · function · L284-L325 — async function signInViaDialog( page: Page, opts: { email?: string; password?: string } = {}, )
