import { districtById, stateById, worldNations } from "@admin/world";
/** Every government, state and district the dataset lists, as the map's geometry names them. */
export const REGIONS = [
    ...worldNations.map((nation) => ({ layer: "world", id: nation.id })),
    ...[...stateById.keys()].map((id) => ({ layer: "states", id })),
    ...[...districtById.keys()].map((id) => ({ layer: "districts", id })),
];
export const region = (layer, id) => ({ layer, id });
/** A palette of plain names, so a test reads which slot a lens chose. */
export const NAMED_PALETTE = {
    ground: "ground",
    neutral: "neutral",
    nodata: "nodata",
    land: "land",
    border: "border",
    line: "line",
    seaGlow: "seaGlow",
    coast: "coast",
    graticule: "graticule",
    seq: ["seq1", "seq2", "seq3", "seq4", "seq5", "seq6", "seq7"],
    div: ["n3", "n2", "n1", "d0", "p1", "p2", "p3"],
    standing: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
    democrat: "democrat",
    republican: "republican",
    independent: "independent",
    favorable: "favorable",
    steady: "steady",
    caution: "caution",
    adverse: "adverse",
    minor: "minor",
    serious: "serious",
    unread: "unread",
    own: "own",
    forStrong: "forStrong",
    forLean: "forLean",
    againstLean: "againstLean",
    againstStrong: "againstStrong",
    selection: "selection",
    shadow: "shadow",
};
