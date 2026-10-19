import { US_ID, worldNations } from "./nations.js";
import { COUNTRY_HERITAGE_MIX, REGION_HERITAGE_MIX } from "./portrait-heritage.js";
import { nationGenderPriorFor } from "./portrait-priors.js";
import { usBenchGenderWeights, usBenchHeritageMix, usBenchRow } from "./women-in-cabinet.js";
import { VACANCY_BENCH_ATTIRE } from "./vacancy-bench-roles.js";
// What each nation's cast should plausibly look like, and what the generation
// harness has to produce to cover it.
// Nations map to one or more heritages, weighted. Multi-entry nations are the
// point rather than an edge case: a cast drawn from a single heritage would be
// wrong for most countries on this list and insulting for several of them.
export const NATION_HERITAGE_MIX = {
    USA: [
        { heritage: "europe-north", weight: 0.5 },
        { heritage: "africa-west", weight: 0.15 },
        { heritage: "latin-america", weight: 0.18 },
        { heritage: "east-asia", weight: 0.07 },
        { heritage: "south-asia", weight: 0.05 },
        { heritage: "mixed", weight: 0.05 },
    ],
    CAN: [
        { heritage: "europe-north", weight: 0.6 },
        { heritage: "south-asia", weight: 0.15 },
        { heritage: "east-asia", weight: 0.12 },
        { heritage: "mixed", weight: 0.13 },
    ],
    AUS: [
        { heritage: "europe-north", weight: 0.62 },
        { heritage: "east-asia", weight: 0.15 },
        { heritage: "south-asia", weight: 0.1 },
        { heritage: "pacific", weight: 0.08 },
        { heritage: "mixed", weight: 0.05 },
    ],
    GBR: [
        { heritage: "europe-north", weight: 0.72 },
        { heritage: "south-asia", weight: 0.12 },
        { heritage: "africa-west", weight: 0.08 },
        { heritage: "mixed", weight: 0.08 },
    ],
    FRA: [
        { heritage: "europe-south", weight: 0.6 },
        { heritage: "europe-north", weight: 0.15 },
        { heritage: "mena", weight: 0.15 },
        { heritage: "africa-west", weight: 0.1 },
    ],
    DEU: [
        { heritage: "europe-north", weight: 0.78 },
        { heritage: "mena", weight: 0.12 },
        { heritage: "mixed", weight: 0.1 },
    ],
    CHE: [
        { heritage: "europe-north", weight: 0.62 },
        { heritage: "europe-south", weight: 0.28 },
        { heritage: "mixed", weight: 0.1 },
    ],
    ITA: [{ heritage: "europe-south", weight: 1 }],
    ESP: [
        { heritage: "europe-south", weight: 0.88 },
        { heritage: "latin-america", weight: 0.12 },
    ],
    SWE: [
        { heritage: "europe-north", weight: 0.82 },
        { heritage: "mena", weight: 0.1 },
        { heritage: "mixed", weight: 0.08 },
    ],
    ISL: [{ heritage: "europe-north", weight: 1 }],
    POL: [{ heritage: "europe-east", weight: 1 }],
    HUN: [{ heritage: "europe-east", weight: 1 }],
    RUS: [
        { heritage: "europe-east", weight: 0.82 },
        { heritage: "central-asia", weight: 0.18 },
    ],
    UKR: [{ heritage: "europe-east", weight: 1 }],
    BLR: [{ heritage: "europe-east", weight: 1 }],
    TUR: [
        { heritage: "mena", weight: 0.75 },
        { heritage: "europe-east", weight: 0.25 },
    ],
    SAU: [{ heritage: "mena", weight: 1 }],
    ARE: [
        { heritage: "mena", weight: 0.7 },
        { heritage: "south-asia", weight: 0.3 },
    ],
    EGY: [{ heritage: "mena", weight: 1 }],
    IRQ: [{ heritage: "mena", weight: 1 }],
    SYR: [{ heritage: "mena", weight: 1 }],
    YEM: [{ heritage: "mena", weight: 1 }],
    MAR: [{ heritage: "mena", weight: 1 }],
    DZA: [{ heritage: "mena", weight: 1 }],
    IRN: [
        { heritage: "mena", weight: 0.75 },
        { heritage: "central-asia", weight: 0.25 },
    ],
    ISR: [
        { heritage: "mena", weight: 0.55 },
        { heritage: "europe-east", weight: 0.3 },
        { heritage: "africa-east", weight: 0.08 },
        { heritage: "mixed", weight: 0.07 },
    ],
    IND: [{ heritage: "south-asia", weight: 1 }],
    PAK: [{ heritage: "south-asia", weight: 1 }],
    BGD: [{ heritage: "south-asia", weight: 1 }],
    AFG: [
        { heritage: "south-asia", weight: 0.55 },
        { heritage: "central-asia", weight: 0.45 },
    ],
    KAZ: [
        { heritage: "central-asia", weight: 0.75 },
        { heritage: "europe-east", weight: 0.25 },
    ],
    CHN: [{ heritage: "east-asia", weight: 1 }],
    TWN: [{ heritage: "east-asia", weight: 1 }],
    JPN: [{ heritage: "east-asia", weight: 1 }],
    KOR: [{ heritage: "east-asia", weight: 1 }],
    PRK: [{ heritage: "east-asia", weight: 1 }],
    SGP: [
        { heritage: "east-asia", weight: 0.72 },
        { heritage: "southeast-asia", weight: 0.15 },
        { heritage: "south-asia", weight: 0.13 },
    ],
    VNM: [{ heritage: "southeast-asia", weight: 1 }],
    NGA: [{ heritage: "africa-west", weight: 1 }],
    ETH: [{ heritage: "africa-east", weight: 1 }],
    RWA: [{ heritage: "africa-east", weight: 1 }],
    COD: [{ heritage: "africa-central", weight: 1 }],
    ZAF: [
        { heritage: "africa-southern", weight: 0.72 },
        { heritage: "europe-north", weight: 0.12 },
        { heritage: "south-asia", weight: 0.08 },
        { heritage: "mixed", weight: 0.08 },
    ],
    BRA: [
        { heritage: "latin-america", weight: 0.5 },
        { heritage: "europe-south", weight: 0.22 },
        { heritage: "africa-west", weight: 0.2 },
        { heritage: "mixed", weight: 0.08 },
    ],
    MEX: [{ heritage: "latin-america", weight: 1 }],
    COL: [
        { heritage: "latin-america", weight: 0.85 },
        { heritage: "africa-west", weight: 0.15 },
    ],
    VEN: [
        { heritage: "latin-america", weight: 0.85 },
        { heritage: "africa-west", weight: 0.15 },
    ],
    CUB: [
        { heritage: "latin-america", weight: 0.6 },
        { heritage: "africa-west", weight: 0.3 },
        { heritage: "mixed", weight: 0.1 },
    ],
    IDN: [
        { heritage: "southeast-asia", weight: 0.92 },
        { heritage: "east-asia", weight: 0.08 },
    ],
    NLD: [
        { heritage: "europe-north", weight: 0.82 },
        { heritage: "mena", weight: 0.09 },
        { heritage: "southeast-asia", weight: 0.05 },
        { heritage: "africa-west", weight: 0.04 },
    ],
    BEL: [
        { heritage: "europe-north", weight: 0.82 },
        { heritage: "mena", weight: 0.12 },
        { heritage: "africa-central", weight: 0.06 },
    ],
    IRL: [{ heritage: "europe-north", weight: 1 }],
    NOR: [
        { heritage: "europe-north", weight: 0.9 },
        { heritage: "mena", weight: 0.06 },
        { heritage: "south-asia", weight: 0.04 },
    ],
    DNK: [
        { heritage: "europe-north", weight: 0.9 },
        { heritage: "mena", weight: 0.07 },
        { heritage: "europe-east", weight: 0.03 },
    ],
    THA: [{ heritage: "southeast-asia", weight: 1 }],
    MYS: [
        { heritage: "southeast-asia", weight: 0.72 },
        { heritage: "east-asia", weight: 0.2 },
        { heritage: "south-asia", weight: 0.08 },
    ],
    PHL: [
        { heritage: "southeast-asia", weight: 0.9 },
        { heritage: "east-asia", weight: 0.06 },
        { heritage: "mixed", weight: 0.04 },
    ],
    QAT: [{ heritage: "mena", weight: 1 }],
    ARG: [
        { heritage: "latin-america", weight: 0.6 },
        { heritage: "europe-south", weight: 0.35 },
        { heritage: "mixed", weight: 0.05 },
    ],
    CHL: [
        { heritage: "latin-america", weight: 0.8 },
        { heritage: "europe-south", weight: 0.2 },
    ],
};
// Skin tone is drawn from a plausible sub-range per heritage rather than from
// the whole scale. The ranges overlap heavily and every one of them spans at
// least three tones — no heritage maps to a single tone, because none of them
// does in life either.
export const HERITAGE_SKIN_TONES = {
    "africa-west": ["tone-4", "tone-5", "tone-6"],
    "africa-east": ["tone-3", "tone-4", "tone-5", "tone-6"],
    "africa-southern": ["tone-3", "tone-4", "tone-5", "tone-6"],
    "africa-central": ["tone-4", "tone-5", "tone-6"],
    mena: ["tone-2", "tone-3", "tone-4", "tone-5"],
    "europe-north": ["tone-1", "tone-2", "tone-3"],
    "europe-south": ["tone-1", "tone-2", "tone-3", "tone-4"],
    "europe-east": ["tone-1", "tone-2", "tone-3"],
    "central-asia": ["tone-2", "tone-3", "tone-4"],
    "south-asia": ["tone-2", "tone-3", "tone-4", "tone-5"],
    "east-asia": ["tone-1", "tone-2", "tone-3", "tone-4"],
    "southeast-asia": ["tone-2", "tone-3", "tone-4", "tone-5"],
    "latin-america": ["tone-2", "tone-3", "tone-4", "tone-5"],
    pacific: ["tone-3", "tone-4", "tone-5", "tone-6"],
    mixed: ["tone-1", "tone-2", "tone-3", "tone-4", "tone-5", "tone-6"],
};
// What a seat wears. A defense minister in a business suit and one in uniform
// are different claims about a government, so attire is picked from the role
// rather than at random — and weighted, because these are not equally likely.
// An official portrait is a working photograph: business dress dominates
// almost everywhere, and ceremonial dress is what a head of government wears
// on the few days a year that call for it, not what they wear to be
// photographed. Drawing these uniformly put half of every nation's prime
// ministers in ceremonial dress.
export const ROLE_ATTIRE = {
    "role-prime-minister": [
        { value: "business", weight: 0.9 },
        { value: "ceremonial", weight: 0.1 },
    ],
    "role-president": [
        { value: "business", weight: 0.88 },
        { value: "ceremonial", weight: 0.12 },
    ],
    // The exception that proves the rule: a crown's working dress *is*
    // ceremonial, and a monarch photographed in a business suit is the
    // unusual one.
    "role-monarch": [
        { value: "ceremonial", weight: 0.75 },
        { value: "business", weight: 0.25 },
    ],
    // A junta chairman in uniform is the whole point of a junta chairman.
    "role-junta-chairman": [
        { value: "military", weight: 0.85 },
        { value: "ceremonial", weight: 0.15 },
    ],
    "role-first-councillor": [
        { value: "religious", weight: 0.8 },
        { value: "ceremonial", weight: 0.2 },
    ],
    "role-council-chair": [
        { value: "business", weight: 0.88 },
        { value: "academic", weight: 0.12 },
    ],
    "role-court-chancellor": [
        { value: "ceremonial", weight: 0.6 },
        { value: "business", weight: 0.4 },
    ],
    "role-foreign-minister": [
        { value: "business", weight: 0.93 },
        { value: "ceremonial", weight: 0.07 },
    ],
    "role-treasury-minister": [
        { value: "business", weight: 0.92 },
        { value: "academic", weight: 0.08 },
    ],
    // Split rather than lopsided: whether the defense portfolio is held by a
    // serving officer or a civilian is a real difference between governments,
    // and both are common enough to meet in one playthrough.
    "role-defense-minister": [
        { value: "business", weight: 0.6 },
        { value: "military", weight: 0.4 },
    ],
    "role-interior-minister": [
        { value: "business", weight: 0.85 },
        { value: "military", weight: 0.15 },
    ],
    "role-intelligence-director": [
        { value: "business", weight: 0.85 },
        { value: "field", weight: 0.15 },
    ],
    "role-electoral-affairs-minister": [
        { value: "business", weight: 0.85 },
        { value: "academic", weight: 0.15 },
    ],
    "role-attorney-general": [
        { value: "business", weight: 0.85 },
        { value: "academic", weight: 0.15 },
    ],
    "role-governor": [
        { value: "business", weight: 0.88 },
        { value: "ceremonial", weight: 0.12 },
    ],
    "role-opposition-leader": [
        { value: "business", weight: 0.75 },
        { value: "field", weight: 0.15 },
        { value: "academic", weight: 0.1 },
    ],
    // The one seat that is not photographed in a government building, and the
    // only one where field dress is the norm rather than the exception.
    "role-journalist": [
        { value: "field", weight: 0.5 },
        { value: "business", weight: 0.4 },
        { value: "academic", weight: 0.1 },
    ],
    "role-congressional-leader": [
        { value: "business", weight: 0.94 },
        { value: "ceremonial", weight: 0.06 },
    ],
    // Chairs come out of the professions and the services more often than the
    // leadership does, and the committee photograph shows it.
    "role-committee-chair": [
        { value: "business", weight: 0.78 },
        { value: "academic", weight: 0.14 },
        { value: "military", weight: 0.08 },
    ],
    // The ten department secretaries. Business dress with a small ceremonial
    // tail, like every other civilian minister — except Veterans Affairs, whose
    // secretaries are usually retired officers and are photographed as often in
    // uniform as out of it, and Homeland Security, which is a field department
    // and dresses like one when it is being photographed at a border or a
    // disaster rather than behind a desk.
    "role-agriculture-secretary": [
        { value: "business", weight: 0.82 },
        { value: "field", weight: 0.18 },
    ],
    "role-commerce-secretary": [
        { value: "business", weight: 0.92 },
        { value: "ceremonial", weight: 0.08 },
    ],
    "role-labor-secretary": [
        { value: "business", weight: 0.85 },
        { value: "field", weight: 0.15 },
    ],
    "role-health-secretary": [
        { value: "business", weight: 0.88 },
        { value: "field", weight: 0.12 },
    ],
    "role-housing-secretary": [
        { value: "business", weight: 0.86 },
        { value: "field", weight: 0.14 },
    ],
    "role-transportation-secretary": [
        { value: "business", weight: 0.84 },
        { value: "field", weight: 0.16 },
    ],
    "role-energy-secretary": [
        { value: "business", weight: 0.88 },
        { value: "field", weight: 0.12 },
    ],
    "role-education-secretary": [
        { value: "business", weight: 0.9 },
        { value: "ceremonial", weight: 0.1 },
    ],
    "role-veterans-secretary": [
        { value: "business", weight: 0.6 },
        { value: "military", weight: 0.4 },
    ],
    "role-homeland-secretary": [
        { value: "business", weight: 0.7 },
        { value: "field", weight: 0.3 },
    ],
    // The branch below the cabinet. One window for forty-odd buildings, and the
    // mix is the honest average of them: an agency head's official photograph is
    // a suit against a flag, with a real tail of the ones whose agencies work
    // outdoors or in a lab and are photographed doing it.
    "role-agency-head": [
        { value: "business", weight: 0.8 },
        { value: "field", weight: 0.14 },
        { value: "academic", weight: 0.06 },
    ],
};
export const GENDER_PRESENTATIONS = ["masculine", "feminine", "androgynous"];
// The fallback for a nation the leader table has no row for: close to
// balanced between the two common presentations. The United States reads its
// own bench and every other government its table row (`genderWeightsFor`).
export const GENDER_WEIGHTS = {
    masculine: 0.47,
    feminine: 0.47,
    androgynous: 0.06,
};
// Hair style is weighted on both age and presentation rather than drawn flat
// from one list: pattern hair loss is overwhelmingly a masculine trait and it
// advances with age, so a single table would put the same share of
// feminine-presenting officials in a bald head as masculine ones.
export const HAIR_STYLE_WEIGHTS = {
    masculine: {
        early: [
            { value: "short", weight: 0.55 },
            { value: "cropped", weight: 0.35 },
            { value: "long", weight: 0.06 },
            { value: "bald", weight: 0.04 },
        ],
        emerging: [
            { value: "short", weight: 0.55 },
            { value: "cropped", weight: 0.3 },
            { value: "bald", weight: 0.12 },
            { value: "long", weight: 0.03 },
        ],
        established: [
            { value: "short", weight: 0.5 },
            { value: "cropped", weight: 0.25 },
            { value: "bald", weight: 0.24 },
            { value: "long", weight: 0.01 },
        ],
        senior: [
            { value: "short", weight: 0.47 },
            { value: "bald", weight: 0.35 },
            { value: "cropped", weight: 0.18 },
        ],
        elder: [
            { value: "short", weight: 0.45 },
            { value: "bald", weight: 0.42 },
            { value: "cropped", weight: 0.13 },
        ],
    },
    feminine: {
        early: [
            { value: "long", weight: 0.42 },
            { value: "short", weight: 0.26 },
            { value: "tied-back", weight: 0.26 },
            { value: "cropped", weight: 0.06 },
        ],
        emerging: [
            { value: "long", weight: 0.36 },
            { value: "tied-back", weight: 0.3 },
            { value: "short", weight: 0.28 },
            { value: "cropped", weight: 0.06 },
        ],
        established: [
            { value: "short", weight: 0.38 },
            { value: "tied-back", weight: 0.3 },
            { value: "long", weight: 0.25 },
            { value: "cropped", weight: 0.07 },
        ],
        senior: [
            { value: "short", weight: 0.52 },
            { value: "tied-back", weight: 0.26 },
            { value: "long", weight: 0.14 },
            { value: "cropped", weight: 0.08 },
        ],
        elder: [
            { value: "short", weight: 0.62 },
            { value: "tied-back", weight: 0.2 },
            { value: "cropped", weight: 0.1 },
            { value: "long", weight: 0.08 },
        ],
    },
    androgynous: {
        early: [
            { value: "cropped", weight: 0.4 },
            { value: "short", weight: 0.35 },
            { value: "tied-back", weight: 0.15 },
            { value: "long", weight: 0.1 },
        ],
        emerging: [
            { value: "cropped", weight: 0.38 },
            { value: "short", weight: 0.38 },
            { value: "tied-back", weight: 0.14 },
            { value: "long", weight: 0.1 },
        ],
        established: [
            { value: "short", weight: 0.44 },
            { value: "cropped", weight: 0.36 },
            { value: "tied-back", weight: 0.14 },
            { value: "bald", weight: 0.06 },
        ],
        senior: [
            { value: "short", weight: 0.48 },
            { value: "cropped", weight: 0.3 },
            { value: "bald", weight: 0.12 },
            { value: "tied-back", weight: 0.1 },
        ],
        elder: [
            { value: "short", weight: 0.5 },
            { value: "cropped", weight: 0.28 },
            { value: "bald", weight: 0.16 },
            { value: "tied-back", weight: 0.06 },
        ],
    },
};
// How often a covered head appears in a nation's public life. This is the one
// facet that cannot be drawn from a global constant without being wrong
// everywhere: the previous flat draw put head coverings on a fifth of
// Iceland's cabinet and the same fifth of Japan's. The rate is per nation and
// applies to feminine presentations, which is where the covering the portrait
// renders is worn; nations absent from the table take DEFAULT_HEAD_COVERING.
//
// These are deliberately coarse. They are a claim about how often a covered
// head appears in a government photograph, not a measurement of religious
// observance, and no number here is fine-grained enough to be read as one.
export const DEFAULT_HEAD_COVERING = 0.02;
export const NATION_HEAD_COVERING = {
    IRN: 0.95,
    SAU: 0.9,
    AFG: 0.9,
    PAK: 0.55,
    EGY: 0.5,
    IRQ: 0.5,
    BGD: 0.45,
    MAR: 0.4,
    DZA: 0.4,
    TUR: 0.3,
    IDN: 0.3,
    NGA: 0.25,
    MYS: 0.25,
    ARE: 0.25,
    QAT: 0.25,
    IND: 0.12,
    ETH: 0.1,
    KEN: 0.08,
    LBN: 0.08,
    FRA: 0.02,
    GBR: 0.03,
    DEU: 0.03,
    USA: 0.03,
    CAN: 0.04,
};
// Color is drawn from heritage, then overridden by age: hair grays regardless
// of where it started, and by the senior band most of a cabinet has.
export const HERITAGE_HAIR_COLORS = {
    "africa-west": [{ value: "black", weight: 1 }],
    "africa-east": [{ value: "black", weight: 1 }],
    "africa-southern": [{ value: "black", weight: 1 }],
    "africa-central": [{ value: "black", weight: 1 }],
    mena: [
        { value: "black", weight: 0.85 },
        { value: "brown", weight: 0.15 },
    ],
    "europe-north": [
        { value: "fair", weight: 0.4 },
        { value: "brown", weight: 0.42 },
        { value: "black", weight: 0.12 },
        { value: "red", weight: 0.06 },
    ],
    "europe-south": [
        { value: "black", weight: 0.5 },
        { value: "brown", weight: 0.44 },
        { value: "fair", weight: 0.05 },
        { value: "red", weight: 0.01 },
    ],
    "europe-east": [
        { value: "brown", weight: 0.5 },
        { value: "fair", weight: 0.26 },
        { value: "black", weight: 0.2 },
        { value: "red", weight: 0.04 },
    ],
    "central-asia": [
        { value: "black", weight: 0.8 },
        { value: "brown", weight: 0.2 },
    ],
    "south-asia": [
        { value: "black", weight: 0.9 },
        { value: "brown", weight: 0.1 },
    ],
    "east-asia": [{ value: "black", weight: 1 }],
    "southeast-asia": [{ value: "black", weight: 1 }],
    "latin-america": [
        { value: "black", weight: 0.66 },
        { value: "brown", weight: 0.3 },
        { value: "fair", weight: 0.04 },
    ],
    pacific: [{ value: "black", weight: 1 }],
    mixed: [
        { value: "black", weight: 0.45 },
        { value: "brown", weight: 0.35 },
        { value: "fair", weight: 0.15 },
        { value: "red", weight: 0.05 },
    ],
};
/** How likely hair has gone gray or white by each band, whatever it started as. */
export const AGE_BAND_GRAYING = {
    early: { graying: 0.01, white: 0 },
    emerging: { graying: 0.12, white: 0 },
    established: { graying: 0.45, white: 0.04 },
    senior: { graying: 0.55, white: 0.25 },
    elder: { graying: 0.3, white: 0.62 },
};
// Absent from the model entirely until now, which is why a gallery of male
// officials read as one man in fifteen suits.
export const FACIAL_HAIR_WEIGHTS = {
    masculine: [
        { value: "none", weight: 0.52 },
        { value: "trimmed-beard", weight: 0.2 },
        { value: "mustache", weight: 0.12 },
        { value: "stubble", weight: 0.1 },
        { value: "full-beard", weight: 0.06 },
    ],
    feminine: [{ value: "none", weight: 1 }],
    androgynous: [
        { value: "none", weight: 0.85 },
        { value: "stubble", weight: 0.1 },
        { value: "trimmed-beard", weight: 0.05 },
    ],
};
/** Reading glasses become common with age, and read as senior official at any age. */
export const AGE_BAND_EYEWEAR = {
    early: [
        { value: "none", weight: 0.82 },
        { value: "glasses", weight: 0.18 },
    ],
    emerging: [
        { value: "none", weight: 0.76 },
        { value: "glasses", weight: 0.24 },
    ],
    established: [
        { value: "none", weight: 0.66 },
        { value: "glasses", weight: 0.34 },
    ],
    senior: [
        { value: "none", weight: 0.55 },
        { value: "glasses", weight: 0.45 },
    ],
    elder: [
        { value: "none", weight: 0.48 },
        { value: "glasses", weight: 0.52 },
    ],
};
const REGION_OF_NATION = new Map(worldNations.map((n) => [n.id, n.geo.region]));
/**
 * The authored mix where a country has one, then a thin country's own prior,
 * then its region's. Throws for a nation the dataset does not carry, rather
 * than handing it some region's faces.
 */
export function heritageMixFor(nation) {
    const mix = NATION_HERITAGE_MIX[nation] ?? COUNTRY_HERITAGE_MIX[nation] ?? REGION_HERITAGE_MIX[REGION_OF_NATION.get(nation) ?? ""];
    if (!mix)
        throw new Error(`no portrait heritage mix authored for nation ${nation}`);
    return mix;
}
export function attireOptionsFor(role) {
    const options = ROLE_ATTIRE[role] ?? VACANCY_BENCH_ATTIRE[role];
    if (!options)
        throw new Error(`no portrait attire authored for role ${role}`);
    return options;
}
export function hairStyleWeightsFor(gender, ageBand) {
    return HAIR_STYLE_WEIGHTS[gender][ageBand];
}
/**
 * How often this nation's public life shows a covered head. Nations with no
 * entry take the default rather than throwing: the head-covering table is a
 * refinement of a global baseline, and a missing entry means "unremarkable
 * here", not "unauthored".
 */
export function headCoveringRateFor(nation) {
    return NATION_HEAD_COVERING[nation] ?? DEFAULT_HEAD_COVERING;
}
export function hairColorWeightsFor(heritage) {
    return HERITAGE_HAIR_COLORS[heritage];
}
export function facialHairWeightsFor(gender) {
    return FACIAL_HAIR_WEIGHTS[gender];
}
export function eyewearWeightsFor(ageBand) {
    return AGE_BAND_EYEWEAR[ageBand];
}
/**
 * The presentation one seat draws, as a single weighted pick. An American
 * reads the bench row for their seat and party; every other nation reads its
 * government's row in the leader table, and the global weights only where the
 * table has no row.
 */
export function genderWeightsFor(nation, role, party) {
    const weights = nation === US_ID ? usBenchGenderWeights(usBenchRow(role, party)) : (nationGenderPriorFor(nation, role) ?? GENDER_WEIGHTS);
    return GENDER_PRESENTATIONS.map((value) => ({ value, weight: weights[value] }));
}
/** The faces one seat draws: the American bench row, or the nation's own mix everywhere else. */
export function seatHeritageMixFor(nation, role, party) {
    return nation === US_ID ? usBenchHeritageMix(usBenchRow(role, party)) : heritageMixFor(nation);
}
