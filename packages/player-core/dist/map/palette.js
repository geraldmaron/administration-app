import { dark, divergingPalettes, mapBoard, mapPartyPalettes, sequential } from "@admin/design";
/** Orange, the family of the brown the severity bars draw "serious" in, and clear of the institutional gold the map keeps for a declaration. */
const SERIOUS_ORANGE = "#E8903A";
/**
 * Standing, slate where the public behind the President is thin and
 * presidential gold where it is broad. The design package states this ramp
 * only in tokens.css (`--map-standing-1..7`); these are the same values.
 */
const STANDING = ["#3B3F5C", "#4D4D66", "#6A5E68", "#8C7560", "#B28E4E", "#D6AA45", "#F2C84B"];
function basePalette(vision) {
    const div = divergingPalettes[vision];
    const party = mapPartyPalettes[vision];
    const at = (index) => div[index] ?? div[3];
    // Off the standard palette no lens leans on red against blue alone: the party pair moves onto the diverging ramp, so the two separate in lightness as well as hue.
    const standard = vision === "standard";
    return {
        ground: dark.ground.abyss,
        neutral: mapBoard.neutral,
        nodata: mapBoard.noData,
        land: mapBoard.land,
        border: mapBoard.border,
        line: mapBoard.line,
        seaGlow: mapBoard.seaGlow,
        coast: mapBoard.coast,
        graticule: mapBoard.graticule,
        seq: sequential,
        div,
        standing: STANDING,
        democrat: standard ? party.democrat : at(0),
        republican: standard ? party.republican : at(5),
        independent: party.independent,
        favorable: at(0),
        steady: at(3),
        caution: at(4),
        adverse: at(6),
        minor: dark.anchor.blue,
        // Protan and deutan already read the diverging ramp's warm end as orange, which severe takes, so serious steps down to its brown.
        serious: vision === "protan" || vision === "deutan" ? at(4) : SERIOUS_ORANGE,
        unread: dark.text.disabled,
        own: dark.anchor.gold,
        forStrong: at(0),
        forLean: at(2),
        againstLean: at(4),
        againstStrong: at(6),
        selection: dark.anchor.blue,
        shadow: dark.ground.abyss,
    };
}
/** High contrast: brighter neutral land, the ramps pushed toward their ends, and the focus color for selection. */
function contrasted(palette) {
    const div = palette.div;
    const seq = [palette.seq[1], palette.seq[2], ...palette.seq.slice(2)].filter((step) => step !== undefined);
    return {
        ...palette,
        neutral: dark.line.strong,
        border: dark.line.strong,
        line: dark.anchor.white,
        nodata: dark.text.disabled,
        seq,
        div: [div[0], div[1], div[1], div[3], div[5], div[5], div[6]].filter((step) => step !== undefined),
        democrat: div[0] ?? palette.democrat,
        republican: dark.anchor.red,
        forLean: div[1] ?? palette.forLean,
        againstLean: div[5] ?? palette.againstLean,
        selection: dark.line.focus,
    };
}
/** The palette a player's display settings resolve to. */
export function mapPalette(options = {}) {
    const base = basePalette(options.colorVision ?? "standard");
    return options.highContrast ? contrasted(base) : base;
}
/** A ramp step for a share in 0..1. */
export function rampStep(ramp, share) {
    const clamped = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
    const index = Math.min(ramp.length - 1, Math.floor(clamped * ramp.length));
    return ramp[index] ?? ramp[0] ?? "";
}
