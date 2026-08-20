# Mobile QA checklist

Run this before shipping any layout change that touches viewport height,
sticky surfaces, modals, or scroll containers. Automated coverage lives in
`src/test/layout/layout-invariants.test.ts`; this list covers what a machine
cannot assert.

## Devices

- iOS Safari (latest) — iPhone with a home indicator (e.g. 15/16 class)
- iOS Safari with the URL bar expanded **and** collapsed
- Android Chrome (latest) — mid-size phone, gesture navigation on
- One small viewport: 360 x 640 CSS px

## Viewport height (dvh)

- [ ] Page fills the screen with the URL bar expanded, no gap at the bottom.
- [ ] Scrolling to collapse the URL bar does not cause a layout jump or a
      second scrollbar.
- [ ] No content sits behind the iOS home indicator or Android nav bar.
- [ ] Every full-height container uses `min-h-screen min-h-dvh` (fallback
      first) — enforced by the layout invariants test.

## Sticky headers and toolbars

- [ ] Header stays pinned while scrolling; it never overlaps focused inputs.
- [ ] Sticky results toolbar stays above card content (explicit `z-*`).
- [ ] Opening the keyboard does not detach or duplicate sticky elements.
- [ ] Anchor jumps (`#main-content`) land below the sticky header, not under it.

## Modals and sheets

- [ ] Modal content is fully reachable at 360 x 640 — nothing clipped.
- [ ] Background page does not scroll while a modal is open.
- [ ] Closing the modal restores the previous scroll position.
- [ ] Modal is dismissible with the on-screen back gesture on Android.

## Scroll areas

- [ ] Horizontal chip/filter rows scroll without trapping vertical scroll.
- [ ] Virtualized card grid keeps whole cards visible; no overlap on resize.
- [ ] Pull-to-refresh does not fire inside inner scroll areas
      (`overscroll-behavior` is set on `html, body`).

## Touch and accessibility

- [ ] Primary tap targets are at least 44 x 44 px.
- [ ] Skip link is the first focusable element and jumps to `#main-content`.
- [ ] Icon-only buttons announce a name in VoiceOver / TalkBack.
- [ ] Focus outline is visible after keyboard/switch navigation.

## Performance sanity

- [ ] Search results paint a skeleton within ~200 ms of submitting.
- [ ] Repeating the same search or reopening a card feels instant
      (in-memory Scryfall cache hit, no network request in DevTools).
