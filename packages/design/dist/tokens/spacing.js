// Space, radius and the shell's fixed measures, in CSS pixels.
//
// Space is a 4-point scale. The layout measures come from the phone budget in
// docs/DESIGN.md (a 44px top bar, a 112px peek detent, a 334px half detent
// at 390×844) and the desktop panel's 420–520px range.
export const space = {
    "2xs": 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
};
export const radius = {
    chip: 8,
    control: 8,
    card: 12,
    sheet: 16,
    pill: 999,
};
export const layout = {
    /** The top bar on a phone; the desktop bar is taller to hold the date and Continue on one line. */
    barPhone: 44,
    barDesktop: 56,
    /** The phone tab bar above the bottom safe area. */
    tabBar: 50,
    /** The labeled navigation from 1440px; below it the compact rail. */
    nav: 224,
    rail: 88,
    /** The inspector beside a map or a list. */
    inspector: 344,
    panelMin: 420,
    panelMax: 640,
    /** The player can explicitly expand a desktop panel up to this width. */
    panelWide: 960,
    /** The landscape-phone side panel. */
    panelLandscape: 340,
    detentPeek: 168,
    detentHalf: 334,
    /** The smallest target a finger can hit; every control meets it. */
    hitMin: 44,
    control: 44,
    controlCompact: 36,
    /** The longest comfortable line of reading text. */
    measure: 640,
};
