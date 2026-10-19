import { IDEOLOGY_AXES } from "@admin/world";
import { EXECUTIVE_ORDERS } from "./orders.js";
/**
 * How far back a newsroom's argument with an administration runs.
 *
 * Sixteen weeks: long enough that a term's worth of orders is not read off the
 * last one signed, short enough that a paper is arguing with this month's
 * government rather than with the one that took office.
 */
export const PRESS_ACT_MEMORY_TURNS = 16;
/**
 * How far a desk's own reading of the substance can carry it off the shared
 * record. Larger than nothing and smaller than LEAN_WEIGHT (0.35): what a paper
 * was before this president still outweighs any one season of orders, but a
 * government that spends a term signing things one masthead hates is covered
 * accordingly.
 */
export const PRESS_BELIEF_WEIGHT = 0.4;
const clamp11 = (value) => Math.max(-1, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * How far a single decision can carry a masthead's reading, against an order's
 * authored alignment (0.1 to 0.35 across the catalogue).
 *
 * Smaller than the smallest order on purpose. A signature is a government
 * committing itself in writing; answering the week is what a government does
 * every week, and a term of consistent answers should add up to an argument
 * without any one of them reading as an executive order.
 */
export const DECISION_ACT_WEIGHT = 0.08;
/**
 * What reaching for each instrument says, at the top rung, before the weight
 * above.
 *
 * The ladder already ranks its five instruments by how coercive they are, on
 * the same 0..1 scale a nation's hostility is read on, and that ranking
 * centered on the middle of the scale *is* the nationalist/globalist reading of
 * a foreign act. A state that arrives with relief crates is doing the thing the
 * globalist masthead exists to approve of; a state that arrives with its army
 * is doing the thing the nationalist one does.
 *
 * Restated here rather than imported from `instruments.ts`. This module sits
 * inside that file's value-import cycle, and a second edge into it is exactly
 * the initialization failure its header warns about. The two are one fact and
 * are held to it by `press-beliefs.test.ts`, which imports both and fails if
 * the ordering ever disagrees.
 *
 * `economicLeftRight` is deliberately unread here. Sanctioning a capital says
 * nothing about what a government believes at home, and a newsroom that scored
 * it as though it did would be reading a foreign act as a domestic platform.
 * That axis reaches the desks through the order catalogue and through a reply's
 * own authored `pull`, which are the two places it is actually declared.
 */
const INSTRUMENT_STANCE = {
    assistance: { nationalistGlobalist: -0.9 },
    diplomatic: { nationalistGlobalist: -0.5 },
    economic: { nationalistGlobalist: 0 },
    // The two a president reaches for when they do not want to ask anyone first.
    // That is an authority claim whoever it is pointed at, and it is the one
    // domestic reading a foreign act honestly carries.
    covert: { nationalistGlobalist: 0.5, authLibertarian: 0.6 },
    military: { nationalistGlobalist: 1, authLibertarian: 0.3 },
};
/**
 * What each institutional cost says, before the weight above.
 *
 * The content layer's own vocabulary for what an act spent of the government's
 * capacity, declared on the reply and written straight onto the ledger entry.
 * Only the entries with an unambiguous reading are here: a strained civil
 * service or a spent legislative majority is a price, not a position, and
 * scoring one as a position would be the inference from prose this module
 * refuses.
 */
const INSTITUTIONAL_PULL = {
    "emergency-powers-invoked": { authLibertarian: 1 },
    "legal-authority-spent": { authLibertarian: 0.6 },
    "intelligence-source-burned": { authLibertarian: 0.3 },
    "forces-committed": { nationalistGlobalist: 0.5 },
    "alliance-credit-earned": { nationalistGlobalist: -0.8 },
    "alliance-credit-spent": { nationalistGlobalist: 0.5 },
};
function addPull(into, pull, scale = 1) {
    for (const axis of IDEOLOGY_AXES) {
        const value = pull[axis];
        if (value === undefined || value === 0)
            continue;
        into[axis] = (into[axis] ?? 0) + value * scale;
    }
}
/**
 * What one decision on the record said, in the space the outlets think in.
 *
 * A rung scales the instrument's reading because the ladder's rungs are
 * magnitudes of the same act: a demarche and a blockade are both economic
 * statecraft and only one of them is an argument about how a country should
 * stand in the world.
 */
function decisionPull(entry) {
    const totals = {};
    if (entry.commitment) {
        const stance = INSTRUMENT_STANCE[entry.commitment.instrument];
        addPull(totals, stance, (entry.commitment.rung / 5) * DECISION_ACT_WEIGHT);
    }
    for (const cost of entry.institutional ?? []) {
        addPull(totals, INSTITUTIONAL_PULL[cost] ?? {}, DECISION_ACT_WEIGHT);
    }
    return Object.fromEntries(Object.entries(totals).map(([axis, total]) => [axis, round3(total)]));
}
function orderActs(campaign) {
    return campaign.orders.flatMap((record) => {
        if (campaign.turn - record.turn > PRESS_ACT_MEMORY_TURNS)
            return [];
        const order = EXECUTIVE_ORDERS.find((entry) => entry.id === record.order);
        if (!order)
            return [];
        const totals = {};
        addPull(totals, order.alignment);
        return [{ turn: record.turn, name: order.name, kind: "order", pull: totals }];
    });
}
/**
 * The decisions in the window, off the one record that holds them.
 *
 * `causal.origin === "decision"` rather than `actor === "player"` alone: the
 * ledger's player half also carries what an agency executed on the
 * administration's behalf and what the calendar reached, and a masthead
 * arguing with a government is arguing with what the government chose.
 */
function decisionActs(campaign) {
    return campaign.ledger.flatMap((entry) => {
        if (entry.actor !== "player" || entry.causal?.origin !== "decision")
            return [];
        if (campaign.turn - entry.turn > PRESS_ACT_MEMORY_TURNS)
            return [];
        return [{ turn: entry.turn, name: entry.description, kind: "decision", pull: decisionPull(entry) }];
    });
}
/**
 * Everything this administration has done inside the press's memory, oldest
 * first, whether or not it said anything a masthead can read.
 *
 * Exported whole because the podium and the Desk's own wire need the record
 * itself rather than the fold of it — a president explaining the week has to
 * name the act, and an act with no alignment is still an act they took.
 */
export function presidentialActs(campaign) {
    return [...orderActs(campaign), ...decisionActs(campaign)].sort((a, b) => a.turn - b.turn);
}
/**
 * What this administration has been doing, in the space the outlets think in.
 *
 * Struck-down orders still count: the paper is reading what the government
 * tried to do, and a court undoing it is separately one of the six shared
 * drivers. Counting it twice in the same direction is the only way to get this
 * wrong, and the two terms are about different things.
 */
export function recentActPull(campaign) {
    const totals = {};
    let act;
    for (const entry of presidentialActs(campaign)) {
        // An act that said nothing is not named. A government that has only ever
        // done things with no reading still reads as silent rather than as
        // neutral, which is the distinction this whole module turns on.
        if (IDEOLOGY_AXES.every((axis) => (entry.pull[axis] ?? 0) === 0))
            continue;
        addPull(totals, entry.pull);
        if (!act || entry.turn >= act.turn)
            act = { name: entry.name, turn: entry.turn, kind: entry.kind };
    }
    const pull = Object.fromEntries(Object.entries(totals).map(([axis, total]) => [axis, clamp11(total)]));
    return act ? { pull, act } : { pull };
}
/**
 * How one masthead reads that pull. Signed: positive is "this is what we are
 * for", negative is "this is the thing we were founded to be against".
 *
 * The same fold `partyReading` uses, divided by the axis count for the reason
 * `alignmentAffinity` divides by its shared-axis count: it keeps the result in
 * −1..1 without a clamp ever having to bite, which is what lets the four
 * readings still sum to zero across the roster.
 */
export function outletReading(beliefs, pull) {
    const total = IDEOLOGY_AXES.reduce((sum, axis) => sum + beliefs[axis] * (pull[axis] ?? 0), 0);
    return clamp11(total / IDEOLOGY_AXES.length);
}
/** The same reading, rounded, for anything that prints or stores it. */
export function outletActReading(beliefs, pull) {
    return round3(outletReading(beliefs, pull));
}
