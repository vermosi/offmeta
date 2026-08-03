# src\tests\e2e\accessibility-helper-contract.test.ts

- MockAxeBuilder · class · L10-L28 — class MockAxeBuilder
- constructor · method · L11-L13 — constructor(options: { page: Page })
- withTags · method · L15-L18 — withTags(tags: string[])
- include · method · L20-L23 — include(scope: string)
- analyze · method · L25-L27 — async analyze()
- MockViolation · type · L35-L42 — type MockViolation = { id: string; impact: 'critical' | 'serious' | 'moderate'; description: string; help: string; helpUrl: string; nodes: Array<Record<string, unknown>>; };
- createViolation · function · L44-L56 — function createViolation( id: string, impact: MockViolation['impact'], ): MockViolation
- createMockPage · function · L58-L62 — function createMockPage(): Page
- createMockTestInfo · function · L64-L68 — function createMockTestInfo()
