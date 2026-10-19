export declare const space: {
    readonly "2xs": 2;
    readonly xs: 4;
    readonly sm: 8;
    readonly md: 12;
    readonly lg: 16;
    readonly xl: 24;
    readonly "2xl": 32;
    readonly "3xl": 48;
};
export declare const radius: {
    readonly chip: 8;
    readonly control: 8;
    readonly card: 12;
    readonly sheet: 16;
    readonly pill: 999;
};
export declare const layout: {
    /** The top bar on a phone; the desktop bar is taller to hold the date and Continue on one line. */
    readonly barPhone: 44;
    readonly barDesktop: 56;
    /** The phone tab bar above the bottom safe area. */
    readonly tabBar: 50;
    /** The labeled navigation from 1440px; below it the compact rail. */
    readonly nav: 224;
    readonly rail: 88;
    /** The inspector beside a map or a list. */
    readonly inspector: 344;
    readonly panelMin: 420;
    readonly panelMax: 640;
    /** The player can explicitly expand a desktop panel up to this width. */
    readonly panelWide: 960;
    /** The landscape-phone side panel. */
    readonly panelLandscape: 340;
    readonly detentPeek: 168;
    readonly detentHalf: 334;
    /** The smallest target a finger can hit; every control meets it. */
    readonly hitMin: 44;
    readonly control: 44;
    readonly controlCompact: 36;
    /** The longest comfortable line of reading text. */
    readonly measure: 640;
};
export type SpaceToken = typeof space;
export type RadiusToken = typeof radius;
export type LayoutToken = typeof layout;
