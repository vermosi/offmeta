/**
 * Shared navigation chrome tokens so the header and footer stay visually identical
 * (same spacing rhythm, type scale, tracking, and link states).
 */

/** Quiet mono nav/utility link (header nav, footer links, social links). */
export const NAV_LINK_CLASS =
  'font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground focus-ring';

/** Same as NAV_LINK_CLASS but for links that carry an inline icon. */
export const NAV_LINK_WITH_ICON_CLASS = `inline-flex items-center gap-2 ${NAV_LINK_CLASS}`;

/** Section eyebrow / meta label (footer column titles, copyright). */
export const NAV_EYEBROW_CLASS =
  'font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70';

/** Brand wordmark next to the logo. */
export const NAV_WORDMARK_CLASS =
  'font-display text-sm font-extrabold uppercase tracking-[0.22em] text-foreground';

/** Logo lockup wrapper (logo + wordmark). */
export const NAV_BRAND_CLASS = 'group flex items-center gap-2.5 focus-ring';

/** Logo sizing shared by header and footer. */
export const NAV_LOGO_CLASS = 'h-7 w-7';

/** Horizontal gap between inline nav links. */
export const NAV_LINK_GAP_CLASS = 'gap-6';
