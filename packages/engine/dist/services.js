import { CLEARANCE_PER_ARRIVAL, institutionDef } from "./institutions.js";
import { selectWorkDelivery } from "./executive-work.js";
import { selectChairRunner } from "./appointments.js";
import { SERVICES } from "./service-catalog.js";
import { createRngStreams } from "./rng.js";
import { hasProspectiveOrderAuthority } from "./order-authority.js";
/** The oldest week kept separately; anything older waits in the last cohort. */
export const OLDEST_COHORT = 26;
/** Where each display band ends, in weeks: under 4, 4 to 13, 13 to 26, 26 and over. */
export const AGE_BUCKET_EDGES = [4, 13, 26];
export const WEEKLY_INTAKE = 100;
// A service that keeps up carries about a month of intake in hand.
const OPENING_WEEKS = 4;
// How often an owner gets a decision wrong at full delivery, and how much more
// often as its delivery falls.
const ERROR_FLOOR = 0.02;
const ERROR_RANGE = 0.2;
// A wrong decision comes back, on appeal or as a fresh filing, after a lag;
// not every one does.
const REWORK_SHARE = 0.5;
const REWORK_LAG_WEEKS = 8;
// Each week a small share of the cases waiting half a year or more is given up.
const WITHDRAWAL_RATE = 0.02;
// Above this share of late cases a Secretary feels the backlog, and the
// pressure rises to full when every case is late.
const PRESSURE_FLOOR = 0.2;
// At no integrity and full pressure, the building is pushed to refuse half a
// week's capacity again on top of its ordinary decisions, and most of those
// summary refusals are wrong.
const PRESSURE_REFUSAL_MAX = 0.5;
const PRESSURE_ERROR = 0.6;
const sum = (values) => values.reduce((total, value) => total + value, 0);
const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
/** A cohort array with the given weeks filled, for an opening or a test. */
export function cohorts(filled) {
    return Array.from({ length: OLDEST_COHORT + 1 }, (_, week) => filled[week] ?? 0);
}
export function pendingTotal(runtime) {
    return sum(runtime.pending);
}
/** Cases waiting by display band: under 4 weeks, 4 to 13, 13 to 26, 26 and over. */
export function ageBands(runtime) {
    const [a, b, c] = AGE_BUCKET_EDGES;
    const band = (from, to) => sum(runtime.pending.slice(from, to));
    return [band(0, a), band(a, b), band(b, c), band(c, OLDEST_COHORT + 1)];
}
/** Cases that have waited the service's standard or longer. */
export function lateCases(runtime, def) {
    return sum(runtime.pending.slice(def.standardWeeks));
}
export function lateShare(runtime, def) {
    const total = pendingTotal(runtime);
    return total === 0 ? 0 : lateCases(runtime, def) / total;
}
/** How hard a late backlog presses on whoever answers for it, 0..1. */
export function backlogPressure(runtime, def) {
    return clamp01((lateShare(runtime, def) - PRESSURE_FLOOR) / (1 - PRESSURE_FLOOR));
}
export function openingService(def, turn) {
    const inHand = Object.fromEntries(Array.from({ length: OPENING_WEEKS }, (_, week) => [week, WEEKLY_INTAKE]));
    return { id: def.id, openedTurn: turn, pending: cohorts(inHand), returning: new Array(REWORK_LAG_WEEKS).fill(0) };
}
/** A week older: every cohort moves up one, and the oldest keeps what it had. */
function aged(pending) {
    return pending.map((_, week) => (week === 0 ? 0 : week === OLDEST_COHORT ? pending[week - 1] + pending[week] : pending[week - 1]));
}
/** Take `amount` from the oldest cases first. */
function decideOldestFirst(pending, amount) {
    let left = amount;
    return [...pending]
        .reverse()
        .map((count) => {
        const taken = Math.min(count, left);
        left -= taken;
        return count - taken;
    })
        .reverse();
}
/**
 * One week of a service, as the runtime it leaves.
 *
 * Every case is counted once: what was waiting, plus what arrived and what
 * came back, less what was decided and what was withdrawn, is what waits
 * next week.
 */
export function serviceTick(runtime, def, delivery, leadership) {
    const rework = runtime.returning[0] ?? 0;
    const older = aged(runtime.pending);
    const intake = [WEEKLY_INTAKE + rework, ...older.slice(1)];
    const capacity = WEEKLY_INTAKE * CLEARANCE_PER_ARRIVAL * delivery.capacity;
    const pushed = def.shortcut && leadership ? capacity * PRESSURE_REFUSAL_MAX * (1 - leadership.integrity) * backlogPressure(runtime, def) : 0;
    const decided = Math.min(sum(intake), capacity + pushed);
    const ordinary = Math.min(decided, capacity);
    const pressured = decided - ordinary;
    const afterDecisions = decideOldestFirst(intake, decided);
    const withdrawn = afterDecisions[OLDEST_COHORT] * WITHDRAWAL_RATE;
    const pending = afterDecisions.map((count, week) => (week === OLDEST_COHORT ? count - withdrawn : count));
    const errorRate = ERROR_FLOOR + ERROR_RANGE * (1 - delivery.ownerQuality);
    const errors = ordinary * errorRate + pressured * PRESSURE_ERROR;
    const refused = def.shortcut?.kind === "refusal" ? ordinary * def.shortcut.share + pressured : 0;
    const returning = [...runtime.returning.slice(1), errors * REWORK_SHARE];
    return { ...runtime, pending, returning, last: { arrivals: WEEKLY_INTAKE, rework, decided, pressured, refused, errors, withdrawn } };
}
// --- The services -----------------------------------------------------------
export { SERVICES };
const SERVICE_BY_ID = new Map(SERVICES.map((def) => [def.id, def]));
export function serviceDefinition(id) {
    return SERVICE_BY_ID.get(id);
}
function leadershipFor(campaign, def) {
    if (!def.shortcut)
        return undefined;
    const runner = selectChairRunner(campaign, def.portfolio);
    return runner?.alive ? { integrity: runner.base.integrity } : undefined;
}
/** The department a service rolls up to: its owner if the owner is one, else the owner's parent. */
export function serviceDepartment(def) {
    const owner = institutionDef(def.work.owner);
    return owner?.kind === "department" || owner?.parent === undefined ? def.work.owner : owner.parent;
}
/**
 * The week of every service. A save from before services were tracked has
 * none; each opens this week on the same assumption a new campaign makes and
 * records from here, so no earlier week is invented.
 */
export const servicePhase = (state) => {
    const activeEntry = [...state.orders].reverse().find((record) => record.order === "order-entry-suspension"
        && record.subject?.kind === "entry-class" && hasProspectiveOrderAuthority(state, record.id));
    const services = SERVICES.map((def) => {
        const prior = state.services?.[def.id] ?? openingService(def, state.turn);
        const reconsideration = def.id === "fair-housing-complaints" && prior.housingComplaint?.status === "reconsideration-ordered";
        const wageRecovery = def.id === "wage-complaints" && prior.wageComplaint?.status === "recovery-ordered";
        const work = reconsideration || wageRecovery ? { ...prior, returning: prior.returning.map((count, index) => index === 0 ? count + 1 : count) } : prior;
        const next = serviceTick(work, def, selectWorkDelivery(state, def.work), leadershipFor(state, def));
        if (wageRecovery && prior.wageComplaint)
            return { ...next, wageComplaint: { ...prior.wageComplaint,
                    status: "recovered", recoveredTurn: state.turn } };
        if (def.id === "wage-complaints" && prior.wageComplaint?.status === "investigating"
            && state.turn > prior.wageComplaint.discoveredTurn) {
            const paid = createRngStreams(state.seed).stream("wage-employer-response", prior.wageComplaint.id).next() >= 0.55;
            return { ...next, wageComplaint: { ...prior.wageComplaint, employerResponse: paid ? "paid" : "refused",
                    responseTurn: state.turn, status: paid ? "settled" : "litigating" } };
        }
        if (def.id === "wage-complaints" && !prior.wageComplaint && next.last.arrivals >= 1
            && createRngStreams(state.seed).stream("wage-payroll-audit", state.turn).next() < 0.035) {
            // Forty-six hours at $20/hour calls for $800 straight-time plus $180 overtime; the timecard shows $920 paid.
            return { ...next, wageComplaint: { id: `wage-complaint:${state.turn}`, discoveredTurn: state.turn,
                    employer: "covered-private-employer", worker: "hourly-worker",
                    hours: 46, hourlyRate: 20, paid: 920, requiredPay: 980, goodFaithEvidence: "none-substantiated",
                    employerResponse: "pending", status: "investigating" } };
        }
        if (def.id === "fair-housing-complaints" && prior.housingComplaint?.status === "interim-protected") {
            return { ...next, housingComplaint: { ...prior.housingComplaint,
                    applicationDeadlineTurn: prior.housingComplaint.applicationDeadlineTurn + 1 } };
        }
        if (reconsideration && prior.housingComplaint) {
            return { ...next, housingComplaint: { ...prior.housingComplaint, status: "reconsidered",
                    reconsideredTurn: state.turn } };
        }
        if (def.id === "fair-housing-complaints" && !prior.housingComplaint && next.last.arrivals >= 1
            && createRngStreams(state.seed).stream("fair-housing-complaint", state.turn).next() < 0.035) {
            return { ...next, housingComplaint: { id: `housing-complaint:${state.turn}`, filedTurn: state.turn,
                    originalDeadlineTurn: state.turn + 7, applicationDeadlineTurn: state.turn + 7,
                    allegedPractice: "race-based-rental-denial", respondent: "housing-provider",
                    writtenCriterion: createRngStreams(state.seed).stream("fair-housing-response", state.turn).next() < 0.58
                        ? "race" : "neutral-capacity",
                    status: "pending" } };
        }
        if (def.id !== "consular-visas" || !activeEntry || next.last.decided < 1)
            return next;
        const alreadyRecorded = prior.entryRefusals?.some((entry) => entry.orderRecordId === activeEntry.id);
        if (alreadyRecorded || activeEntry.subject?.kind !== "entry-class")
            return next;
        return { ...next, last: { ...next.last, refused: next.last.refused + 1 },
            entryRefusals: [...(prior.entryRefusals ?? []), {
                    id: `visa:${activeEntry.id}`, orderRecordId: activeEntry.id, decidedTurn: state.turn,
                    application: "family-visa", nation: activeEntry.subject.nation,
                    ground: "entry-suspension"
                }] };
    });
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            provenance: { origin: "institution", systems: ["institutions"] },
            narration: { summary: "The departments work through the week's cases." },
            effects: [{ kind: "institution", services }],
        },
    ];
};
