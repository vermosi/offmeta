
# Regression Sweep — 2026-02-14

## ✅ What's Working Well

| Area | Status | Notes |
|------|--------|-------|
| Home page load | ✅ | Fast, no console errors, clean layout |
| Search (desktop) | ✅ | Chip suggestions, translated query, results render correctly |
| Card modal | ✅ | Image, oracle text, prices, legalities, rulings, printings |
| List view | ✅ | Clean table with name, mana cost, type, rarity, price |
| Image/grid view | ✅ | Card images render with details overlay |
| Surprise Me | ✅ | Opens random card modal immediately |
| Theme toggle | ✅ | Dark ↔ Light mode works, cards readable in both |
| Guides index | ✅ | 10 guide cards, difficulty badges, example queries |
| Guide detail page | ✅ | Content, "How OffMeta Helps", tips, search button |
| Breadcrumbs | ✅ | Home / Guides / [Guide Title] navigation |
| Header nav (desktop) | ✅ | All links work including hash scrolling from other pages |
| Daily Pick section | ✅ | Card image, description, "why it's a gem" callout |
| How It Works | ✅ | 4-step cards rendered |
| FAQ accordion | ✅ | 5 questions, expand/collapse |
| Footer | ✅ | Logo, copyright, guide links, Scryfall credit, WotC disclaimer |
| 404 page | ✅ | Shows 404 message with "Return to Home" link |
| Search on mobile | ✅ | Input, search button, results render properly |
| Sort & filter toolbar | ✅ | Filters, sort, view toggles, export, compare, stats |
| Similar searches | ✅ | Contextual chip suggestions below toolbar |
| Translated query bar | ✅ | Editable, copy, re-run, Scryfall link, regenerate, report issue |

## 🐛 Issues Found

### P1 — Mobile hamburger menu overlay is broken
- **What:** Nav items float over page content instead of having an opaque overlay background.
- **Impact:** Unreadable nav on mobile — items overlap hero text.
- **Fix:** Change overlay from `bg-background/95` to fully opaque `bg-background`, verify z-index stacking.

### P2 — StaplesSection may not be visible
- **What:** The `StaplesSection` component exists but wasn't visible during scroll-through of home page.
- **Impact:** Missing discovery feature for archetype staples.
- **Fix:** Verify it's rendered in Index.tsx and has data to display.

## 🔧 Fix Plan

1. **Fix mobile hamburger menu overlay** — Make background fully opaque, test on mobile viewport
2. **Verify/fix StaplesSection rendering** — Ensure component is mounted and visible on home page
