import { formatGameDate, selectDateOfTurn } from "./clock.js";
import { actOf } from "./legislative-acts.js";
import { usOutlays, usPosition, usRevenueTotal } from "./national-books.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { selectLaws } from "./state.js";
/**
 * What the United States owes its own trust funds against what it owes the
 * public: 7.72 trillion of 40.10 trillion total public debt on 2026-09-22
 * (Treasury, Debt to the Penny), carried in the dataset's own units.
 */
const INTRAGOVERNMENTAL_SHARE = 7.72 / (40.1 - 7.72);
/** How much room the limit has when a President takes office: a year and a half of the inherited deficit. */
const HEADROOM_YEARS = 1.5;
/** Extraordinary measures last about half a year of the deficit running when the limit is reached. */
const MEASURES_WEEKS = 26;
/** A lift passed this close to the X-date, or after it, still counts against the rating as a brush with default. */
const BRINK_WEEKS = 4;
/** How long the agencies remember one. */
const GOVERNANCE_MEMORY_WEEKS = 104;
/** The week's balance as the statement stands, before any payment is withheld: revenue less outlays, a year's rate. */
export function usUnprioritizedBalance(campaign, position) {
    const outlays = Object.values(usOutlays(campaign, position)).reduce((total, value) => total + value, 0);
    return usRevenueTotal(campaign, position) - outlays;
}
/** Weeks until the week's borrowing reaches the limit; a government not borrowing is a year away from it. */
function weeksUntil(room, weeklyBorrowing) {
    if (weeklyBorrowing <= 0)
        return TURNS_PER_YEAR;
    return Math.max(0, Math.floor(room / weeklyBorrowing));
}
/** What the limit counts against the United States: debt held by the public plus its trust funds, less any measures in use. */
export function subjectToLimit(state, debt) {
    return debt + (state.intragovernmental ?? 0) - (state.measuresUsed ?? 0);
}
/** The limit record as the week reads it: one kept before the trust funds were counted is reopened, as a save that predates it would be. */
export function limitRecord(campaign) {
    const kept = campaign.debtLimit;
    return kept?.intragovernmental !== undefined ? kept : openingDebtLimit(campaign);
}
/**
 * The ceiling, derived from the laws on the books: the base the President took
 * office under plus what each enacted lift added. A lift is valued at the
 * output of the week it was enacted, and one that has not reached the books'
 * weekly accounting yet is valued at today's; a lift whose law is gone takes
 * its room with it.
 */
export function limitCeiling(campaign, state, output) {
    return selectLaws(campaign).reduce((total, bill) => {
        const share = actOf(bill)?.borrowingCeilingOfGdp;
        if (share === undefined)
            return total;
        return total + (state.lifts[bill.id] ?? share * output);
    }, state.base);
}
/**
 * The limit as the country stands: a year and a half of the deficit it runs
 * above what it already owes, with every lift already enacted counted inside
 * that room rather than on top of it, so a save that predates the record opens
 * with the headroom a President walks in with rather than none.
 */
export function openingDebtLimit(campaign) {
    const position = usPosition(campaign);
    if (!position)
        return { base: 0, lifts: {}, intragovernmental: 0, measuresUsed: 0, arrears: 0, headroomWeeks: TURNS_PER_YEAR };
    const intragovernmental = Math.round(position.debt * INTRAGOVERNMENTAL_SHARE);
    const deficit = Math.max(0, -usUnprioritizedBalance(campaign, position));
    const room = HEADROOM_YEARS * deficit;
    const lifts = Object.fromEntries(selectLaws(campaign)
        .filter((bill) => actOf(bill)?.borrowingCeilingOfGdp !== undefined)
        .map((bill) => [bill.id, 0]));
    return {
        base: Math.round(position.debt + intragovernmental + room),
        lifts,
        intragovernmental,
        measuresUsed: 0,
        arrears: 0,
        headroomWeeks: weeksUntil(room, deficit / TURNS_PER_YEAR) + MEASURES_WEEKS,
    };
}
/** Weeks of room left once the week is booked: to the limit and through the measures, through what is left of them, or none. */
function headroomAfter(state, ceiling, booked) {
    if (state.xDateTurn !== undefined)
        return 0;
    if (state.bindingSince !== undefined)
        return weeksUntil(state.measuresLeft ?? 0, booked.borrowing);
    return weeksUntil(ceiling - subjectToLimit(state, booked.debt), booked.borrowing) + MEASURES_WEEKS;
}
export function openLimitWeek(campaign, state, position, weeklyBorrowing) {
    const lifts = {};
    let added = 0;
    for (const bill of selectLaws(campaign)) {
        const share = actOf(bill)?.borrowingCeilingOfGdp;
        if (share === undefined)
            continue;
        const recorded = state.lifts[bill.id];
        lifts[bill.id] = recorded ?? Math.round(share * position.output);
        if (recorded === undefined)
            added += lifts[bill.id];
    }
    const recorded = { ...state, lifts };
    const ceiling = limitCeiling(campaign, recorded, position.output);
    const restored = { ...recorded, measuresUsed: 0 };
    if (state.bindingSince === undefined || subjectToLimit(restored, position.debt) >= ceiling) {
        return { state: recorded, ceiling, arrearsPaid: 0, events: added > 0 ? [{ kind: "lifted", by: added, arrearsPaid: 0 }] : [] };
    }
    const brink = projectedXDate(state, campaign.turn, weeklyBorrowing) <= campaign.turn + BRINK_WEEKS;
    const { bindingSince: _since, measuresLeft: _left, xDateTurn: _x, ...unbound } = restored;
    return {
        state: {
            ...unbound,
            arrears: 0,
            ...(brink ? { governanceUntil: campaign.turn + GOVERNANCE_MEMORY_WEEKS } : state.governanceUntil !== undefined ? { governanceUntil: state.governanceUntil } : {}),
        },
        ceiling,
        arrearsPaid: state.arrears,
        events: [{ kind: "lifted", by: added, arrearsPaid: state.arrears }],
    };
}
/** The turn the measures run out at this week's borrowing, or the turn they did. */
function projectedXDate(state, turn, weeklyBorrowing) {
    if (state.xDateTurn !== undefined)
        return state.xDateTurn;
    if (state.bindingSince === undefined || state.measuresLeft === undefined || weeklyBorrowing <= 0)
        return Number.POSITIVE_INFINITY;
    return turn + Math.floor(Math.max(0, state.measuresLeft) / weeklyBorrowing);
}
/** Whether this week's borrowing can be covered: false from the week the measures cannot, until a lift. */
export function mustWithhold(state, weeklyBorrowing) {
    if (state.bindingSince === undefined)
        return false;
    return state.xDateTurn !== undefined || (state.measuresLeft ?? 0) < weeklyBorrowing;
}
/**
 * The limit after the week is booked. A limit reached this week binds and the
 * measures begin; a binding limit draws the week's borrowing from the measures;
 * a week that could not be covered sets the X-date and adds what was withheld
 * to the arrears.
 */
export function closeLimitWeek(campaign, opening, booked) {
    const turn = campaign.turn;
    let state = opening.state;
    const events = [...opening.events];
    if (booked.withheld > 0) {
        const arrived = state.xDateTurn === undefined;
        state = {
            ...state,
            arrears: state.arrears + booked.withheld,
            xDateTurn: state.xDateTurn ?? turn,
            governanceUntil: arrived ? turn + GOVERNANCE_MEMORY_WEEKS : (state.governanceUntil ?? turn + GOVERNANCE_MEMORY_WEEKS),
        };
        if (arrived)
            events.push({ kind: "x-date" });
        events.push({ kind: "withheld", amount: booked.withheld });
    }
    else if (state.bindingSince !== undefined) {
        state = { ...state, measuresUsed: (state.measuresUsed ?? 0) + booked.borrowing, measuresLeft: (state.measuresLeft ?? 0) - booked.borrowing };
    }
    else if (subjectToLimit(state, booked.debt) > opening.ceiling) {
        const over = subjectToLimit(state, booked.debt) - opening.ceiling;
        const measures = MEASURES_WEEKS * booked.borrowing;
        state = { ...state, bindingSince: turn, measuresUsed: over, measuresLeft: measures - over };
        events.push({ kind: "binds", xDateTurn: turn + Math.floor((measures - over) / Math.max(1, booked.borrowing)) });
    }
    return { state: { ...state, headroomWeeks: headroomAfter(state, opening.ceiling, booked) }, events };
}
export function selectDebtLimit(campaign) {
    const position = usPosition(campaign);
    const state = limitRecord(campaign);
    if (!position)
        return { ceiling: 0, subjectToLimit: 0, headroomWeeks: state.headroomWeeks, binding: false, prioritizing: false, arrears: 0 };
    const weeklyBorrowing = Math.max(0, -usUnprioritizedBalance(campaign, position)) / TURNS_PER_YEAR;
    const binding = state.bindingSince !== undefined;
    const xDate = binding ? projectedXDate(state, campaign.turn + 1, weeklyBorrowing) : undefined;
    return {
        ceiling: limitCeiling(campaign, state, position.output),
        subjectToLimit: subjectToLimit(state, position.debt),
        headroomWeeks: state.headroomWeeks,
        binding,
        ...(xDate !== undefined && Number.isFinite(xDate) ? { xDateTurn: xDate } : {}),
        prioritizing: binding && state.xDateTurn !== undefined,
        arrears: state.arrears,
    };
}
/** The notch the agencies take off for a recent brush with default at the limit. */
export function governanceNotch(state, turn) {
    return state?.governanceUntil !== undefined && turn < state.governanceUntil ? 1 : 0;
}
const LAPSE_OF_PAYMENT_STABILITY = -0.04;
const millions = (value) => Math.round(value).toLocaleString("en-US");
function limitSentence(campaign, event) {
    switch (event.kind) {
        case "lifted":
            return event.arrearsPaid > 0
                ? `The debt limit is raised by ${millions(event.by)} million, and the Treasury pays the ${millions(event.arrearsPaid)} million it held back.`
                : `The debt limit is raised by ${millions(event.by)} million.`;
        case "binds":
            return `The United States reaches its debt limit. The Treasury begins extraordinary measures, which it expects to run out around ${formatGameDate(selectDateOfTurn(campaign, event.xDateTurn))}.`;
        case "x-date":
            return "The Treasury has run out of room under the debt limit. It pays the interest on the debt in full and holds back whatever the week's receipts cannot cover.";
        case "withheld":
            return `The Treasury holds back ${millions(event.amount)} million of payments this week to stay under the debt limit.`;
    }
}
/**
 * What the limit did this week, as one entry on the Record. A week of withheld
 * payments costs order the way a lapse in appropriations does, because it is
 * the same experience for everyone waiting on a check.
 */
export function limitEntry(campaign, events) {
    if (events.length === 0)
        return undefined;
    const summary = events.map((event) => limitSentence(campaign, event)).join(" ");
    const withheld = events.some((event) => event.kind === "withheld");
    const reported = events.filter((event) => event.kind !== "withheld");
    const effects = [
        ...(withheld ? [{ kind: "metric", deltas: { stability: LAPSE_OF_PAYMENT_STABILITY } }] : []),
        ...(reported.length > 0
            ? [{ kind: "feed", items: reported.map((event) => ({ turn: campaign.turn + 1, kind: "governance", visibility: "public", headline: limitSentence(campaign, event), actor: campaign.founding.nation })) }]
            : []),
    ];
    return { summary, effects };
}
