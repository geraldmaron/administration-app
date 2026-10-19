/** The page's side gutter for the window: a full-bleed band (a map stage, a sticky bar) reaches the edge by stepping out this far. */
export function pageGutter(media: { readonly phone?: boolean; readonly wide?: boolean }): number {
  return media.phone ? 16 : media.wide ? 40 : 28;
}
