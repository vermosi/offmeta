# scripts\prerender-cards.mjs

- slugifyCardName · function · L29-L35 — function slugifyCardName(name)
- escapeHtml · function · L37-L44 — function escapeHtml(str)
- truncate · function · L46-L49 — function truncate(str, max)
- pgrest · function · L51-L58 — async function pgrest(pathAndQuery)
- fetchTopCards · function · L60-L113 — async function fetchTopCards(limit)
- buildTitle · function · L115-L123 — function buildTitle(name)
- buildDescription · function · L125-L129 — function buildDescription(card)
- buildProductJsonLd · function · L131-L152 — function buildProductJsonLd(card, canonicalUrl, image)
- customizeHtmlForCard · function · L156-L231 — function customizeHtmlForCard(templateHtml, card, slug)
- main · function · L233-L278 — async function main()
