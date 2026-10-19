import { selectRelationship } from "./state.js";
import { selectNation } from "./state-selectors.js";
// Relationships are directed: how United States reads a neighbor need not match
// how that neighbor reads United States. Grudges are how a cheap
// betrayal stays expensive: each carries the cause, its starting weight, the
// turn it was created, and a decay rate set by the aggrieved party's
// vengefulness, so a vengeful nation forgives slower than a forgiving one.
const BASE_GRUDGE_DECAY = 0.12;
const MIN_GRUDGE_DECAY = 0.02;
// Higher vengefulness -> slower decay. A maximally vengeful nation (1.0)
// decays at MIN_GRUDGE_DECAY; a maximally forgiving one (0.0) decays at
// BASE_GRUDGE_DECAY.
export function grudgeDecayRate(vengefulness) {
    const rate = BASE_GRUDGE_DECAY * (1 - vengefulness);
    return Math.max(MIN_GRUDGE_DECAY, rate);
}
export function createGrudge(cause, weight, createdTurn, vengefulness) {
    return { cause, weight, createdTurn, decayRate: grudgeDecayRate(vengefulness) };
}
function decayOneGrudge(grudge) {
    return { ...grudge, weight: Math.max(0, grudge.weight - grudge.decayRate) };
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
// "what has this counterpart generally done" signal that survives long after
// any one grudge has decayed to nothing.
export function historyPressure(relationship) {
    const classified = relationship.history
        .map((event) => ({ turn: event.turn, sign: classifyHistoryEvent(event.kind) }))
        .filter((event) => event.sign !== 0)
        .sort((a, b) => b.turn - a.turn)
        .slice(0, HISTORY_TRACK_LIMIT);
    return classified.reduce((sum, event, rank) => sum + event.sign * HISTORY_RECENCY_BASE * Math.pow(HISTORY_RECENCY_DECAY, rank), 0);
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
// relationship in hand still gets every term that is derivable from it.
export function disposition(relationship, campaign) {
    const deeds = campaign ? deedPressure(campaign.player.flags, relationship, campaign.founding.nation) : 0;
    const raw = relationship.trust -
        relationship.tension -
        grudgeWeight(relationship) * 0.5 +
        historyPressure(relationship) +
        deeds;
    return Math.max(-1, Math.min(1, raw));
}
export function bothDirections(campaign, a, b) {
    return { aToB: selectRelationship(campaign, a, b), bToA: selectRelationship(campaign, b, a) };
}
// The ledger is read by a player, who knows Lithuania and not LTU.
const nameOf = (state, id) => selectNation(state, id)?.base.identity.name ?? id;
// A turn phase: decay every relationship's grudges by one tick, dropping any
// that have decayed to zero weight. Produces one packet per relationship
// whose grudges actually changed, each with narration, so every state change
// remains attributable — the player-facing "why" is derivable from state
// rather than guessed.
//
// A grievance created this week is passed over. Decay runs after the phases
// that plant grudges, so without the guard a betrayal would be forgiven its
// first tick in the very week it was committed. Nobody starts forgetting an
// injury while it is still happening: time only runs on a grudge once the week
// that made it has closed.
export const grudgeDecayPhase = (state) => {
    const packets = [];
    for (const [key, relationship] of Object.entries(state.relationships)) {
        if (relationship.grudges.length === 0)
            continue;
        const decayed = relationship.grudges
            .map((grudge) => (grudge.createdTurn === state.turn ? grudge : decayOneGrudge(grudge)))
            .filter((g) => g.weight > 0);
        const changed = decayed.length !== relationship.grudges.length ||
            decayed.some((g, i) => g.weight !== relationship.grudges[i].weight);
        if (!changed)
            continue;
        const effect = {
            kind: "relationship",
            from: relationship.from,
            to: relationship.to,
            replaceGrudges: decayed,
        };
        packets.push({
            source: "simulate",
            actor: "world",
            turn: state.turn,
            narration: { summary: `Old grievances between ${nameOf(state, relationship.from)} and ${nameOf(state, relationship.to)} fade with time.` },
            effects: [effect],
            provenance: { origin: "world", entities: [relationship.from, relationship.to], systems: ["relations"] },
        });
        void key; // key is derivable from relationship.from/to; kept for iteration clarity only
    }
    return packets;
};
