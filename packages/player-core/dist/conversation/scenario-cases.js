// An open authored case is the desk's decision. A later draw does not replace
// it, and the desk-closed flag does not choose the next one.
import { storySubjectEffects, boundPlace, familyRaiseEffects, repairLegacyScenarioPrice, renderScenarioBrief, castStillBound, scenarioCaseId } from "@admin/content";
import { addDays, apply, compareDates, isOpenCase } from "@admin/engine";
import { RESPONSE_WINDOW_DAYS } from "./arrival";
const OPEN_BLOCK = "authored-scenario";
function digest(text) {
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1)
        hash = Math.imul(hash, 33) ^ text.charCodeAt(index);
    return (hash >>> 0).toString(16);
}
function isCast(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const cast = value;
    if (cast.def?.cast?.pick === "collectionReport" &&
        (typeof cast.report?.id !== "string" || !Array.isArray(cast.report.findings) ||
            typeof cast.report.day !== "number" || typeof cast.report.target !== "string" ||
            typeof cast.report.tasking !== "string" || typeof cast.report.question !== "string" ||
            (cast.report.status !== "findings" && cast.report.status !== "no-result")))
        return false;
    if (cast.def?.cast?.pick === "tradeMeasure" &&
        (typeof cast.tradeMeasure?.id !== "string" || typeof cast.tradeMeasure.actor !== "string" ||
            typeof cast.tradeMeasure.rate !== "number" || typeof cast.tradeMeasure.sector !== "string"))
        return false;
    if (cast.def?.cast?.pick === "liveBill" &&
        (typeof cast.bill?.id !== "string" || typeof cast.bill.act !== "string" ||
            typeof cast.bill.title !== "string" || typeof cast.bill.introducedTurn !== "number" ||
            (cast.bill.stage !== "markup" && cast.bill.stage !== "conference")))
        return false;
    if (cast.def?.cast?.pick === "pendingOrderCase" &&
        (typeof cast.orderCase?.proceedingId !== "string" || typeof cast.orderCase.recordId !== "string" ||
            typeof cast.orderCase.orderId !== "string" ||
            (cast.orderCase.posture !== undefined && cast.orderCase.posture !== "pending-challenge" && cast.orderCase.posture !== "adverse-lower")))
        return false;
    if (cast.def?.conditions?.some((condition) => condition.kind === "oversightMatter" && condition.origin === "inspector-general") &&
        (typeof cast.matter?.id !== "string" || typeof cast.matter.institution !== "string" ||
            typeof cast.matter.subject !== "string" || typeof cast.matter.openedTurn !== "number"))
        return false;
    return typeof cast.def?.id === "string" && typeof cast.script?.subject === "string" && typeof cast.counterpart === "string";
}
function openScenarioCases(campaign) {
    return Object.values(campaign.cases ?? {}).filter((item) => item.kind === OPEN_BLOCK && isOpenCase(item.status));
}
// A case the President put off is open (it has not been answered) but it is
// not what is in front of them today. Without this the frozen cast comes back
// every week until it is acted on, and the one control that spends time is held
// for as long as it does.
function putOffPast(item, today) {
    return item.deferredUntil !== undefined && compareDates(item.deferredUntil, today) > 0;
}
/**
 * Whether an authored decision is still open, put off or not.
 *
 * While one is, it is the desk's decision: a later draw does not stage another
 * beside it, or a decision put off would be replaced by the next one drawn and
 * putting it off would be a way to shop for an easier week.
 */
export function hasOpenScenarioCase(campaign) {
    return openScenarioCases(campaign).length > 0;
}
function frozenCast(item) {
    if (item.authoredSnapshot === undefined)
        return undefined;
    try {
        const parsed = JSON.parse(item.authoredSnapshot);
        if (!isCast(parsed))
            return undefined;
        return parsed.orderCase && parsed.orderCase.posture === undefined
            ? { ...parsed, orderCase: { ...parsed.orderCase, posture: "pending-challenge" } } : parsed;
    }
    catch {
        // A snapshot this build cannot read is a case with nothing to show; the
        // withdrawal below closes it rather than holding the desk on it forever.
        return undefined;
    }
}
export function openScenarioCasts(campaign) {
    return openScenarioCases(campaign)
        .filter((item) => !putOffPast(item, campaign.calendar))
        .map(frozenCast)
        .filter((cast) => cast !== undefined)
        .map((cast) => repairLegacyScenarioPrice(campaign, { ...cast, def: renderScenarioBrief(campaign, cast.def, cast.counterpart, boundPlace(campaign, cast.def, cast.counterpart, cast.locus, cast.script.subjects)) }));
}
function settledOn(campaign, on) {
    return Object.values(campaign.cases ?? {}).some((item) => item.kind === OPEN_BLOCK && !isOpenCase(item.status) && compareDates(item.lastTouchedAt, on) === 0);
}
/**
 * What an authored decision's case accepts. `allow-default` is the decision
 * resolved by inaction: handed off unanswered, left to lapse, or withdrawn
 * because what it was about is over.
 */
export const SCENARIO_CASE_DISPOSITIONS = ["act", "decline", "defer", "allow-default"];
function raiseFor(campaign, cast, raisedOn) {
    const normalDue = addDays(raisedOn, RESPONSE_WINDOW_DAYS[cast.def.severity]);
    const response = cast.orderCase?.posture === "adverse-lower" ? campaign.cases?.[`case:review:${cast.orderCase.proceedingId}`] : undefined;
    if (cast.orderCase?.posture === "adverse-lower" && (!response || response.clock.kind === "none")) {
        throw new Error("An authored lower-judgment decision has no matching court-response deadline.");
    }
    const dueAt = response?.clock.kind !== "none" && response?.clock.dueAt ? response.clock.dueAt :
        cast.bill?.conferenceDeadline && compareDates(cast.bill.conferenceDeadline, normalDue) < 0
            ? cast.bill.conferenceDeadline : normalDue;
    const snapshot = JSON.stringify({
        def: cast.def,
        ...(cast.occurrence ? { occurrence: cast.occurrence } : {}),
        counterpart: cast.counterpart,
        script: cast.script,
        weight: cast.weight,
        ...(cast.locus === undefined ? {} : { locus: cast.locus }),
        ...(cast.transmission === undefined ? {} : { transmission: cast.transmission }),
        ...(cast.report === undefined ? {} : { report: cast.report }),
        ...(cast.matter === undefined ? {} : { matter: cast.matter }),
        ...(cast.tradeMeasure === undefined ? {} : { tradeMeasure: cast.tradeMeasure }),
        ...(cast.bill === undefined ? {} : { bill: cast.bill }),
        ...(cast.judicialVacancy === undefined ? {} : { judicialVacancy: cast.judicialVacancy }),
        ...(cast.orderCase === undefined ? {} : { orderCase: cast.orderCase }),
    });
    return {
        kind: "case",
        actor: "world",
        raise: {
            id: scenarioCaseId(cast),
            kind: "authored-scenario",
            title: cast.script.subject,
            subject: { kind: "scenario", id: cast.def.id },
            // The same window the desk holds a document for. An unanswered decision
            // lapses when it closes, as the world moves on without one; frozen with
            // no clock, the first pick of a term that answered nothing stayed the
            // only decision the term was ever offered.
            clock: { kind: response ? "operational" : "opportunity", dueAt },
            defaultOutcome: { kind: "declined", outcomeId: "unanswered" },
            urgency: response ? response.urgency : cast.def.severity === "critical" ? "hard" : "soft",
            responseRequirement: "president",
            allowedDispositions: response ? ["act", "defer", "allow-default"] : [...SCENARIO_CASE_DISPOSITIONS],
            contentPin: { scenarioId: cast.def.id, digest: digest(snapshot) },
            authoredSnapshot: snapshot,
            story: { scenario: cast.def.id, ...(cast.def.family ? { family: cast.def.family.id } : {}), subjects: cast.script.subjects ?? [],
                ...(cast.locus?.state ? { place: { state: cast.locus.state, ...(cast.locus.city ? { city: cast.locus.city } : {}), ...(cast.locus.settlement ? { settlement: cast.locus.settlement } : {}) } } : {}) },
        },
    };
}
/**
 * The raise for one staged decision the registry has not seen yet, so a
 * disposition taken before the next advance seats it has a case to move.
 * Nothing when the case already exists.
 */
function scenarioCaseRaise(campaign, cast) {
    return campaign.cases?.[scenarioCaseId(cast)] === undefined ? raiseFor(campaign, cast, campaign.calendar) : undefined;
}
/**
 * The case's raise and, for an opener, the thread it starts: its place is
 * pinned the week the decision appears, not the week it is answered.
 */
export function scenarioRaiseEffects(campaign, cast) {
    const raise = scenarioCaseRaise(campaign, cast);
    return raise ? [...storySubjectEffects(campaign, cast), raise, ...familyRaiseEffects(campaign, cast)] : [];
}
/** Raises the director's current picks once. An open case, put off or not, or one settled today, blocks another. */
export function withScenarioCases(campaign, casts) {
    if (hasOpenScenarioCase(campaign) || settledOn(campaign, campaign.calendar))
        return campaign;
    const effects = casts.flatMap((cast) => scenarioRaiseEffects(campaign, cast));
    if (effects.length === 0)
        return campaign;
    return apply(campaign, {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary: "A decision is waiting." },
        effects,
    });
}
export function scenarioSettledToday(campaign) {
    return settledOn(campaign, campaign.calendar);
}
function withdrawn(campaign, item) {
    const cast = frozenCast(item);
    return cast === undefined || !castStillBound(campaign, cast);
}
function withdrawalReason(item) {
    const cast = frozenCast(item);
    return cast?.report ? "Withdrawn. The issued report is no longer current." : "Withdrawn. What it was about is over.";
}
/**
 * Closes every open decision whose subject is over.
 *
 * A frozen case pins the record it was cast against on purpose, so the fire it
 * was about can go out while it waits. Left open it would be hidden from the
 * desk and still block the next draw, which is a desk that never asks again.
 */
export function withWithdrawnScenarioCases(campaign) {
    const effects = openScenarioCases(campaign)
        .filter((item) => withdrawn(campaign, item))
        .map((item) => ({
        kind: "case",
        actor: "world",
        transition: { id: item.id, disposition: { kind: "allow-default" }, narration: withdrawalReason(item) },
    }));
    if (effects.length === 0)
        return campaign;
    return apply(campaign, {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        background: true,
        narration: { summary: "A decision was withdrawn because what it was about is over." },
        effects,
    });
}
/** Decisions that lapsed or were handed off unanswered, as the casts they froze. The lapse still owes them their price. */
export function unansweredScenarioCasts(campaign) {
    return Object.values(campaign.cases ?? {})
        .filter((item) => item.kind === OPEN_BLOCK && item.status === "defaulted")
        .map(frozenCast)
        // A decision withdrawn because its subject is over owes no silence.
        .filter((cast) => cast !== undefined && cast.orderCase?.posture !== "adverse-lower" && castStillBound(campaign, cast));
}
