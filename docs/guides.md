# Guides

This page describes the search-guides system and how to navigate the generated content.

## What The System Provides

- 10 progressive search guides
- SEO metadata and structured data
- localized guide content
- internal linking between related guides

## Canonical Files

- `src/data/guides.ts`
- `src/pages/GuidesIndex.tsx`
- `src/pages/GuidePage.tsx`
- `src/pages/__tests__/GuidesIndex.test.tsx`
- `src/pages/__tests__/GuidePage.test.tsx`
- `src/data/__tests__/guides.test.ts`

## How The Guides Fit Together

The guides are designed to teach search patterns in layers:

1. Start with a simpler concept such as type, color, or format filtering.
2. Add additional constraints like price, keyword, or synergy.
3. Move into multi-constraint queries once the basics are clear.
4. Use internal links to jump between related patterns.

The goal is to make the search model teachable. A user should be able to begin with a plain-English intent and gradually learn how that intent maps to Scryfall syntax.

## When To Edit The Guide System

- Update `src/data/guides.ts` when the content or ordering changes.
- Update `src/pages/GuidesIndex.tsx` when the guide landing page needs a new editorial shape.
- Update `src/pages/GuidePage.tsx` when individual guide rendering changes.
- Update the tests alongside any content or structure change.

## More Detail

For the longer explanation, use the guide pages in the app or inspect `src/data/guides.ts` directly.
