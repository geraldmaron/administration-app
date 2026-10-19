/**
 * Pins a results list's head row under the page's sticky section bar, which
 * publishes its own height as --section-nav-height; a page without the bar
 * pins the row to the top.
 */
export const stickyHead: Readonly<Record<string, string | number>> = { position: "sticky", top: "var(--section-nav-height, 0px)", zIndex: 10 };
