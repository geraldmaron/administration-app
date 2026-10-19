export declare const chrome: {
    readonly accentRule: 3;
    /**
     * The tallest a room's masthead band may be, in px. The band is decoration
     * behind a heading; any taller and it starts pushing the Desk's waiting
     * decision below the fold of a 1280x800 window.
     */
    readonly mastheadBand: 120;
};
export type ChromeToken = typeof chrome;
