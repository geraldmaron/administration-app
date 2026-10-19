// Chrome spends the identity accent as a rule, not a 1px afterthought.
// Headers, docks, and identity rails share this width so a selected state
// and a page lead read as the same language.
export const chrome = {
    accentRule: 3,
    /**
     * The tallest a room's masthead band may be, in px. The band is decoration
     * behind a heading; any taller and it starts pushing the Desk's waiting
     * decision below the fold of a 1280x800 window.
     */
    mastheadBand: 120,
};
