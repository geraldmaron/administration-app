import { axisLean, ideologyGap, traitPull } from "./person-disposition.js";
import { ownershipOf } from "./department-ownership.js";
import { selectCabinet, selectPerson } from "./state.js";
// Who in this room can work with whom.
//
// A cabinet was a list of five people with no relationships between them. Every
// reading the game held about a minister was a reading about them alone — their
// competence, their loyalty to the president, their own ideology — so a player
// could seat a hawk beside a dove and a libertarian beside an authoritarian and
// the government behaved exactly as if they had seated five copies of the same
// person. The friction a real cabinet runs on had nowhere to live.
//
// This composes the graph on demand from what the people already are and from
// what they have said in the room. It stores nothing: the same rule the dossier
// and the counsel record follow, so a cabinet reshuffled at turn 40 has the
// relationships its actual members imply rather than a set written down at
// founding and never revisited.
//
// The record is the last of the readings below. `ActionCounsel.room` keeps every seated chair's
// stance on every decision the President took, so two Secretaries who have
// spent half a year on opposite sides of the table have a history the tie can
// read, and two who keep landing on the same side have one too. It is worth
// less than who they are: a feud that who they are and what they run does not
// already suggest takes months of argument to open, and a quarrel it does
// suggest can be softened by a run of agreement but not erased by it.
/**
 * A minister who has started building a faction of their own has stopped being
 * a colleague of the people who have not. This is the one term drawn from the
 * campaign rather than from who the two people are, because it is a fact the
 * campaign produced (cabinet.ts's challenge outcome) rather than a disposition
 * they arrived with.
 */
const RIVAL_BREAK = -0.4;
// What a tie is made of, besides the record and a declared faction.
//
// Ideology alone cannot be the whole of it. A President of either party seats a
// cabinet from their own side, and measured over the balance seeds those
// cabinets sit a median 0.032 apart on the three axes: read on ideology alone,
// not one pair in twenty-four founded party cabinets came out opposed, and the
// cabinets that feuded were only an independent's, seated from both parties.
// Real cabinet rivalries are mostly about turf (State against Defense,
// Treasury against Commerce), about two people who both want to be the voice
// the President hears first, and about temperament. So a tie is the sum of
// five readings, each weighed for what it is worth in a working cabinet:
//
//   standing = TIE_BASE + ideology + temperament + turf + ambition (+ faction + record)
/**
 * Where two colleagues the same President chose start: on working terms, short
 * of allies. A shared temperament (`traitPull`'s +0.2) is what takes a typical
 * pair to allied, and a typical pair with nothing between them reads workable.
 */
const TIE_BASE = 0.25;
/**
 * The ideology gap between two Secretaries in a founded cabinet, the median and
 * the 75th percentile over every Secretary pair the balance seeds found for all
 * three parties. A gap is read in units of the distance between the two, so a
 * pair at the wide quarter of a real cabinet reads one unit apart however
 * clustered cabinets are. Pinned by a test that recomputes both.
 */
export const GAP_MEDIAN = 0.035;
export const GAP_WIDE = 0.0483;
/**
 * Worth a fifth of a point per unit: a party cabinet's widest pairs (two or
 * three units out) disagree enough to be strained. Capped, because a policy
 * gulf alone is a reason to argue, not a reason two colleagues cannot sit in a
 * room: Secretaries from the other party who share a temperament and stay off
 * each other's turf have worked together for Presidents of both parties. At the
 * cap a cross-party pair reads exactly at the edge of opposed, and any other
 * friction tips it over.
 */
const IDEOLOGY_WEIGHT = 0.2;
const IDEOLOGY_CAP = 0.6;
/**
 * Departments that answer for the same kind of crisis fight over who leads it.
 * Each class of matter two chairs both have standing in is worth this much,
 * up to three: State and Defense share three (a foreign crisis, a war, a
 * hostage-taking), which is the full rivalry and reads strained on its own.
 * Turf by itself never makes two people enemies; turf with anything else does.
 */
const TURF_PER_CLASS = 0.15;
const TURF_CLASSES_FULL = 3;
/**
 * Two Secretaries both bolder than the typical one compete to be the voice the
 * President hears first. Read off the less bold of the two, since a clash takes
 * two: at the 90th percentile of such pairs (both about 0.13 above center) it is
 * worth about a quarter of a point, the width of one reading.
 */
const AMBITION_CLASH_WEIGHT = 2;
/**
 * The most the room's record can move a tie: a pair who took opposite sides
 * every time they both took one moves by this much, and less than one band.
 */
const RECORD_WEIGHT = 0.3;
/** Half a year, the same stretch a Secretary holds being overruled against the President. */
export const RECORD_MEMORY_TURNS = 26;
/**
 * The fewest shared decisions the record is read over. A pair who split on the
 * only two calls they both made have argued twice, not feuded, so a short record
 * is divided by this rather than by its own length.
 */
const RECORD_FLOOR = 4;
/** The system tag a leak aimed at a colleague carries, beside "cabinet" and "leak". */
export const RIVAL_LEAK_SYSTEM = "rival";
// Four words rather than a number, because the player's question is who to put
// in a room together and no fifth of a point answers it.
export function tieReading(standing) {
    if (standing >= 0.35)
        return "allied";
    if (standing >= 0)
        return "workable";
    if (standing >= -0.35)
        return "strained";
    return "opposed";
}
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
// Every tie in a room of sixteen asks this, every time a chart, a cohesion
// reading or a leak asks for a tie, and the answer only changes when the
// ledger does. The ledger is replaced rather than edited, so its identity is
// the whole of the cache key.
const meetingsByLedger = new WeakMap();
/** Every pair of people who took a side on the same decision, with whether it was the same side. */
function meetingsOf(ledger) {
    const cached = meetingsByLedger.get(ledger);
    if (cached)
        return cached;
    const index = new Map();
    for (const entry of ledger) {
        const room = entry.actor === "player" ? entry.counsel?.room : undefined;
        if (!room)
            continue;
        // A hedge is not a side, so it is neither agreement nor opposition: the
        // same rule the counsel record scores contested calls by.
        const sided = room.filter((voice) => voice.stance !== "wary");
        sided.forEach((left, i) => {
            for (const right of sided.slice(i + 1)) {
                if (left.person === right.person)
                    continue;
                const key = pairKey(left.person, right.person);
                const meetings = index.get(key) ?? [];
                meetings.push({ turn: entry.turn, agreed: left.stance === right.stance });
                index.set(key, meetings);
            }
        });
    }
    meetingsByLedger.set(ledger, index);
    return index;
}
/** What two people have said side by side in the room over the last half year. */
export function tieRecordBetween(campaign, a, b) {
    const since = campaign.turn - RECORD_MEMORY_TURNS;
    const recent = (meetingsOf(campaign.ledger).get(pairKey(a, b)) ?? []).filter((meeting) => meeting.turn >= since);
    const agreed = recent.filter((meeting) => meeting.agreed).length;
    const opposed = recent.length - agreed;
    const term = round4((RECORD_WEIGHT * (agreed - opposed)) / Math.max(RECORD_FLOOR, recent.length));
    return { agreed, opposed, term };
}
// Which classes of matter two chairs share is a fact about the charter, not
// the week, so it is read once per pair of chairs.
const sharedClassesCache = new Map();
function sharedClasses(campaign, roleA, roleB) {
    const key = `${campaign.founding.charter}|${roleA < roleB ? `${roleA}|${roleB}` : `${roleB}|${roleA}`}`;
    const cached = sharedClassesCache.get(key);
    if (cached !== undefined)
        return cached;
    const mine = ownershipOf(campaign, roleA)?.scenarioClasses ?? [];
    const theirs = ownershipOf(campaign, roleB)?.scenarioClasses ?? [];
    const shared = mine.filter((cls) => theirs.includes(cls)).length;
    sharedClassesCache.set(key, shared);
    return shared;
}
function ambitionClash(campaign, a, b, roleA, roleB) {
    // The President is not competing with their own Secretaries for their own ear.
    if (roleA === campaign.founding.leadRole || roleB === campaign.founding.leadRole)
        return 0;
    const leanA = axisLean(a.base, "boldness");
    const leanB = axisLean(b.base, "boldness");
    return leanA > 0 && leanB > 0 ? -AMBITION_CLASH_WEIGHT * Math.min(leanA, leanB) : 0;
}
function termsBetween(campaign, a, b, roleA, roleB, record) {
    const ideology = -IDEOLOGY_WEIGHT * ((ideologyGap(a.base.ideology, b.base.ideology) - GAP_MEDIAN) / (GAP_WIDE - GAP_MEDIAN));
    return {
        ideology: round4(Math.max(-IDEOLOGY_CAP, ideology)),
        temperament: round4(traitPull(a.base, b.base)),
        turf: round4(-TURF_PER_CLASS * Math.min(TURF_CLASSES_FULL, sharedClasses(campaign, roleA, roleB))),
        ambition: round4(ambitionClash(campaign, a, b, roleA, roleB)),
        faction: a.affiliation !== undefined || b.affiliation !== undefined ? RIVAL_BREAK : 0,
        record: record.term,
    };
}
function tieBetween(campaign, roleA, roleB) {
    const a = selectPerson(campaign, selectCabinet(campaign)[roleA]);
    const b = selectPerson(campaign, selectCabinet(campaign)[roleB]);
    if (!a || !b || !a.alive || !b.alive)
        return undefined;
    const record = tieRecordBetween(campaign, a.base.id, b.base.id);
    const terms = termsBetween(campaign, a, b, roleA, roleB, record);
    const sum = TIE_BASE + terms.ideology + terms.temperament + terms.turf + terms.ambition + terms.faction + terms.record;
    const standing = round4(Math.max(-1, Math.min(1, sum)));
    return { a: a.base.id, b: b.base.id, roleA, roleB, standing, record, terms };
}
function tiesOf(campaign, person, roles) {
    const cabinet = selectCabinet(campaign);
    const own = roles.find((role) => cabinet[role] === person);
    if (!own)
        return [];
    return roles
        .filter((role) => role !== own && cabinet[role] !== person)
        .flatMap((role) => {
        const tie = tieBetween(campaign, own, role);
        return tie ? [tie] : [];
    })
        .sort((first, second) => Math.abs(second.standing) - Math.abs(first.standing));
}
/**
 * Every tie one seated minister has with the rest of the room, strongest
 * feeling first.
 *
 * The player's own chair is included: the president sits in this cabinet, and
 * whether a Secretary can work with *them* is the tie that decides whether the
 * rest of the graph matters.
 */
export function selectCabinetTies(campaign, person) {
    return tiesOf(campaign, person, Object.keys(selectCabinet(campaign)));
}
/** The chairs a Secretary sits in: every seat but the President's own. */
function secretaryRoles(campaign) {
    return Object.keys(selectCabinet(campaign)).filter((role) => role !== campaign.founding.leadRole);
}
/**
 * The same ties with the President's chair left out, for the rules that act on
 * them: a Secretary aims a leak at a colleague, and a room is split between
 * colleagues. The President is never one side of a feud a rule can act on.
 */
export function selectSecretaryTies(campaign, person) {
    return tiesOf(campaign, person, secretaryRoles(campaign));
}
/** Every pair of seated Secretaries, each pair once, in the order the cabinet seats them. */
export function selectSecretaryPairs(campaign) {
    const roles = secretaryRoles(campaign);
    return roles.flatMap((roleA, i) => roles.slice(i + 1).flatMap((roleB) => {
        const tie = tieBetween(campaign, roleA, roleB);
        return tie ? [tie] : [];
    }));
}
/**
 * The leaks aimed at a colleague over the last half year that this person was
 * either side of, newest first: the record a cabinet chart shows beside a feud.
 */
export function selectAimedLeaks(campaign, person) {
    const since = campaign.turn - RECORD_MEMORY_TURNS;
    const found = [];
    for (let index = campaign.ledger.length - 1; index >= 0; index -= 1) {
        const entry = campaign.ledger[index];
        if (entry.turn < since)
            break;
        const causal = entry.causal;
        if (entry.actor !== "world" || !causal?.systems?.includes(RIVAL_LEAK_SYSTEM))
            continue;
        const [leaker, target] = (causal.entities ?? []);
        if (!leaker || !target || (leaker !== person && target !== person))
            continue;
        found.push({ turn: entry.turn, leaker, target, ...(causal.decision ? { decision: causal.decision } : {}) });
    }
    return found;
}
