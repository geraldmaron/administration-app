import { seal } from "./build.js";
/*
 * Alliances, blocs and treaties, in the colors the world knows them by and
 * never in their official artwork: each is a monogram and a device of what
 * the body is for. Alliances take the shield, economic blocs the rosette.
 */
export const ORGANIZATIONS = [
    seal("ORG-NATO", "roundel", ["navy", "white", "white"], "compass-rose", `NORTH ATLANTIC TREATY ORGANIZATION · NATO`, { monogram: "NATO" }),
    seal("ORG-EU", "roundel", ["federalBlue", "gold", "gold"], "monogram", undefined, { monogram: "EU", accents: { stars: 12 } }),
    seal("ORG-CSTO", "shield", ["sky", "gold", "gold"], "battlement", `CSTO`, { monogram: "CSTO" }),
    seal("ORG-BRICS", "rosette", ["cream", "navy", "navy"], "monogram", `BRICS · EMERGING ECONOMIES`, { monogram: "BRICS", accents: { stars: 5 } }),
    seal("ORG-GCC", "octagon", ["forest", "gold", "gold"], "monogram", `GULF COOPERATION COUNCIL · GCC`, { monogram: "GCC", accents: { stars: 6 } }),
    seal("ORG-AU", "roundel", ["green", "gold", "gold"], "globe", `AFRICAN UNION · AU`, { monogram: "AU", accents: { stars: 1 } }),
    seal("ORG-CPTPP", "rosette", ["teal", "white", "white"], "ship", `TRANS-PACIFIC PARTNERSHIP · CPTPP`, { monogram: "CPTPP" }),
    seal("ORG-ASEAN", "roundel", ["scarlet", "white", "gold"], "wheat", `ASEAN · ONE VISION · ONE COMMUNITY`, { monogram: "ASEAN" }),
    seal("ORG-MERCOSUR", "rosette", ["white", "green", "federalBlue"], "southern-cross", `MERCOSUR · SOUTHERN COMMON MARKET`, { monogram: "MSUR" }),
    seal("ORG-OPEC-PLUS", "roundel", ["navy", "silver", "silver"], "drop", `OPEC+ · PRODUCERS' AGREEMENT`, { monogram: "OPEC" }),
    seal("ORG-G7", "rosette", ["navy", "silver", "white"], "monogram", `GROUP OF SEVEN`, { monogram: "G7", accents: { stars: 7 } }),
    seal("ORG-US-JAPAN", "shield", ["white", "navy", "scarlet"], "chain-links", `U.S.-JAPAN`, { monogram: "US-JP" }),
    seal("ORG-US-KOREA", "shield", ["white", "scarlet", "navy"], "chain-links", `U.S.-KOREA`, { monogram: "US-KR" }),
    seal("ORG-US-PHILIPPINES", "shield", ["navy", "scarlet", "gold"], "chain-links", `U.S.-PHILIPPINES`, { monogram: "US-PH" }),
    seal("ORG-ANZUS", "shield", ["navy", "gold", "white"], "southern-cross", `ANZUS`, { monogram: "ANZUS" }),
    seal("CRADLE-POTOMAC", "roundel", ["cream", "navy", "navy"], "shield-stars-stripes", `THE UNION · E PLURIBUS UNUM`, { accents: { stars: 13 } }),
];
