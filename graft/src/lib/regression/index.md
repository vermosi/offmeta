# src\lib\regression\index.ts

- NLTranslationTestCase · interface · L13-L22 — interface NLTranslationTestCase
- ValidationTestCase · interface · L24-L35 — interface ValidationTestCase
- MockCard · type · L37-L37 — type MockCard = ScryfallCard;
- buildMockCard · function · L42-L79 — function buildMockCard(overrides: Partial<MockCard> = {}): MockCard
- buildMockCards · function · L82-L89 — function buildMockCards( count: number, overrides: Partial<MockCard> = {}, ): MockCard[]
- MockSemanticSearchResponse · interface · L91-L101 — interface MockSemanticSearchResponse
- buildMockSemanticSearchResponse · function · L104-L121 — function buildMockSemanticSearchResponse( originalQuery: string, scryfallQuery: string, overrides: Partial<MockSemanticSearchResponse> = {}, ): MockSemanticSearchResponse
- mockIntersectionObserver · function · L124-L132 — function mockIntersectionObserver(): void
- mockResizeObserver · function · L135-L142 — function mockResizeObserver(): void
- setupBrowserMocks · function · L145-L148 — function setupBrowserMocks(): void
