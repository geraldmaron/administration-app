import { relationshipKey, selectRelationship } from "./state.js";
// The graph module is the one value import, and it reaches nothing that imports
// this module back; it restates the treaty id grammar to keep it that way.
import { structuralReading } from "./relationship-graph.js";
// Relationships are directed: how United States reads a neighbor need not match
// how that neighbor reads United States. Grudges are how a cheap
// betrayal stays expensive: each carries the cause, its weight, the turn it was
// created, and a decay rate set by the aggrieved party's vengefulness, so a
// vengeful nation forgives slower than a forgiving one.
// --- How memory ages ---
//
// Every reading of memory here ages by the one shared approach-to-target form,
// `next = target + (current - target) * 2^(-elapsedDays / halfLifeDays)`, so a
// favor and a slight both fade by the calendar rather than by a fixed step a
// week, and a fast or slow pace of play ages them identically.
//
// Two half-lives, because the record says injuries outlast kindnesses: a
// government that was helped forgets faster than one that was wronged. Both
// are planning values, chosen inside the candidate ranges the world-dynamics
// program set (a favor fades over 26 to 52 weeks; a grievance lasts two to
// four times as long) and checked against idle campaigns, not sourced figures.
/** Planning value: days for half of a favor above a pair's standing reading to fade. 39 weeks. */
export const FAVOR_HALF_LIFE_DAYS = 273;
/**
 * Planning value: how many favor half-lives a grievance takes to halve, at the
 * forgiving and the vengeful end of the scale. A nation's vengefulness places it
 * between the two.
 */
export const GRIEVANCE_HALF_LIFE_MULTIPLE = { forgiving: 2, vengeful: 4 };
const DAYS_PER_WEEK = 7;
/** What is left of a departure from target after `elapsedDays`, at `halfLifeDays`. */
export function retained(elapsedDays, halfLifeDays) {
    return Math.pow(2, -Math.max(0, elapsedDays) / halfLifeDays);
}
/** The shared form: `current` moved toward `target` by `elapsedDays` of memory. */
export function approach(current, target, elapsedDays, halfLifeDays) {
    return target + (current - target) * retained(elapsedDays, halfLifeDays);
}
/** Days for half of a grievance to fade, for a government of this vengefulness. */
export function grievanceHalfLifeDays(vengefulness) {
    const v = Math.max(0, Math.min(1, vengefulness));
    const { forgiving, vengeful } = GRIEVANCE_HALF_LIFE_MULTIPLE;
    return FAVOR_HALF_LIFE_DAYS * (forgiving + (vengeful - forgiving) * v);
}
/**
 * A grudge's stored decay rate: the share of its fading weight it loses each
 * day. Higher vengefulness, slower decay. Stored rather than re-derived so a
 * grievance keeps the temper of the government that formed it.
 */
export function grudgeDecayRate(vengefulness) {
    return 1 - retained(1, grievanceHalfLifeDays(vengefulness));
}
export function createGrudge(cause, weight, createdTurn, vengefulness) {
    return { cause, weight, createdTurn, decayRate: grudgeDecayRate(vengefulness) };
}
// Saves written before grudges aged by the calendar stored a flat weekly step
// of 0.12 * (1 - vengefulness), never below 0.02. A daily rate is never near
// that size (the fastest grievance half-life gives about 0.0013), so a stored
// rate at or above this line can only be the old step. The migration is
// representative rather than exact: the step is inverted to a vengefulness,
// and every temper from 5/6 up stored the same floored 0.02, so those come back
// as 5/6, the least vengeful temper that could have written it.
const LEGACY_RATE_LINE = 0.01;
const LEGACY_BASE_STEP = 0.12;
/** A grudge from an older save, restated in the daily rate; a current one unchanged. */
export function migrateGrudge(grudge) {
    if (grudge.decayRate < LEGACY_RATE_LINE)
        return grudge;
    const vengefulness = Math.max(0, Math.min(1, 1 - grudge.decayRate / LEGACY_BASE_STEP));
    return { ...grudge, decayRate: grudgeDecayRate(vengefulness) };
}
// The durable part of a grudge, by its cause. A war is remembered for
// generations after its bitterness has cooled, so the grievance a war leaves
// fades toward this floor and never below it. Every other cause fades to
// nothing: a universal floor would make every slight permanent.
/** Planning value: the least a war's grudge ever weighs. */
export const WAR_GRUDGE_FLOOR = 0.15;
/** The weight below which a grudge with no durable floor is forgotten outright. */
const GRUDGE_FORGOTTEN = 0.005;
function grudgeFloor(grudge) {
    return grudge.cause.startsWith("war:") ? Math.min(grudge.weight, WAR_GRUDGE_FLOOR) : 0;
}
/** One grudge aged by `elapsedDays`, or undefined once it is forgotten. */
export function ageGrudge(grudge, elapsedDays) {
    const current = migrateGrudge(grudge);
    const floor = grudgeFloor(current);
    const days = Math.max(0, elapsedDays);
    const weight = floor + (current.weight - floor) * Math.pow(1 - current.decayRate, days);
    if (floor === 0 && weight < GRUDGE_FORGOTTEN)
        return undefined;
    return { ...current, weight };
}
// Sum of live grudge weight — the thing an NPC decision reads to answer
// "why do they hate us" without re-deriving it from history each time.
export function grudgeWeight(relationship) {
    return relationship.grudges.reduce((sum, g) => sum + g.weight, 0);
}
// The subset of history.kind values that stand for something two nations
// still remember about each other well after the trust/tension jolt from the
// moment itself has been overwritten by everything that happened since:
// breaking relations off, a caught covert operation, sending relief, or
// standing behind a security guarantee. Weaker acts (a démarche, a public
// statement) are routine diplomatic weather and are deliberately left
// unclassified so they cannot pad this reading; an authored consequence's
// "remembered" line and a conversation's recorded position are also left out
// because they describe how an act was received, not a new act of its own.
// A state visit, a summit and a joint declaration are remembered the way relief
// is; a call and an envoy are the routine weather and stay unclassified. A
// border clash and a bloc's sanctions are remembered the way a severance is.
const COERCIVE_HISTORY_KINDS = new Set(["severance", "world-event:border-clash", "world-event:sanctions-package"]);
const COOPERATIVE_HISTORY_KINDS = new Set([
    "relief",
    "guarantee",
    "engagement-visit",
    "engagement-summit",
    "engagement-declaration",
    "world-event:disaster-aid",
    "war-aid",
]);
const isFailedRisk = (kind) => kind.startsWith("failed-");
function classifyHistoryEvent(kind) {
    if (COOPERATIVE_HISTORY_KINDS.has(kind))
        return 1;
    if (COERCIVE_HISTORY_KINDS.has(kind) || isFailedRisk(kind))
        return -1;
    return 0;
}
// The single most recent classified act's pull on disposition, before older
// acts are discounted below it — comparable to one rung-5 instrument's direct
// trust hit, since this is meant to still be felt at full strength the turn
// it happens and only fade from there.
const HISTORY_RECENCY_BASE = 0.06;
// How much each classified act still further back counts relative to the one
// immediately ahead of it in the record. A country's read of a counterpart is
// dominated by what that counterpart has done lately, not an unweighted
// average of everything on file since founding — one severance five terms
// ago should not outvote a guarantee extended last month.
const HISTORY_RECENCY_DECAY = 0.6;
// How many of the most recent classified acts still move the reading at all.
// Past this, the geometric decay above has already pushed a term's weight
// under a hundredth of the most recent one, so tracking further back buys
// nothing but iteration cost.
const HISTORY_TRACK_LIMIT = 10;
// A remembered act fades by the calendar as well as by what came after it, at
// the half-life of its kind: a cooperative act as a favor does, a coercive one
// as a grievance does at the middle of the vengefulness scale, since the
// record carries no temper of its own.
const COOPERATIVE_HISTORY_HALF_LIFE_DAYS = FAVOR_HALF_LIFE_DAYS;
const COERCIVE_HISTORY_HALF_LIFE_DAYS = grievanceHalfLifeDays(0.5);
// The remembered pattern's pull on disposition, independent of any live
// grudge. Grudges and this term are read from disjoint slices of what a
// relationship logs: the two call sites that create a grudge either write it
// to the *other* direction's relationship (resolution.ts's failed-risk
// grudge lands on target->actor while the matching "failed-*" history entry
// lands on actor->target — different Relationship objects, so a single
// disposition() call never sees both) or, where a grudge and a history entry
// do land on the same direction (consequences.ts's grudgeEffect alongside
// its "remembered" line), the history entry is stamped with the generic kind
// "consequence", which this function does not classify. So a classified
// event here is never also live as a grudge weight on the same relationship;
// the two systems price different things — a grudge is a live, decaying
// grievance an NPC decision reads directly, this is the longer-running
// "what has this counterpart generally done" signal.
//
// `now` is the turn the record is read on; an act's age is measured from it.
export function historyPressure(relationship, now) {
    const classified = relationship.history
        .map((event) => ({ turn: event.turn, kind: event.kind, sign: classifyHistoryEvent(event.kind) }))
        .filter((event) => event.sign !== 0)
        // Newest first, and acts of one week in a fixed order by kind, because rank
        // sets each act's weight and the record's write order is not a fact.
        .sort((a, b) => b.turn - a.turn || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0))
        .slice(0, HISTORY_TRACK_LIMIT);
    return classified.reduce((sum, event, rank) => {
        const halfLife = event.sign > 0 ? COOPERATIVE_HISTORY_HALF_LIFE_DAYS : COERCIVE_HISTORY_HALF_LIFE_DAYS;
        const age = retained((now - event.turn) * DAYS_PER_WEEK, halfLife);
        return sum + event.sign * HISTORY_RECENCY_BASE * Math.pow(HISTORY_RECENCY_DECAY, rank) * age;
    }, 0);
}
/** The newest turn on a relationship's record: the only clock a bare relationship carries. */
function newestRecordedTurn(relationship) {
    return relationship.history.reduce((latest, event) => Math.max(latest, event.turn), 0);
}
const COERCIVE_DEED_FAMILIES = ["diplomatic", "economic", "military"];
const DEED_BANDS = ["low", "mid", "high"];
// How much of one country's reading of another a single landed act at the top
// of the ladder is worth. Set against the grudge channel's own ceiling — a
// visible failure can subtract at most 0.25 here — so that succeeding at
// coercion is felt somewhat less than being caught failing at it, which is
// the honest ordering: a sanction that worked is a policy, a covert operation
// that was caught is a humiliation.
const DEED_HIGH_WATER = 0.1;
// What each instrument does to a government's reading of whoever used it,
// which is not the same question as how coercive the instrument reads on the
// ladder and is not a copy of that scale. Severing relations is a formal act
// between states and is treated as one; money and force reach past the
// foreign ministry into what a country can buy and whether it is safe.
const DEED_FAMILY_WEIGHT = {
    diplomatic: 0.3,
    economic: 0.6,
    military: 1,
};
// Rungs 1-2, 3, and 4-5. A low-band act is a fifth of a top-of-ladder one
// rather than nothing, because the band is the only place the severity of the
// act survives into the flag and a warning shot is still a shot.
const DEED_BAND_WEIGHT = { low: 0.2, mid: 0.55, high: 1 };
// The most any accumulated record of landed coercion can subtract. A deed
// flag never expires, so without a floor a long campaign of ordinary
// statecraft would drive every counterpart to the bottom of the scale and
// leave the reading with nothing left to say. Set just under the grudge
// channel's ceiling: what has been done to a country over a whole term should
// weigh about as much as one live grievance, not more.
const DEED_PRESSURE_FLOOR = -0.2;
// The bound deed flag's grammar, as its writer builds it. Kept as a literal
// rather than imported for the cycle reason above; a test asserts this matches
// what the deed module itself produces, so a change there fails the build here.
function landedDeedFlag(nation, family, band) {
    return `deed-toward:${nation}:${family}:${band}:landed`;
}
/**
 * How much the landed coercion done to `relationship.from` weighs against
 * `relationship.to`, as a value at or below zero.
 *
 * `deed-toward:<X>` is the record of what this government did to X, and the
 * nation on a bound deed flag is always the counterparty — never this
 * government's own. So the only relationship this record can be charged
 * against is a counterpart's reading of the administration, which is exactly
 * the direction the NPC agent scores on. The mirror form, `deed-from:<X>`,
 * would answer the opposite question, what X did to this government, for the
 * administration's own reading of X. It is deliberately not read here: nothing
 * scores that direction, and a term nobody calls is a term that can drift out
 * of true unnoticed.
 */
export function deedPressure(flags, relationship, player) {
    if (relationship.to !== player || relationship.from === player)
        return 0;
    // Summed in the declared family and band order, never the flag set's write
    // order, so the same record reads to the same bytes on every replay.
    const weight = COERCIVE_DEED_FAMILIES.reduce((familySum, family) => familySum +
        DEED_BANDS.reduce((bandSum, band) => flags[landedDeedFlag(relationship.from, family, band)]
            ? bandSum + DEED_HIGH_WATER * DEED_FAMILY_WEIGHT[family] * DEED_BAND_WEIGHT[band]
            : bandSum, 0), 0);
    // Negating an empty sum yields -0, which is not the zero a caller comparing
    // against "nothing on the record" expects to get back.
    return weight === 0 ? 0 : Math.max(DEED_PRESSURE_FLOOR, -weight);
}
// --- Repeated pressure against the same target ---
// The one history kind, per instrument, that names an ordinary, repeatable
// act of that instrument rather than something already priced elsewhere or a
// state the ladder refuses to re-enter. Diplomatic rung 1 ("Private Warning",
// stamped "demarche") is the only rung on any of the five ladders whose
// resolve() writes to relationship.history unconditionally on an ordinary
// success that can happen any number of times. Rung 5 ("Sever Relations")
// also stamps a kind ("severance") but is gated by notAlreadyStanding, so it
// can never be the second of a pair — repeating it is refused before
// resolve() runs. Assistance's "relief" and "guarantee" are cooperative, not
// a coercive act this term is for, and are already classified by
// historyPressure above; counting them here would price the same act twice.
// Economic, covert and military currently write nothing to relationship.history
// on an ordinary success at all — a coverage gap in what those ladders record,
// not a decision this function makes — so this term is a no-op for those three
// instruments today: repeatDrag returns 0 for them regardless of how many
// times the same instrument has landed, because there is nothing on file yet
// to call a repeat. This map is deliberately sparse, not incomplete by
// oversight — do not "complete" it by pointing an economic/covert/military
// instrument at some other kind already in play there (a "consequence" tag,
// a deed flag, a failed-* record); every one of those is already priced by
// historyPressure, grudgeWeight or deedPressure, and reusing it here is
// exactly the double-counted fifth memory term this map exists to avoid.
// To opt an instrument in for real: have that ladder's rung(s) stamp a new,
// instrument-specific kind on relationship.history unconditionally on an
// ordinary success (see instruments.ts:196's "demarche" for the pattern),
// confirm classifyHistoryEvent above does not classify that kind, then name
// it here. A test mirrors this map against instruments.ts's own grammar so
// the two cannot drift apart.
const REPEAT_ACT_KINDS = {
    diplomatic: "demarche",
};
// How many turns back a repeat of the same instrument still reads as the
// same pressure campaign rather than an unrelated new approach raised months
// apart. A turn is a week; eight turns is two months — long enough that a
// second démarche inside the window reads as sustained pressure on the same
// question, short enough that a démarche raised again next quarter is its
// own new approach rather than a continuation of the last one.
const REPEAT_LOOKBACK_TURNS = 8;
// How much harder to move a target gets for each prior instance of the same
// instrument landed on it inside the window. A government warned once treats
// the second warning as more of the same and starts discounting it; this is
// that discounting, priced as added resistance rather than as a separate
// emotional reaction — which is why it lives beside resistance() rather than
// inside disposition(): disposition is how favorably a government reads a
// counterpart, and a repeated démarche from a country it still trusts fine is
// not read as betrayal, only as an approach that no longer moves it as easily.
const REPEAT_DRAG_STEP = 0.06;
// The most repetition alone can stiffen a target by. Set well under 1 so a
// long campaign of the same démarche still meets a target that can, in
// principle, eventually be moved by leverage elsewhere in the contest, rather
// than one that habituation alone has made permanently unreachable.
const REPEAT_DRAG_CEILING = 0.3;
/**
 * How much harder `target` is to move with `instrument` because `actor` has
 * already used that same instrument on it recently. Reads the acting
 * direction's own history (`actor` -> `target`), which is where an ordinary
 * successful act of `actor`'s is stamped — the same direction
 * `historyPressure` reads, and disjoint from it by kind (see
 * `REPEAT_ACT_KINDS`): an instrument's repeat kind is never one
 * `historyPressure` classifies, so a repeated act is never charged against
 * both terms.
 *
 * Zero for a first attempt (nothing on file yet to call a repeat) and for
 * every instrument `REPEAT_ACT_KINDS` does not yet name, which is the honest
 * answer when the ladder itself has not written anything to check against.
 *
 * This is deliberately not a term on `disposition()`: it prices how
 * habituated a target has become to one specific approach, not how favorably
 * it reads the actor overall, and the resistance a repeated démarche meets is
 * a property of the démarche, not of the relationship's standing sense of the
 * other government.
 */
export function repeatDrag(campaign, actor, target, instrument) {
    const kind = REPEAT_ACT_KINDS[instrument];
    if (!kind)
        return 0;
    const relationship = selectRelationship(campaign, actor, target);
    if (!relationship)
        return 0;
    const priorCount = relationship.history.filter((event) => event.kind === kind && campaign.turn - event.turn <= REPEAT_LOOKBACK_TURNS).length;
    return Math.min(REPEAT_DRAG_CEILING, priorCount * REPEAT_DRAG_STEP);
}
// A minimal, decision-relevant disposition score: how favorably `from`
// currently reads `to`, folding in trust, tension, outstanding grudges, the
// remembered pattern of what each has actually done to the other, and the
// coercion `to` has successfully landed on `from`.
// A future, fuller NPC utility agent will consume relationships more richly;
// this is the smallest read that proves a grudge and a remembered act
// measurably shape a decision, not the decision logic itself.
//
// The campaign is optional because the deed record lives in the player's flag
// set rather than on the relationship, and a caller that only has the
// relationship in hand still gets every term that is derivable from it. Such a
// caller has no calendar either, so the record is read as of its own newest
// entry.
export function disposition(relationship, campaign) {
    const deeds = campaign ? deedPressure(campaign.player.flags, relationship, campaign.founding.nation) : 0;
    const now = campaign?.turn ?? newestRecordedTurn(relationship);
    const raw = relationship.trust -
        relationship.tension -
        grudgeWeight(relationship) * 0.5 +
        historyPressure(relationship, now) +
        deeds;
    return Math.max(-1, Math.min(1, raw));
}
export function bothDirections(campaign, a, b) {
    return { aToB: selectRelationship(campaign, a, b), bToA: selectRelationship(campaign, b, a) };
}
// What a treaty in force does to the pair, restated from the treaty module's
// terms for the cycle reason at the head of this file; a test pins each value
// to `TREATY_TERMS`. The full effect, because a treaty in force is the
// relationship it describes for as long as it stands.
const TREATY_STANDING = {
    alliance: { trust: 0.18, tension: -0.12 },
    trade: { trust: 0.1, tension: -0.06 },
    "arms-control": { trust: 0.12, tension: -0.2 },
    "executive-agreement": { trust: 0.06, tension: -0.04 },
};
const TREATY_IN_FORCE = new Set(["ratified", "in-force-by-signature"]);
/** Planning value: a standing breach of relations, at the severance rung's own unjittered size. */
const SEVERANCE_STANDING = { trust: -0.3, tension: 0.3, militaryThreat: 0 };
const SEVERED_FLAG_PREFIX = "severed-relations:";
/** Planning value: a war being fought, at the size a government joining one writes against its enemy. */
const WAR_STANDING = { trust: -0.3, tension: 0.35, militaryThreat: 0.3 };
/** Planning value: what a war leaves between the two sides once either is out of it. */
const WAR_SCAR = { trust: -0.1, tension: 0.05, militaryThreat: 0.05 };
function pushShift(index, from, to, shift) {
    const key = relationshipKey(from, to);
    index.set(key, [...(index.get(key) ?? []), shift]);
}
function treatyShifts(campaign, index) {
    const player = campaign.founding.nation;
    for (const record of Object.values(campaign.treaties ?? {})) {
        if (!TREATY_IN_FORCE.has(record.status))
            continue;
        const shift = { cause: `treaty:${record.id}`, ...TREATY_STANDING[record.kind], militaryThreat: 0 };
        pushShift(index, player, record.counterpart, shift);
        pushShift(index, record.counterpart, player, shift);
    }
}
function severanceShifts(campaign, index) {
    for (const [flag, on] of Object.entries(campaign.player.flags)) {
        if (!on || !flag.startsWith(SEVERED_FLAG_PREFIX))
            continue;
        const [from, to] = flag.slice(SEVERED_FLAG_PREFIX.length).split(":");
        pushShift(index, from, to, { cause: "severance", ...SEVERANCE_STANDING });
    }
}
// A war the board carried into the oath is already in the founding reading
// between its two principals, because the sourced dyads record the hostility it
// stands for, and a carried war opens with nobody joined. So only that one pair
// is passed over: a government that enters a carried war later makes a new
// enemy, and that pairing is added like any war begun on this watch.
function warShifts(campaign, index) {
    for (const conflict of Object.values(campaign.conflicts ?? {})) {
        const left = new Set(conflict.left ?? []);
        const aggressors = [conflict.aggressor, ...conflict.joined.aggressor];
        const defenders = [conflict.defender, ...conflict.joined.defender];
        for (const a of aggressors) {
            for (const d of defenders) {
                if (conflict.inherited && a === conflict.aggressor && d === conflict.defender)
                    continue;
                const fighting = conflict.status === "active" && !left.has(a) && !left.has(d);
                const shift = { cause: `war:${conflict.id}`, ...(fighting ? WAR_STANDING : WAR_SCAR) };
                pushShift(index, a, d, shift);
                pushShift(index, d, a, shift);
            }
        }
    }
}
// Floating-point addition is not associative, so the causes on a pair are put
// in one total order before anything sums them: two campaigns holding the same
// records written in a different order must settle to the same bytes.
function compareShifts(a, b) {
    if (a.cause !== b.cause)
        return a.cause < b.cause ? -1 : 1;
    return a.trust - b.trust || a.tension - b.tension || a.militaryThreat - b.militaryThreat;
}
function buildDurableIndex(campaign) {
    const index = new Map();
    treatyShifts(campaign, index);
    severanceShifts(campaign, index);
    warShifts(campaign, index);
    return new Map([...index].map(([key, shifts]) => [key, [...shifts].sort(compareShifts)]));
}
// Read once per campaign state: every phase that settles a reading toward its
// anchor reads the same records, and the state is never mutated in place.
const durableCache = new WeakMap();
function durableIndexOf(campaign) {
    const cached = durableCache.get(campaign);
    if (cached)
        return cached;
    const index = buildDurableIndex(campaign);
    durableCache.set(campaign, index);
    return index;
}
/** Every durable cause standing between `from` and `to`, as `from` reads `to`, in their summing order. */
export function durableShifts(campaign, from, to) {
    return durableIndexOf(campaign).get(relationshipKey(from, to)) ?? [];
}
const clampTrust = (v) => Math.max(-1, Math.min(1, v));
const clampTension = (v) => Math.max(0, Math.min(1, v));
function anchorFrom(campaign, relationship, durable) {
    const from = campaign.nations[relationship.from];
    const to = campaign.nations[relationship.to];
    if (!from || !to)
        return undefined;
    const structural = structuralReading(from, to, campaign.founding.nation);
    return {
        trust: clampTrust(durable.reduce((sum, shift) => sum + shift.trust, structural.trust)),
        tension: clampTension(durable.reduce((sum, shift) => sum + shift.tension, structural.tension)),
        militaryThreat: clampTension(durable.reduce((sum, shift) => sum + shift.militaryThreat, structural.militaryThreat)),
    };
}
/** Where this relationship's trust, tension and threat settle once every favor and slight has faded. */
export function relationshipAnchor(campaign, relationship) {
    return anchorFrom(campaign, relationship, durableShifts(campaign, relationship.from, relationship.to));
}
// --- Standing pressures ---
//
// A pressure that holds for weeks — a compact fracturing around its members, a
// war the world is watching — presses a reading toward a level below where the
// pair stands, rather than taking a fixed step off it every week. It closes on
// that level at the build half-life while the pressure lasts, never moves the
// reading back up, and once the pressure ends the memory phase repairs it at the
// grievance half-life like any other injury. A flat weekly step had no level:
// a fracture that ran for a year took half a point off every bystander pair,
// and two years drove a quiet world from about 140 hostile pairs to about 700.
/** Planning value: days for a standing pressure to close half the distance to the level it holds a reading at. */
export const PRESSURE_BUILD_HALF_LIFE_DAYS = 28;
/** One week of a standing pressure: toward `level`, never back the other way. */
export function pressDown(current, level) {
    return current > level ? approach(current, level, DAYS_PER_WEEK, PRESSURE_BUILD_HALF_LIFE_DAYS) || 0 : current;
}
/** The same, for a reading a pressure raises. */
export function pressUp(current, level) {
    return current < level ? approach(current, level, DAYS_PER_WEEK, PRESSURE_BUILD_HALF_LIFE_DAYS) || 0 : current;
}
/**
 * The trust a standing pressure holds `relationship` at: `drop` below where
 * the pair stands. Undefined where either nation has no record to stand on.
 */
export function pressedTrustLevel(campaign, relationship, drop) {
    const anchor = relationshipAnchor(campaign, relationship);
    return anchor ? clampTrust(anchor.trust - drop) : undefined;
}
/** The threat a standing pressure holds `relationship` at: `rise` above what the two records give. */
export function pressedThreatLevel(campaign, relationship, rise) {
    const from = campaign.nations[relationship.from];
    const to = campaign.nations[relationship.to];
    if (!from || !to)
        return undefined;
    return Math.min(1, structuralReading(from, to, campaign.founding.nation).militaryThreat + rise);
}
// --- The weekly memory phase ---
// Close enough to the standing reading to stop moving: below this the weekly
// step is smaller than any reading a player or a decision can tell apart, and
// stopping keeps a settled pair off the week's packet.
const SETTLED = 0.0005;
function settle(current, target, halfLifeDays) {
    const next = approach(current, target, DAYS_PER_WEEK, halfLifeDays);
    return Math.abs(next - target) < SETTLED ? target : next || 0;
}
// A reading above where the pair settles is a favor and fades at the favor
// half-life; one below is an injury and recovers at the grievance half-life of
// the government doing the reading. Tension and threat run the other way
// round: a fear a war raised fades as slowly as the grievance it came with.
function settledReading(campaign, relationship, anchor) {
    const grievance = grievanceHalfLifeDays(campaign.nations[relationship.from]?.traits.vengefulness ?? 0.5);
    const fadeOf = (aboveIsInjury) => (aboveIsInjury ? grievance : FAVOR_HALF_LIFE_DAYS);
    return {
        trust: settle(relationship.trust, anchor.trust, relationship.trust > anchor.trust ? FAVOR_HALF_LIFE_DAYS : grievance),
        tension: settle(relationship.tension, anchor.tension, fadeOf(relationship.tension > anchor.tension)),
        militaryThreat: settle(relationship.militaryThreat, anchor.militaryThreat, fadeOf(relationship.militaryThreat > anchor.militaryThreat)),
    };
}
// A grievance created this week is passed over. Decay runs after the phases
// that plant grudges, so without the guard a betrayal would be forgiven its
// first tick in the very week it was committed.
function agedGrudges(relationship, turn) {
    if (relationship.grudges.length === 0)
        return undefined;
    const aged = relationship.grudges.flatMap((grudge) => {
        if (grudge.createdTurn === turn)
            return [grudge];
        const next = ageGrudge(grudge, DAYS_PER_WEEK);
        return next ? [next] : [];
    });
    const changed = aged.length !== relationship.grudges.length || aged.some((g, i) => g !== relationship.grudges[i]);
    return changed ? aged : undefined;
}
function agedRelationship(campaign, relationship, durable) {
    const grudges = agedGrudges(relationship, campaign.turn);
    const anchor = anchorFrom(campaign, relationship, durable.get(relationshipKey(relationship.from, relationship.to)) ?? []);
    const reading = anchor ? settledReading(campaign, relationship, anchor) : undefined;
    const moved = reading !== undefined &&
        (reading.trust !== relationship.trust || reading.tension !== relationship.tension || reading.militaryThreat !== relationship.militaryThreat);
    if (!grudges && !moved)
        return undefined;
    return {
        kind: "relationship",
        from: relationship.from,
        to: relationship.to,
        ...(moved ? { set: reading } : {}),
        ...(grudges ? { replaceGrudges: grudges } : {}),
    };
}
/**
 * A turn phase: one week of memory on every relationship. Grudges fade toward
 * their cause's floor, and trust, tension and threat settle toward the pair's standing
 * reading, a favor faster than an injury. One packet for the whole graph,
 * because this is the world's weekly bookkeeping rather than an act, and a
 * packet per pair would put thousands of ledger lines a week on the record.
 */
export const grudgeDecayPhase = (state) => {
    const durable = durableIndexOf(state);
    const effects = Object.keys(state.relationships)
        .sort()
        .flatMap((key) => {
        const effect = agedRelationship(state, state.relationships[key], durable);
        return effect ? [effect] : [];
    });
    if (effects.length === 0)
        return [];
    const entities = [...new Set(effects.flatMap((effect) => [effect.from, effect.to]))].sort();
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            background: true,
            narration: { summary: "Old favors and grievances between governments fade with time." },
            effects,
            provenance: { origin: "world", entities, systems: ["relations"] },
        },
    ];
};
