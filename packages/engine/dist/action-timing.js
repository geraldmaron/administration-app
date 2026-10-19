import { supportProjection } from "./action-support.js";
import { forceProjectionCost } from "./geography.js";
import { stagingPoints } from "./staging.js";
import { instinctFor } from "./counsel-instinct.js";
import { INSTRUMENT_COERCION } from "./instrument-ids.js";
import { carryOutInstrument, delayedDays } from "./execution.js";
function baseDays(campaign, request) {
    const base = { diplomatic: [0, 0, 2, 5, 2], economic: [1, 2, 3, 5, 7], covert: [2, 5, 7, 10, 14], military: [2, 4, 5, 2, 14], assistance: [3, 5, 7, 10, 7] }[request.instrument][request.rung - 1];
    const actor = campaign.nations[request.actor];
    const target = campaign.nations[request.target];
    const reach = actor && target
        ? forceProjectionCost({ ...actor.base, stats: actor.stats }, { ...target.base, stats: target.stats }, stagingPoints(campaign, request.actor, request.target)).multiplier
        : 1;
    const operational = request.instrument === "military" || request.instrument === "assistance";
    return base === 0 ? 0 : Math.ceil(base * (operational ? Math.min(2, Math.max(1, reach)) : 1));
}
/** The room's own reading of whether this person wants this much force, put on a 0..1 fit scale. */
export function instrumentFit(person, instrument) {
    return (instinctFor(person, "instrument", INSTRUMENT_COERCION[instrument]) + 1) / 2;
}
/**
 * Planning assumptions at the simulation's day resolution, not a tactical
 * timetable. The chair's pace is part of the estimate rather than a surprise at
 * execution, so the clock the President reads before ordering is the one the
 * operation runs on.
 */
export function actionTiming(campaign, request) {
    const base = baseDays(campaign, request);
    const carry = carryOutInstrument(campaign, request, base, (person) => instrumentFit(person, request.instrument));
    const shift = delayedDays(carry, base);
    // An operation that takes any time at all still takes a day.
    const assessmentDays = request.instrument === "military" && request.rung === 4 && request.civilianProtection === "additional-assessment" ? 3 : 0;
    const staffDays = base === 0 ? 0 : Math.max(1, base + shift);
    const supportDays = supportProjection(campaign, request)?.delayDays ?? 0;
    const days = Math.max(staffDays, supportDays ? supportDays + 1 : 0) + assessmentDays;
    const pace = carry
        ? { days: staffDays - base, role: carry.role, person: carry.chair.base.id, decision: carry.decision }
        : undefined;
    return {
        days,
        label: days === 0 ? "Issued immediately" : `First operational report in about ${days} ${days === 1 ? "day" : "days"}`,
        basis: days === 0 ? "The communication is immediate; the other government's response is not guaranteed." : "A planning estimate for preparation, access and initial reporting. Conditions are checked again before execution; results and political reactions are not guaranteed.",
        ...(pace ? { pace } : {}),
    };
}
