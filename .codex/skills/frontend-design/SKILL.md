---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use when building or refining web components, pages, or apps (HTML/CSS/JS/React) with bold aesthetics, purposeful layouts, motion, and accessibility. Avoid generic AI-looking output.
---

# Frontend Design

## Overview

Build memorable, functional interfaces with a clear aesthetic direction. Focus on bold typography, cohesive palettes, purposeful motion, semantic structure, and accessibility.

## Quick Start
- Collect intent: purpose, audience, platform constraints, framework, delivery format.
- Choose an aesthetic direction and signature move. See `references/aesthetic-playbook.md`.
- Define tokens: fonts, palette, shadows, radii, spacing scale. Load fonts early.
- Plan layout: hero + supporting sections, data/timeline rails, cards; pick grid system and motion plan.
- Build semantic markup, wire CSS variables, add motion with staggered reveals, then run accessibility and responsive checks.

## Workflow

### 1) Define intent and aesthetic
- Ask for target users, tone, content types, performance constraints.
- Pick one memorable gesture and stick to it.
- If vague, propose 2-3 aesthetic directions from `references/aesthetic-playbook.md` and confirm.

### 2) Plan structure and tokens
- Establish CSS variables for palette, shadows, radii, spacing, and motion curve. Keep accent count to 1-2.
- Choose font pairing and fallbacks.
- Map sections and micro-interactions. For React, break into composable pieces.
- Reference `references/implementation-patterns.md` for layout, motion, accessibility, and responsive patterns.

### 3) Build and animate
- Use semantic headings, skip links, ARIA labels, descriptive alt text.
- Prefer CSS Grid for macro and Flexbox for clusters.
- Use custom backgrounds to avoid flat color.
- Orchestrate a few meaningful animations. Guard with `prefers-reduced-motion`.
- Define arrays of content to keep components DRY and easy to restyle.

### 4) Polish and QA
- Responsive: collapse grids, keep CTAs prominent on mobile.
- Accessibility: one `h1`, logical heading order, focus styles, contrast AA+, labeled inputs.
- Performance: avoid heavy shadows on mobile, compress assets, use font-display swap.

## References
- `references/aesthetic-playbook.md`
- `references/implementation-patterns.md`

## Assets
- `assets/vanilla-starter/`
