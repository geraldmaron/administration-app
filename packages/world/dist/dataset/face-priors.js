const AFRICAN = new Set(["africa-west", "africa-east", "africa-southern", "africa-central"]);
export const isAfricanHeritage = (heritage) => AFRICAN.has(heritage);
/** Where the epicanthic fold and a low lid crease are common, the lid shapes lean that way. */
export const ASIAN_LID = new Set(["east-asia", "southeast-asia", "central-asia"]);
export const HAIR_TEXTURE_ODDS = {
    "africa-west": [["coily", 0.74], ["curly", 0.2], ["wavy", 0.06]],
    "africa-east": [["coily", 0.7], ["curly", 0.24], ["wavy", 0.06]],
    "africa-southern": [["coily", 0.76], ["curly", 0.18], ["wavy", 0.06]],
    "africa-central": [["coily", 0.76], ["curly", 0.18], ["wavy", 0.06]],
    mena: [["wavy", 0.45], ["curly", 0.3], ["straight", 0.25]],
    "europe-north": [["straight", 0.55], ["wavy", 0.38], ["curly", 0.07]],
    "europe-south": [["wavy", 0.5], ["straight", 0.3], ["curly", 0.2]],
    "europe-east": [["straight", 0.55], ["wavy", 0.4], ["curly", 0.05]],
    "central-asia": [["straight", 0.75], ["wavy", 0.25]],
    "south-asia": [["straight", 0.45], ["wavy", 0.45], ["curly", 0.1]],
    "east-asia": [["straight", 0.88], ["wavy", 0.12]],
    "southeast-asia": [["straight", 0.72], ["wavy", 0.22], ["curly", 0.06]],
    "latin-america": [["straight", 0.4], ["wavy", 0.4], ["curly", 0.2]],
    pacific: [["curly", 0.45], ["wavy", 0.35], ["coily", 0.2]],
    mixed: [["wavy", 0.35], ["curly", 0.35], ["coily", 0.15], ["straight", 0.15]],
};
export const EYE_SHAPE_ODDS = {
    "east-asia": [["mono", 0.45], ["hooded", 0.3], ["crease", 0.25]],
    "central-asia": [["mono", 0.3], ["hooded", 0.35], ["crease", 0.35]],
    "southeast-asia": [["mono", 0.2], ["hooded", 0.35], ["crease", 0.45]],
};
export const DEFAULT_EYE_SHAPE_ODDS = [["crease", 0.55], ["hooded", 0.28], ["round", 0.1], ["downturned", 0.07]];
export const EYE_COLOR_ODDS = {
    "europe-north": [["blue", 0.35], ["gray", 0.12], ["green", 0.12], ["hazel", 0.16], ["brown", 0.25]],
    "europe-east": [["blue", 0.25], ["gray", 0.15], ["green", 0.12], ["hazel", 0.18], ["brown", 0.3]],
    "europe-south": [["brown", 0.5], ["hazel", 0.25], ["green", 0.12], ["blue", 0.08], ["dark-brown", 0.05]],
    mena: [["dark-brown", 0.45], ["brown", 0.35], ["hazel", 0.15], ["green", 0.05]],
    "latin-america": [["dark-brown", 0.45], ["brown", 0.4], ["hazel", 0.12], ["green", 0.03]],
    "central-asia": [["brown", 0.45], ["dark-brown", 0.35], ["hazel", 0.15], ["green", 0.05]],
    mixed: [["brown", 0.4], ["dark-brown", 0.3], ["hazel", 0.2], ["green", 0.05], ["blue", 0.05]],
};
export const DEFAULT_EYE_COLOR_ODDS = [["dark-brown", 0.7], ["brown", 0.3]];
/**
 * The most a heritage moves a nose or lip gene's mean: a sixth of the range.
 * Enough that a cast reads as coming from somewhere, never enough to draw a type.
 */
export const HERITAGE_SHIFT_CAP = 1 / 6;
export const NATURAL_HAIR_ODDS = {
    black: [["black", 0.8], ["dark-brown", 0.2]],
    brown: [["dark-brown", 0.4], ["brown", 0.4], ["light-brown", 0.2]],
    fair: [["dark-blonde", 0.55], ["blonde", 0.45]],
    red: [["auburn", 0.55], ["copper", 0.45]],
};
/**
 * How much each trait the game shows moves the resting face. Corruption,
 * loyalty, ambition and integrity are absent on purpose: a portrait must not
 * tell the player what the game makes them earn.
 */
export const TRAIT_EXPRESSION = {
    charismatic: { mouth: 0.14, brow: 0.02 },
    dovish: { mouth: 0.05, brow: 0.06 },
    hawkish: { mouth: -0.1, brow: -0.12 },
    reclusive: { mouth: -0.05, brow: 0 },
    cautious: { mouth: -0.03, brow: 0.03 },
    principled: { mouth: -0.02, brow: -0.02 },
};
/** Seats whose holders sit for their portrait in a robe. */
export const JUDICIAL_ROLES = new Set(["role-chief-justice", "role-justice", "role-judge"]);
// Dress conventions of public life, layered on the attire facet. Each is a
// share of officeholders photographed that way, not a rule about the nation.
export const GULF_DRESS = new Set(["SAU", "ARE", "QAT", "KWT", "BHR", "OMN"]);
export const WEST_AFRICAN_DRESS = new Set(["NGA", "GHA", "SEN", "MLI", "NER", "CIV", "BFA", "GIN", "GMB", "SLE"]);
export const SOUTH_ASIAN_DRESS = new Set(["IND", "PAK", "BGD", "NPL", "LKA"]);
export const PECI_DRESS = new Set(["IDN", "MYS", "BRN"]);
export const SUIT_CLOTH = [["navy", 0.3], ["charcoal", 0.25], ["black", 0.1], ["slate", 0.12], ["midnight", 0.18], ["brown", 0.05]];
export const SHIRT_CLOTH = [["white", 0.62], ["light-blue", 0.3], ["blush", 0.04], ["ivory", 0.04]];
export const TIE_CLOTH = [["crimson", 0.2], ["navy", 0.14], ["blue", 0.16], ["burgundy", 0.14], ["gold", 0.08], ["green", 0.07], ["silver", 0.1], ["royal", 0.11]];
export const BLAZER_CLOTH = [
    ["navy", 0.18],
    ["black", 0.14],
    ["charcoal", 0.1],
    ["burgundy", 0.1],
    ["emerald", 0.07],
    ["royal", 0.1],
    ["cream", 0.07],
    ["red", 0.08],
    ["teal", 0.06],
    ["plum", 0.05],
    ["camel", 0.05],
];
export const BLOUSE_CLOTH = [["white", 0.3], ["ivory", 0.25], ["black", 0.15], ["blush", 0.1], ["light-blue", 0.1], ["silver", 0.1]];
export const SCARF_CLOTH = [
    ["black", 0.16],
    ["navy", 0.14],
    ["beige", 0.12],
    ["taupe", 0.1],
    ["maroon", 0.08],
    ["olive", 0.06],
    ["teal", 0.06],
    ["slate", 0.08],
    ["white", 0.06],
    ["dusty-rose", 0.07],
    ["emerald", 0.04],
    ["plum", 0.03],
];
export const DUPATTA_CLOTH = [["saffron", 0.18], ["crimson", 0.12], ["maroon", 0.14], ["emerald", 0.1], ["royal", 0.1], ["ivory", 0.14], ["dusty-rose", 0.12], ["gold", 0.1]];
export const GELE_CLOTH = [["gold", 0.3], ["royal", 0.2], ["emerald", 0.15], ["plum", 0.15], ["saffron", 0.1], ["crimson", 0.1]];
export const DASTAR_CLOTH = [["navy", 0.3], ["black", 0.2], ["white", 0.15], ["saffron", 0.15], ["maroon", 0.1], ["royal", 0.1]];
export const CAP_CLOTH = [["white", 0.25], ["cream", 0.2], ["navy", 0.15], ["gold", 0.15], ["maroon", 0.15], ["green", 0.1]];
export const UNIFORM_CLOTH = [["olive", 0.3], ["forest", 0.2], ["navy", 0.2], ["air-blue", 0.15], ["khaki", 0.1], ["black", 0.05]];
