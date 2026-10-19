import { CHARTER_USA_CONSTITUTION, NATION_LEADER_CONSTRAINTS, SECOND_TRAIT_CHANCE, roleProfileByRole, worldDataset, } from "@admin/world";
export const DISPOSITION_AXES = ["deference", "principle", "boldness", "forceAppetite", "craft"];
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const clampSigned = (value) => Math.max(-1, Math.min(1, value));
const round4 = (value) => Math.round(value * 10000) / 10000;
// How far a minister's reading of the country's place in the world moves what
// they want done about an insult. Positive on this axis is the nationalist end
// (alignment.ts derives it from a nation's isolationism), so it pulls the same
// way the authoritarian lean does.
const NATIONALIST_PULL = 0.12;
/**
 * The five readings.
 *
 * Ambition is in boldness and not in deference: a rule that weighs both would
 * otherwise read one field twice. Force appetite is unclamped because counsel
 * reads it on a scale of its own and always has; the others are shares.
 */
function axesOf(input) {
    const has = input.trait;
    return {
        deference: clamp01(0.8 * input.loyalty + 0.12 * has("loyal") + 0.08 * has("pragmatic")),
        principle: clamp01(0.8 * input.integrity + 0.18 * has("principled") - 0.25 * has("corrupt")),
        boldness: clamp01(0.5 + 0.5 * (input.ambition - 0.5) - 0.18 * has("cautious") + 0.1 * has("ambitious")),
        forceAppetite: 0.5 + 0.35 * input.hawk + 0.15 * input.authLibertarian + NATIONALIST_PULL * input.nationalistGlobalist,
        craft: clamp01(0.45 * input.charisma +
            0.35 * input.competence +
            0.2 * input.integrity +
            0.08 * has("charismatic") -
            0.08 * has("reclusive")),
    };
}
export function dispositionOf(person) {
    const has = (trait) => (person.traits.includes(trait) ? 1 : 0);
    return axesOf({
        loyalty: person.loyalty,
        integrity: person.integrity,
        ambition: person.ambition,
        competence: person.competence,
        charisma: person.charisma,
        authLibertarian: person.ideology.authLibertarian,
        nationalistGlobalist: person.ideology.nationalistGlobalist,
        // A person carrying both reads as a hawk, the order counsel has always read them in.
        hawk: person.traits.includes("hawkish") ? 1 : person.traits.includes("dovish") ? -1 : 0,
        trait: has,
    });
}
/**
 * How often a person drawn for this seat carries a trait: the anchor is one of
 * the list's traits picked evenly, and a second, picked evenly from the rest,
 * comes with `SECOND_TRAIT_CHANCE`. A trait off the list never appears. The
 * schema holds every list to two traits or more, so there is always a rest.
 */
function traitIncidence(profile, trait) {
    const listed = profile.likelyTraits;
    return listed.includes(trait) ? (1 + SECOND_TRAIT_CHANCE) / listed.length : 0;
}
/** A seat's typical occupant: the middle of every window, the seat's trait odds, and no ideology. */
function seatInputs(profile) {
    const mid = (key) => (profile.attributes[key].min + profile.attributes[key].max) / 2;
    const trait = (name) => traitIncidence(profile, name);
    return {
        loyalty: mid("loyalty"),
        integrity: mid("integrity"),
        ambition: mid("ambition"),
        competence: mid("competence"),
        charisma: mid("charisma"),
        authLibertarian: 0,
        nationalistGlobalist: 0,
        hawk: trait("hawkish") - trait("dovish"),
        trait,
    };
}
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length === 0)
        throw new Error("person-disposition: a median of nothing");
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
/**
 * The median typical occupant across the American cabinet's seats, President
 * excluded: the President is never the one deciding whether to defer to the
 * President, so their chair would only pull the middle toward a seat nobody
 * else sits in.
 */
function cabinetCenter() {
    const seats = CHARTER_USA_CONSTITUTION.cabinetRoles
        .filter((role) => role !== "role-president")
        .map((role) => {
        const profile = roleProfileByRole.get(role);
        if (!profile)
            throw new Error(`person-disposition: no role profile for cabinet seat "${role}"`);
        return axesOf(seatInputs(profile));
    });
    const entries = DISPOSITION_AXES.map((axis) => [axis, round4(median(seats.map((seat) => seat[axis])))]);
    return Object.fromEntries(entries);
}
export const DISPOSITION_CENTER = cabinetCenter();
/** How far this person sits from the typical cabinet member on one axis, signed. */
export function axisLean(person, axis) {
    return round4(dispositionOf(person)[axis] - DISPOSITION_CENTER[axis]);
}
/**
 * How far apart two people sit on the three axes, 0 (identical) to 1
 * (opposed on all three).
 */
export function ideologyGap(a, b) {
    const axes = [
        a.economicLeftRight - b.economicLeftRight,
        a.authLibertarian - b.authLibertarian,
        a.nationalistGlobalist - b.nationalistGlobalist,
    ];
    // Mean of the per-axis gaps rather than the vector length: a pair who differ
    // completely on one axis and agree on two is a working relationship with one
    // sore subject, and Euclidean distance would score them as further apart than
    // a pair who mildly disagree about everything.
    const mean = axes.reduce((total, gap) => total + Math.abs(gap), 0) / (axes.length * 2);
    return Math.max(0, Math.min(1, mean));
}
// Temperaments that argue with each other wherever they meet, independent of
// where either sits ideologically. A hawk and a dove disagree about the answer
// to a crisis; someone principled and someone corrupt disagree about what is
// allowed to be considered at all.
const ANTAGONISMS = [
    ["hawkish", "dovish"],
    ["principled", "corrupt"],
    ["cautious", "ambitious"],
];
const AFFINITIES = [
    ["hawkish", "hawkish"],
    ["dovish", "dovish"],
    ["principled", "principled"],
    ["pragmatic", "pragmatic"],
    ["loyal", "loyal"],
];
export function traitPull(a, b) {
    const has = (person, trait) => person.traits.includes(trait);
    let pull = 0;
    for (const [left, right] of ANTAGONISMS) {
        if ((has(a, left) && has(b, right)) || (has(a, right) && has(b, left)))
            pull -= 0.35;
    }
    for (const [left, right] of AFFINITIES) {
        if (has(a, left) && has(b, right))
            pull += 0.2;
    }
    return pull;
}
/**
 * How well two people get on from who they are alone: agreement on the issues,
 * read at `scale` because how wide a gap counts as a quarrel depends on how
 * clustered the group is, plus the temperaments that clash or click. Unclamped,
 * so a caller adding a term of its own clamps once.
 */
export function personalAffinity(a, b, scale) {
    const agreement = 1 - ideologyGap(a.ideology, b.ideology) * scale;
    return agreement + traitPull(a, b);
}
/**
 * How wide a gap between two leaders counts as a quarrel. The world's
 * governing parties sit a median 0.15 apart and a 90th percentile 0.31 apart,
 * the same clustering a cabinet shows, so the cabinet's own scale puts a
 * typical pair near the middle and a pair at the wide end at open dislike.
 */
const RAPPORT_SCALE = 6;
/** The governing party's authored beliefs for every nation the leader table seats a party in. */
function governingBeliefs() {
    return worldDataset.nations.flatMap((nation) => {
        const party = NATION_LEADER_CONSTRAINTS[nation.id]?.governing[0];
        const found = party === undefined ? undefined : nation.partySystem.parties.find((entry) => entry.id === party);
        return found ? [found.beliefs] : [];
    });
}
/**
 * The typical affinity between two of the world's governments, from their
 * governing parties' authored platforms. Traits are absent there, so this is
 * the issues half alone; a pair of leaders who share a temperament reads warmer
 * than typical, which is what rapport is meant to say.
 */
function rapportCenter() {
    const beliefs = governingBeliefs();
    const affinities = beliefs.flatMap((left, i) => beliefs.slice(i + 1).map((right) => 1 - ideologyGap(left, right) * RAPPORT_SCALE));
    return round4(median(affinities));
}
// Computed on first use rather than at load: a module that reads the world's
// leader table while it loads breaks every caller that loads it under a
// substituted table, and nothing needs the center until a pair is compared.
let rapportCenterMemo;
export function rapportCenterOf() {
    rapportCenterMemo ??= rapportCenter();
    return rapportCenterMemo;
}
/** How well two leaders get on personally, centered on the typical pair of governments, -1..1. */
export function leaderRapport(a, b) {
    return round4(clampSigned(personalAffinity(a, b, RAPPORT_SCALE) - rapportCenterOf()));
}
/**
 * Which engine modules may read each axis.
 *
 * A budget, not documentation: scripts/verify-disposition-readers.mjs scans the
 * engine for every reader and fails one that is not listed here, or a listing
 * that no longer reads its axis. Two terms in one
 * outcome reading the same person field through two axes is the double count
 * this reader exists to prevent, and the only way to see it before it ships is
 * to know every place an axis is read.
 */
export const DISPOSITION_READERS = {
    deference: ["execution.ts", "order-review.ts", "cabinet-revolt.ts"],
    principle: ["order-review.ts", "cabinet-initiative.ts", "cabinet-graft.ts"],
    boldness: ["execution.ts", "cabinet-initiative.ts", "cabinet-alignment.ts"],
    forceAppetite: ["counsel-instinct.ts", "cabinet-initiative.ts"],
    craft: ["treaty-counterpart.ts", "lobbying-advocate.ts"],
};
