import { FOUNDING_DYADS } from "@admin/world";
import { appetite, TEMPERAMENT_CENTER } from "./temperament.js";
import { grudgeWeight } from "./relationships.js";
// Read only inside the bank lines, never while this module loads, so the
// article desk can sit anywhere in the import graph.
import { BARE_BODY_NAMES } from "./article-desk.js";
// A body's name as a sentence carries it. A name read as a word is a proper
// noun on its own — "leaves OPEC+", "admitted to ASEAN" — and the article on
// one is the error a template writing "the" before every body printed. A
// spelled-out name or a lettered one takes it: "the European Union", "the G7".
function body(name) {
    return BARE_BODY_NAMES.has(name) ? name : `the ${name}`;
}
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
export const TEMPLATES = [
    {
        id: "world-event:sanctions-package",
        family: "sanctions-package",
        dyads: ["hostile", "rivalrous"],
        question: "org-vote",
        threshold: 0.15,
        cooldownWeeks: 26,
        writes: ["relationships (each member toward the target, and back)", "relationship history", "feed"],
        bank: {
            headlines: [
                (a, s) => `${capitalize(body(a))} agrees a package of sanctions on ${s}.`,
                (a, s) => `Members of ${body(a)} close ranks and sanction ${s}.`,
                (a, s) => `${s} is hit with sanctions agreed by every member of ${body(a)}.`,
            ],
            standfirsts: [
                (a) => `every member of ${body(a)} applies the same list`,
                (_a, s) => `${s} now faces one set of measures from the whole bloc`,
                (a) => `no member of ${body(a)} broke ranks when it came to the vote`,
            ],
        },
    },
    {
        id: "world-event:border-clash",
        family: "border-clash",
        dyads: ["hostile", "rivalrous"],
        question: "world-event",
        threshold: 0.55,
        // The rest after a clash, not its rhythm: when the pair clashes again is
        // the episode hazard's, so a rest long enough to set a timer is the one
        // thing this must not be.
        cooldownWeeks: 4,
        writes: ["relationships (both edges: tension, trust, military threat)", "a grudge on the side that was hit", "feed"],
        bank: {
            headlines: [
                (a, s) => `Troops from ${a} and ${s} clash along their border.`,
                (a, s) => `Shots are exchanged on the frontier between ${a} and ${s}.`,
                (a, s) => `${a} and ${s} trade fire at a disputed stretch of border.`,
            ],
            standfirsts: [
                () => "both sides have pulled back, and neither has called it a war",
                (_a, s) => `${s} says it will answer any repeat`,
                () => "the border is quiet again, and both garrisons have been reinforced",
            ],
        },
    },
    {
        id: "world-event:accession",
        family: "accession",
        dyads: [],
        question: "org-vote",
        threshold: 0.1,
        cooldownWeeks: 52,
        writes: ["NationRuntime.memberships", "feed"],
        // The first two lines say an admission; the third of each says a withdrawal.
        bank: {
            headlines: [
                (a, s) => `${s} is admitted to ${body(a)}.`,
                (a, s) => `${capitalize(body(a))} votes to take in ${s}.`,
                (a, s) => `${s} leaves ${body(a)}.`,
            ],
            standfirsts: [
                (a) => `${body(a)} now speaks for one more government`,
                (_a, s) => `${s} takes up its seat at the next meeting`,
                (a) => `${body(a)} is one member smaller`,
            ],
        },
    },
    {
        id: "world-event:disaster-aid",
        family: "disaster-aid",
        dyads: [],
        question: "send-aid",
        threshold: 0.45,
        cooldownWeeks: 8,
        writes: ["relationships (the stricken government toward the donor)", "relationship history", "feed"],
        bank: {
            headlines: [
                (a, s) => `${a} sends relief to ${s} after the disaster.`,
                (a, s) => `Aid flights from ${a} land in ${s}.`,
                (a, s) => `${a} pledges help to ${s} as the damage is counted.`,
            ],
            standfirsts: [
                (a) => `the first shipments from ${a} are already on the ground`,
                (_a, s) => `${s} has thanked the donors by name`,
                () => "rescue teams and supplies are arriving by air",
            ],
        },
    },
    {
        id: "world-event:election-interference",
        family: "election-interference",
        dyads: ["hostile", "rivalrous"],
        question: "world-event",
        threshold: 0.6,
        cooldownWeeks: 26,
        writes: ["relationships (the target toward the interfering government)", "relationship history", "feed (intelligence only)"],
        bank: {
            headlines: [
                (a, s) => `Intelligence points to ${a} working to sway the election in ${s}.`,
                (a, s) => `${a} is running a covert campaign ahead of the vote in ${s}.`,
                (a, s) => `Services trace an influence operation in ${s} back to ${a}.`,
            ],
            standfirsts: [
                (_a, s) => `the government in ${s} has not said whether it knows`,
                () => "the operation runs through intermediaries and paid accounts",
                (a) => `nothing so far ties ${a} to it in public`,
            ],
        },
    },
];
export function templateOf(family) {
    const found = TEMPLATES.find((template) => template.family === family);
    if (!found)
        throw new Error(`world-events: no template for ${family}`);
    return found;
}
// --- The terms each family's parties weigh ---
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const round4 = (v) => Math.round(v * 10000) / 10000 || 0;
const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const DYAD_KIND = new Map(FOUNDING_DYADS.map((row) => [pairKey(row.pair[0], row.pair[1]), row.kind]));
const RIVALS = FOUNDING_DYADS.filter((row) => row.kind === "hostile" || row.kind === "rivalrous").reduce((map, row) => {
    const [a, b] = row.pair;
    return new Map([...map, [a, [...(map.get(a) ?? []), b]], [b, [...(map.get(b) ?? []), a]]]);
}, new Map());
/** The governments the sourced table records as this one's rivals or enemies. */
export function sourcedRivals(nation) {
    return RIVALS.get(nation) ?? [];
}
/** The sourced kind of the pair, if the table records one. */
export function dyadKindOf(a, b) {
    return DYAD_KIND.get(pairKey(a, b));
}
const DYAD_PULL = { hostile: 0.3, rivalrous: 0.2, cool: 0.05, close: -0.2, dependent: -0.1 };
function temperTerms(temper) {
    return [
        { key: "appetite", source: "trait", value: round4(0.4 * (appetite(temper) - TEMPERAMENT_CENTER.appetite)) },
        { key: "isolationism", source: "trait", value: round4(-0.3 * (temper.isolationism - TEMPERAMENT_CENTER.isolationism)) },
        { key: "legalism", source: "trait", value: round4(-0.3 * (temper.legalism - TEMPERAMENT_CENTER.legalism)) },
    ];
}
/** A government deciding whether to act against a rival: a border clash, an election interfered with. */
export function hostileActTerms(temper, edge, kind, neighbors) {
    return [
        { key: "dyad-kind", source: "situation", value: kind ? DYAD_PULL[kind] : 0 },
        { key: "border", source: "situation", value: neighbors ? 0.2 : 0 },
        { key: "grievance", source: "interest", value: round4(0.4 * clamp01(grudgeWeight(edge))) },
        { key: "enmity", source: "situation", value: round4(0.4 * edge.tension + 0.3 * Math.max(0, -edge.trust)) },
        ...temperTerms(temper),
    ];
}
/**
 * A member voting on a measure against a target: its own reading of the
 * target, what it would lose, the obligation of sitting in the bloc, and
 * whether it is a government that stays out of others' affairs.
 */
export function sanctionVoteTerms(temper, edge) {
    return [
        { key: "obligation", source: "obligation", value: 0.15 },
        { key: "bond", source: "interest", value: round4(-0.5 * edge.trust) },
        { key: "enmity", source: "situation", value: round4(0.6 * edge.tension + 0.4 * clamp01(grudgeWeight(edge))) },
        { key: "stakes", source: "interest", value: round4(-0.4 * edge.tradeDependence) },
        { key: "isolationism", source: "trait", value: round4(-0.2 * (temper.isolationism - TEMPERAMENT_CENTER.isolationism)) },
        { key: "legalism", source: "trait", value: round4(0.1 * (temper.legalism - TEMPERAMENT_CENTER.legalism)) },
    ];
}
/** A member voting on whether to admit a government: its own ties to the applicant and the trade between them. */
export function admissionVoteTerms(temper, edge) {
    return [
        { key: "bond", source: "interest", value: round4(0.5 * edge.trust) },
        { key: "enmity", source: "situation", value: round4(-0.4 * edge.tension) },
        { key: "stakes", source: "interest", value: round4(0.3 * edge.tradeDependence) },
        { key: "isolationism", source: "trait", value: round4(-0.2 * (temper.isolationism - TEMPERAMENT_CENTER.isolationism)) },
    ];
}
// Planning values. Set so a member that trusts the others at zero and trades
// with them at the median holds, and one that resents them, has been coerced
// by them and has little to lose goes; a treaty that says nothing about
// leaving costs a legalistic government most to repudiate.
const REPUDIATION_COST = 0.15;
/** A member deciding whether to leave a body, from what it resents, what it would lose and what leaving costs. */
export function withdrawalVoteTerms(temper, reading) {
    return [
        { key: "bond", source: "interest", value: round4(-0.6 * reading.meanTrust) },
        { key: "enmity", source: "situation", value: round4(0.4 * reading.grievance) },
        { key: "stakes", source: "interest", value: round4(-0.8 * reading.trade - 0.5 * reading.protection) },
        { key: "obligation", source: "obligation", value: round4(-0.1 - reading.exitCost - (reading.repudiation ? REPUDIATION_COST : 0)) },
        { key: "isolationism", source: "trait", value: round4(0.4 * (temper.isolationism - TEMPERAMENT_CENTER.isolationism)) },
        { key: "legalism", source: "trait", value: round4(reading.repudiation ? -0.3 * (temper.legalism - TEMPERAMENT_CENTER.legalism) : 0) },
    ];
}
/** A government deciding whether to send help after a disaster. */
export function aidTerms(temper, edge, severity, proximity, sharesBody) {
    return [
        { key: "need", source: "situation", value: round4(0.6 * severity) },
        { key: "reach", source: "situation", value: round4(0.3 * proximity) },
        { key: "bond", source: "interest", value: round4(0.5 * edge.trust) },
        { key: "enmity", source: "situation", value: round4(-0.4 * edge.tension) },
        { key: "stakes", source: "interest", value: round4(0.3 * edge.tradeDependence) },
        { key: "obligation", source: "obligation", value: sharesBody ? 0.15 : 0 },
        { key: "isolationism", source: "trait", value: round4(-0.3 * (temper.isolationism - TEMPERAMENT_CENTER.isolationism)) },
    ];
}
// --- Filing an event ---
/** The history kind a firing leaves on the acting government's edge, which is also how its cooldown is read. */
export const worldEventKind = (family) => `world-event:${family}`;
/** Whether this family has fired on this edge inside its cooldown. */
export function firedRecently(edge, family, turn) {
    if (!edge)
        return false;
    const kind = worldEventKind(family);
    const { cooldownWeeks } = templateOf(family);
    return edge.history.some((event) => event.kind === kind && turn - event.turn < cooldownWeeks);
}
/** Which of the bank's three lines a firing uses: fixed by the week and the pair, so a replay files the same words. */
export function eventLineIndex(turn, actor, subject) {
    const seed = `${turn}:${actor}:${subject}`;
    let total = 0;
    for (let i = 0; i < seed.length; i += 1)
        total = (total + seed.charCodeAt(i) * (i + 1)) % 9973;
    return (total % 3);
}
