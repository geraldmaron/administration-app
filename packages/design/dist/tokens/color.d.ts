/** Light grounds, the canvas behind everything first. A work area is `base`; a row or card inside it is `raised`. */
export declare const ground: {
    readonly abyss: "#E8EDF5";
    readonly sunken: "#F1F5FB";
    readonly base: "#FFFFFF";
    readonly raised: "#F5F8FD";
    readonly raisedHover: "#EAF0FA";
    readonly overlay: "#FFFFFF";
    readonly overlayHover: "#EDF2FC";
};
export declare const text: {
    readonly primary: "#14223B";
    readonly secondary: "#485971";
    readonly tertiary: "#52627A";
    /** A disabled control's label; its explanation is set in `secondary`, never in this. */
    readonly disabled: "#8A9099";
    /** Ink on a light fill wherever the surrounding surface is dark: a gold chip in the masthead. */
    readonly onLight: "#14223B";
};
/** The anchors on light surfaces. A `fill` carries white text at AA; the plain value is a mark or text. */
export declare const anchor: {
    readonly blue: "#2457D6";
    readonly blueFill: "#2457D6";
    readonly blueFillHover: "#1944B0";
    /** Gold as ink: an institutional label on a light surface. */
    readonly gold: "#76571E";
    /** Gold as a rule or insignia, never text and never a warning. */
    readonly goldDeep: "#C6AA72";
    readonly red: "#B42346";
    readonly redFill: "#B42346";
    readonly redFillHover: "#941C39";
    readonly white: "#FFFFFF";
};
export declare const line: {
    /** Decoration only: a divider whose loss loses nothing. */
    readonly subtle: "#D9E2F0";
    /** A boundary that must stay visible: a field, a control, a table frame. */
    readonly strong: "#718097";
    readonly focus: "#2457D6";
};
/** Issued documents. */
export declare const paper: {
    readonly surface: "#F8F6EF";
    readonly ink: "#1B1B1B";
    readonly rule: "#C9C0A8";
};
/** The navy masthead and navigation. */
export declare const chrome: {
    readonly navy: "#0B1424";
    readonly navyHover: "#172D4F";
    readonly text: "#FFFFFF";
    readonly secondary: "#C4CFDA";
    readonly border: "#6B839C";
    readonly focus: "#9CC4FF";
};
/** Map overlays and the map's own controls. */
export declare const theater: {
    readonly surface: "#14273E";
    readonly text: "#F2F5F7";
    readonly secondary: "#C4CFDA";
    readonly interactive: "#73B3F4";
    readonly border: "#6B839C";
};
export type StatusPair = {
    readonly ink: string;
    readonly fill: string;
};
/** State, never severity of a category: pending and unknown share a neutral pair and differ by label and icon. */
export declare const status: {
    readonly info: {
        readonly ink: "#2457D6";
        readonly fill: "#EAF0FF";
    };
    readonly pending: {
        readonly ink: "#485971";
        readonly fill: "#EDF1F7";
    };
    readonly success: {
        readonly ink: "#176544";
        readonly fill: "#E9F5EE";
    };
    readonly warning: {
        readonly ink: "#795016";
        readonly fill: "#FFF4DD";
    };
    readonly danger: {
        readonly ink: "#B42346";
        readonly fill: "#FCEAF0";
    };
    readonly unknown: {
        readonly ink: "#485971";
        readonly fill: "#EDF1F7";
    };
};
/**
 * The dark set, applied under `data-surface="dark"`: the map theater, the
 * title screen and anything laid over the map. These are the values the
 * player was first built on, kept so the map's overlays keep their contrast.
 */
export declare const dark: {
    readonly ground: {
        readonly abyss: "#040811";
        readonly sunken: "#080E18";
        readonly base: "#101B2B";
        readonly raised: "#19283E";
        readonly raisedHover: "#223651";
        readonly overlay: "#1D2E46";
        readonly overlayHover: "#283E5B";
    };
    readonly text: {
        readonly primary: "#F3F6FC";
        readonly secondary: "#C3CDE4";
        readonly tertiary: "#98A8CC";
        readonly disabled: "#5F6C8C";
        readonly onLight: "#101B2B";
    };
    readonly anchor: {
        readonly blue: "#94B8FF";
        readonly blueFill: "#315FD5";
        readonly blueFillHover: "#284FBB";
        readonly gold: "#E4C58A";
        readonly goldDeep: "#A9843A";
        readonly red: "#FF9AB1";
        readonly redFill: "#C42F3C";
        readonly redFillHover: "#AE2734";
        readonly white: "#FFFFFF";
    };
    readonly line: {
        readonly subtle: "#30435E";
        readonly strong: "#6B80B6";
        readonly focus: "#9CC4FF";
    };
    /**
     * The light set's status inks are dark on pale fills; on navy they fall
     * under 3:1, and every good-or-bad cue on a dark card went unreadable. These
     * keep the same hues, lightened, on fills dark enough to sit on a card.
     */
    readonly status: {
        readonly info: {
            readonly ink: "#94B8FF";
            readonly fill: "#16305E";
        };
        readonly pending: {
            readonly ink: "#B5C0D8";
            readonly fill: "#1A2747";
        };
        readonly success: {
            readonly ink: "#6FD69B";
            readonly fill: "#123A2C";
        };
        readonly warning: {
            readonly ink: "#F2C66D";
            readonly fill: "#3A2E12";
        };
        readonly danger: {
            readonly ink: "#FF9AB1";
            readonly fill: "#3D1A2A";
        };
        readonly unknown: {
            readonly ink: "#B5C0D8";
            readonly fill: "#1A2747";
        };
    };
};
export type PartyPalette = {
    readonly democrat: string;
    readonly republican: string;
    readonly independent: string;
};
/**
 * Party color on light surfaces, per color-vision setting. Deep enough to
 * hold 4.5:1 on white so a seat graphic and its label agree; under protan and
 * deutan the Republican hue turns toward orange, under tritan the Democratic
 * hue toward teal.
 */
export declare const partyPalettes: {
    readonly standard: {
        readonly democrat: "#1F6FB5";
        readonly republican: "#C0352B";
        readonly independent: "#6F6A5E";
    };
    readonly protan: {
        readonly democrat: "#1F6FB5";
        readonly republican: "#A35200";
        readonly independent: "#6F6A5E";
    };
    readonly deutan: {
        readonly democrat: "#1F6FB5";
        readonly republican: "#A35200";
        readonly independent: "#6F6A5E";
    };
    readonly tritan: {
        readonly democrat: "#00737F";
        readonly republican: "#C0352B";
        readonly independent: "#6F6A5E";
    };
};
/** Party color on the dark map, per color-vision setting: lighter, so a seat never sinks into the navy. */
export declare const mapPartyPalettes: {
    readonly standard: {
        readonly democrat: "#55B4F2";
        readonly republican: "#F0625C";
        readonly independent: "#B9B2A3";
    };
    readonly protan: {
        readonly democrat: "#5AA9F5";
        readonly republican: "#F0943C";
        readonly independent: "#C9C3B6";
    };
    readonly deutan: {
        readonly democrat: "#5AA9F5";
        readonly republican: "#F0943C";
        readonly independent: "#C9C3B6";
    };
    readonly tritan: {
        readonly democrat: "#3FC6D6";
        readonly republican: "#F0625C";
        readonly independent: "#C9C3B6";
    };
};
export type ColorVision = keyof typeof partyPalettes;
export declare const COLOR_VISIONS: readonly ColorVision[];
/** Seven steps, lightness first, from a deep federal blue through teal to gold: a value reads from dark to light on any color vision, and every step is deep and saturated, so a filled region reads as rich rather than washed. The low end stays clear of the land, so a small value never reads as no reading. */
export declare const sequential: readonly ["#3A58CC", "#3268DA", "#2A82E0", "#1AA3C4", "#2DB889", "#C9AE22", "#F0C02A"];
/**
 * Diverging around a neutral middle, per color vision. Negative is the Democratic side by convention.
 * Each pair of steps shares one perceptual lightness, so neither end of a scale reads dimmer
 * than the other, and lightness climbs from the middle out. Every step is deep and saturated:
 * the strongest reading is the most vivid one, and none reaches the pale end, because a whole
 * state filled in a pale step reads as washed out. The middle is a muted violet that recedes,
 * lighter than the land so an even state still reads as lit.
 */
export declare const divergingPalettes: {
    readonly standard: readonly ["#5294F8", "#3A76EA", "#3360D4", "#665B93", "#C2392E", "#E04B37", "#F0644A"];
    readonly protan: readonly ["#5294F8", "#3A76EA", "#3360D4", "#665B93", "#98591A", "#B06E1C", "#CC8626"];
    readonly deutan: readonly ["#5294F8", "#3A76EA", "#3360D4", "#665B93", "#98591A", "#B06E1C", "#CC8626"];
    readonly tritan: readonly ["#20A0BC", "#1A8CA8", "#167A94", "#665B93", "#C2392E", "#E04B37", "#F0644A"];
};
/** Categories with no order: blocs, sides, series. Distinct by hue and lightness together. */
export declare const categorical: readonly ["#55B4F2", "#E5BC62", "#F0625C", "#7CD6A8", "#B79CF0", "#F09BC8", "#9AD0E0", "#D9A27A"];
/**
 * The map table: neutral land, no-data dots, the seam between regions, the
 * light pooled in the middle of the sea, the glow along every coast and the
 * graticule scored into the water.
 */
export declare const mapBoard: {
    readonly land: "#16244E";
    readonly neutral: "#3B4E7E";
    readonly noData: "#2A3760";
    readonly border: "#050C1E";
    /** The light line a border draws over the seam, so a state, a district or a country edge reads on any fill. */
    readonly line: "#8FA3D1";
    readonly seaGlow: "#0D2456";
    readonly coast: "#3F8CFF";
    readonly graticule: "#1A3470";
};
/** What the high-contrast setting (and `prefers-contrast: more`) swaps in on light surfaces: quiet inks and hairlines get louder. */
export declare const highContrast: {
    readonly textSecondary: "#14223B";
    readonly textTertiary: "#3D4249";
    readonly lineSubtle: "#718097";
    readonly lineStrong: "#14223B";
};
/**
 * The same swap for the dark set. The light swap darkens inks, which on navy
 * would sink them, so dark high contrast lightens quiet inks toward primary
 * and brightens the hairlines instead.
 */
export declare const darkHighContrast: {
    readonly textSecondary: "#F3F6FC";
    readonly textTertiary: "#C3CDE4";
    readonly lineSubtle: "#6B80B6";
    readonly lineStrong: "#B5C3E6";
};
export declare const color: {
    readonly ground: {
        readonly abyss: "#E8EDF5";
        readonly sunken: "#F1F5FB";
        readonly base: "#FFFFFF";
        readonly raised: "#F5F8FD";
        readonly raisedHover: "#EAF0FA";
        readonly overlay: "#FFFFFF";
        readonly overlayHover: "#EDF2FC";
    };
    readonly text: {
        readonly primary: "#14223B";
        readonly secondary: "#485971";
        readonly tertiary: "#52627A";
        /** A disabled control's label; its explanation is set in `secondary`, never in this. */
        readonly disabled: "#8A9099";
        /** Ink on a light fill wherever the surrounding surface is dark: a gold chip in the masthead. */
        readonly onLight: "#14223B";
    };
    readonly anchor: {
        readonly blue: "#2457D6";
        readonly blueFill: "#2457D6";
        readonly blueFillHover: "#1944B0";
        /** Gold as ink: an institutional label on a light surface. */
        readonly gold: "#76571E";
        /** Gold as a rule or insignia, never text and never a warning. */
        readonly goldDeep: "#C6AA72";
        readonly red: "#B42346";
        readonly redFill: "#B42346";
        readonly redFillHover: "#941C39";
        readonly white: "#FFFFFF";
    };
    readonly line: {
        /** Decoration only: a divider whose loss loses nothing. */
        readonly subtle: "#D9E2F0";
        /** A boundary that must stay visible: a field, a control, a table frame. */
        readonly strong: "#718097";
        readonly focus: "#2457D6";
    };
    readonly paper: {
        readonly surface: "#F8F6EF";
        readonly ink: "#1B1B1B";
        readonly rule: "#C9C0A8";
    };
    readonly chrome: {
        readonly navy: "#0B1424";
        readonly navyHover: "#172D4F";
        readonly text: "#FFFFFF";
        readonly secondary: "#C4CFDA";
        readonly border: "#6B839C";
        readonly focus: "#9CC4FF";
    };
    readonly theater: {
        readonly surface: "#14273E";
        readonly text: "#F2F5F7";
        readonly secondary: "#C4CFDA";
        readonly interactive: "#73B3F4";
        readonly border: "#6B839C";
    };
    readonly status: {
        readonly info: {
            readonly ink: "#2457D6";
            readonly fill: "#EAF0FF";
        };
        readonly pending: {
            readonly ink: "#485971";
            readonly fill: "#EDF1F7";
        };
        readonly success: {
            readonly ink: "#176544";
            readonly fill: "#E9F5EE";
        };
        readonly warning: {
            readonly ink: "#795016";
            readonly fill: "#FFF4DD";
        };
        readonly danger: {
            readonly ink: "#B42346";
            readonly fill: "#FCEAF0";
        };
        readonly unknown: {
            readonly ink: "#485971";
            readonly fill: "#EDF1F7";
        };
    };
    /** Party chroma as a fact about a seat, on a light surface; the standard palette. */
    readonly party: {
        readonly democrat: "#1F6FB5";
        readonly republican: "#C0352B";
        readonly independent: "#6F6A5E";
    };
    /** The gold of the seal, for the portrait's metal. */
    readonly mark: {
        readonly gold: "#E4C58A";
    };
};
export type ColorToken = typeof color;
