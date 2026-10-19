import { selectChairRunner } from "./appointments.js";
import { institutionDef } from "./institutions.js";
import { ministerSituation, OVERRULED_FULL } from "./minister-will.js";
import { axisLean } from "./person-disposition.js";
import { domainRole } from "./stewardship.js";
import { ideologyDistanceFromLean, orderDomainLean } from "./strike-odds.js";
import { stampOf, weigh } from "./willingness.js";
const DEFERENCE_WEIGHT = 0.6;
const FIT_WEIGHT = 0.4;
const OVERRULED_WEIGHT = 0.3;
const EXPOSURE_WEIGHT = 0.3;
const BOLDNESS_WEIGHT = 0.3;
const CARRY_THRESHOLD = 0;
/** How far under the bar a chair has to be to take the whole of the act's time again. */
const DELAY_SPAN = 0.3;
/** The most a bold Secretary takes off an operation's preparation. */
const MILITARY_SPEEDUP = 0.25;
/** A directive left this far behind is one the department is not moving on at all. */
export const SLOW_WALK_SHARE = 0.5;
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
/** The chair's terms, signed toward carrying the act out at pace. */
export function carryOutTerms(campaign, role, person, act) {
    const situation = ministerSituation(campaign, role, person);
    return [
        { key: "deference", source: "obligation", value: round4(DEFERENCE_WEIGHT * axisLean(person, "deference")) },
        ...(act.fit === undefined ? [] : [{ key: "policy-fit", source: "interest", value: round4(FIT_WEIGHT * (act.fit - 0.5)) }]),
        { key: "times-overruled", source: "situation", value: round4(-OVERRULED_WEIGHT * Math.min(1, situation.overruled / OVERRULED_FULL)) },
        { key: "department-exposure", source: "situation", value: round4(-EXPOSURE_WEIGHT * situation.exposure) },
        ...(act.military ? [{ key: "boldness", source: "trait", value: round4(BOLDNESS_WEIGHT * axisLean(person, "boldness")) }] : []),
    ];
}
/**
 * The delay share a decision is worth. Under the bar it is graded on the
 * margin, so a chair just under drags a little rather than all the way. Over
 * the bar, a military operation is taken faster by the chair's boldness alone,
 * read on the drag's own span: a Secretary who merely defers carries an
 * operation at the book's pace, and only a bold one beats it.
 */
export function delayShareOf(willingness, military) {
    if (willingness.margin < 0)
        return round4(Math.min(1, -willingness.margin / DELAY_SPAN));
    if (!military)
        return 0;
    const boldness = willingness.terms.find((term) => term.key === "boldness")?.value ?? 0;
    return round4(-Math.min(MILITARY_SPEEDUP, Math.max(0, boldness) / DELAY_SPAN));
}
function decide(campaign, role, act, subject) {
    // The President is never the one deciding whether to carry out the President's act.
    if (role === campaign.founding.leadRole)
        return undefined;
    const chair = selectChairRunner(campaign, role);
    if (!chair)
        return undefined;
    const willingness = weigh("carry-out", carryOutTerms(campaign, role, chair.base, act), {
        threshold: CARRY_THRESHOLD,
        noiseBound: 0,
        noise: 0,
    });
    return {
        chair,
        role,
        willingness,
        delayShare: delayShareOf(willingness, act.military),
        // Public: how fast a department moves on the President's business is the
        // President's to read, and the department's to answer for.
        decision: stampOf(willingness, chair.base.id, subject, "public"),
    };
}
/** How far an order sits from what this person believes, as fit: 1 is their own view, 0 the far side of every axis. */
export function orderFit(person, order) {
    return round4(1 - ideologyDistanceFromLean(person.ideology, orderDomainLean(order)));
}
/** The chair writing an order's rule, deciding how fast. A decree has nobody to drag it. */
export function carryOutOrder(campaign, order, role, baseWeeks) {
    if (!order.viaRulemaking || role === undefined)
        return undefined;
    const holder = selectChairRunner(campaign, role);
    const carry = holder ? decide(campaign, role, { fit: orderFit(holder.base, order), military: false }, order.id) : undefined;
    return carry ? { ...carry, addedWeeks: delayedWeeks(carry, baseWeeks) } : undefined;
}
/**
 * The chair preparing one of the President's own operations. Another
 * government's moves are never priced by this cabinet, and an act issued the
 * moment it is ordered has no preparation to drag. `fitOf` is how far the
 * chair believes in this much force, 0..1, read by the caller that owns the
 * instrument's scale.
 */
export function carryOutInstrument(campaign, request, baseDays, fitOf) {
    if (request.actor !== campaign.founding.nation || baseDays <= 0)
        return undefined;
    const role = domainRole(campaign, request.instrument);
    const holder = role === undefined ? undefined : selectChairRunner(campaign, role);
    if (role === undefined || !holder)
        return undefined;
    return decide(campaign, role, { fit: fitOf(holder.base), military: request.instrument === "military" }, `${request.instrument}:${request.rung}:${request.target}`);
}
/** The cabinet chair a body answers to: its own seat, or its parent department's. */
function cabinetChairOf(def) {
    let current = def;
    while (current) {
        if (current.cabinetRole)
            return current.cabinetRole;
        current = current.parent ? institutionDef(current.parent) : undefined;
    }
    return undefined;
}
/**
 * The Secretary over a body the President has instructed. A directive carries
 * no policy of its own to believe in, so only the person and their week decide
 * how fast it moves.
 */
export function carryOutDirective(campaign, def, subject) {
    const role = cabinetChairOf(def);
    return role === undefined ? undefined : decide(campaign, role, { military: false }, subject);
}
/**
 * Days added to an operation's preparation, negative when a bold Secretary of
 * Defense takes them off. The simulation counts whole days, and the drag and
 * the speedup are converted the same way: any shift costs or saves at least a
 * day, up to half the operation's own time, so a one-day act has no room to
 * move either way. Rounding the speedup to the nearest day while the drag
 * rounded up erased every bold Secretary on the five- and six-day operations a
 * nearby base makes common, while a cautious one still added a day.
 */
export function delayedDays(carry, baseDays) {
    if (!carry || baseDays <= 0)
        return 0;
    const shift = baseDays * 0.5 * carry.delayShare;
    if (shift === 0)
        return 0;
    return Math.sign(shift) * Math.min(Math.ceil(Math.abs(shift)), Math.floor(baseDays / 2)) + 0;
}
/** Weeks added to a rule's proceeding: a drag only, never a shortcut through notice and comment. */
export function delayedWeeks(carry, baseWeeks) {
    return carry ? Math.round(baseWeeks * Math.max(0, carry.delayShare)) : 0;
}
