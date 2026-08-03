# supabase\functions\prerender\index.ts

- slugToName · function · L20-L22 — function slugToName(slug: string): string
- slugToQuery · function · L24-L26 — function slugToQuery(slug: string): string
- escapeHtml · function · L28-L35 — function escapeHtml(str: string): string
- ScryfallCard · interface · L39-L51 — interface ScryfallCard
- ScryfallSearchResult · interface · L53-L56 — interface ScryfallSearchResult
- getSupabaseClient · function · L58-L63 — function getSupabaseClient()
- fetchCardByName · function · L65-L98 — async function fetchCardByName(name: string): Promise<ScryfallCard | null>
- fetchSearchResults · function · L100-L110 — async function fetchSearchResults(query: string, limit = 6): Promise<ScryfallSearchResult | null>
- CuratedSearch · interface · L112-L117 — interface CuratedSearch
- fetchCuratedSearch · function · L119-L133 — async function fetchCuratedSearch(slug: string): Promise<CuratedSearch | null>
- SeoPageRow · interface · L135-L148 — interface SeoPageRow
- fetchSeoPage · function · L150-L164 — async function fetchSeoPage(slug: string): Promise<SeoPageRow | null>
- getCardImage · function · L168-L174 — function getCardImage(card: ScryfallCard): string | null
- buildCardPageHtml · function · L178-L268 — function buildCardPageHtml(card: ScryfallCard, slug: string): string
- buildSearchPageHtml · function · L270-L339 — function buildSearchPageHtml( query: string, slug: string, results: ScryfallSearchResult | null, curated?: CuratedSearch | null, forceNoindex = false, ): string
- FullHtmlOptions · interface · L341-L349 — interface FullHtmlOptions
- buildFullHtml · function · L351-L398 — function buildFullHtml(opts: FullHtmlOptions): string
