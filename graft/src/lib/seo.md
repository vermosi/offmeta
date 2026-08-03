# src\lib\seo.ts

- SeoOptions · interface · L6-L25 — interface SeoOptions
- setMeta · function · L28-L36 — function setMeta(nameOrProp: string, content: string, attr: 'name' | 'property' = 'name')
- setCanonical · function · L39-L47 — function setCanonical(url: string)
- applySeoMeta · function · L53-L109 — function applySeoMeta(opts: SeoOptions): () => void
- buildSearchCanonical · function · L121-L124 — function buildSearchCanonical(compiledQuery: string): string
- injectJsonLd · function · L135-L148 — function injectJsonLd(data: Record<string, unknown>): () => void
- buildCardJsonLd · function · L159-L258 — function buildCardJsonLd(card: ScryfallCard, pageUrl: string): Record<string, unknown>
- buildSearchResultsJsonLd · function · L263-L297 — function buildSearchResultsJsonLd( cards: ScryfallCard[], queryDescription: string, ): Record<string, unknown>
- buildBreadcrumbJsonLd · function · L302-L315 — function buildBreadcrumbJsonLd( items: Array<{ name: string; url: string }>, ): Record<string, unknown>
- buildFaqJsonLd · function · L321-L336 — function buildFaqJsonLd( faqs: Array<{ question: string; answer: string }>, ): Record<string, unknown>
- buildGuideArticleJsonLd · function · L341-L360 — function buildGuideArticleJsonLd(opts: { title: string; description: string; url: string; publishedTime: string; modifiedTime: string; }): Record<string, unknown>
- buildCardFaqs · function · L365-L411 — function buildCardFaqs(card: ScryfallCard): Array<{ question: string; answer: string }>
