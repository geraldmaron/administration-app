import { LOCALE_ACTS, REVIEW_DEFERRAL_TURNS, UNPROVOKED_STANDING, coercionOutcome, coercionOutlook, homeActAvailability, localeAct, takeHomeAct, RELIEF_SIGNATURE_PREFIX, governorAssents, hazardLabel, localeActCost, localeAvailability, openRequests, reliefSignature, selectActiveConditions, takeLocaleAct, } from "@admin/engine";
import { formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";
const causeOfClaim = (signature) => signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`) ? signature.slice(RELIEF_SIGNATURE_PREFIX.length + 1) : undefined;
/** What in this state a locale act could answer, requests first, then the worst condition. */
export function localeMatters(campaign, id) {
    const conditions = selectActiveConditions(campaign).filter((condition) => condition.nation === campaign.founding.nation && condition.state === id);
    const requests = openRequests(campaign, id);
    const causes = [...new Set([...requests.flatMap((claim) => causeOfClaim(claim.signature) ?? []), ...conditions.map((condition) => condition.kind)])];
    return causes
        .map((cause) => {
        const claim = requests.find((entry) => entry.signature === reliefSignature(cause));
        const severity = Math.max(-1, ...conditions.filter((condition) => condition.kind === cause).map((condition) => condition.severity));
        return {
            cause,
            title: hazardLabel(cause),
            ...(claim ? { request: { reason: claim.reason, weeksLeft: Math.max(0, claim.expiresTurn - campaign.turn), weight: claim.weight } } : {}),
            ...(severity >= 0 ? { severity } : {}),
        };
    })
        .sort((a, b) => Number(b.request !== undefined) - Number(a.request !== undefined) || (b.severity ?? 0) - (a.severity ?? 0) || a.cause.localeCompare(b.cause));
}
function metricDelta(packet, key) {
    if (!packet)
        return 0;
    return packet.effects.reduce((sum, effect) => (effect.kind === "metric" ? sum + (effect.deltas[key] ?? 0) : sum), 0);
}
function assentWords(campaign, id, act) {
    if (!act.needsGovernorAssent)
        return undefined;
    const governor = campaign.states[id]?.governor;
    if (!governor)
        return "There's no governor in office, so we can't tell whether they'd agree.";
    return governorAssents(governor) ? "The governor agrees to it." : "The governor won't agree to it.";
}
function optionFor(campaign, id, cause, act) {
    const availability = localeAvailability(campaign, id, act, cause);
    const result = availability.ok ? takeLocaleAct(campaign, id, act.id, cause) : undefined;
    const packet = result?.ok ? result.packet : undefined;
    const refused = result && !result.ok ? result.reason : undefined;
    const standing = Math.abs(metricDelta(packet, "standing")) || (packet ? 0 : act.standingCost);
    const cost = packet ? Math.abs(metricDelta(packet, "treasury")) : localeActCost(campaign, act);
    const assent = assentWords(campaign, id, act);
    return {
        id: act.id,
        name: act.name,
        summary: act.summary,
        cost,
        costText: formatMoney(cost),
        standing,
        standingText: standing > 0 ? `${formatSignedPoints(-standing)} pts` : "None",
        unrequested: act.predicate === "request" && openRequests(campaign, id).length === 0,
        answers: act.answersClaim && openRequests(campaign, id).some((claim) => claim.signature === reliefSignature(cause)),
        defers: act.id === "review" && openRequests(campaign, id).length > 0,
        ...(assent ? { assent } : {}),
        needsDeclaration: act.needsDeclaration,
        ...(availability.ok ? {} : { locked: `This needs ${availability.missing}.` }),
        ...(refused ? { locked: refused } : {}),
        ...(packet ? { packet } : {}),
        ...(act.coercion ? { risk: riskOf(campaign, act) } : {}),
    };
}
function riskOf(campaign, act, provoked = true) {
    const outlook = coercionOutlook(campaign, act.coercion, provoked);
    return { odds: outlook.odds, recent: outlook.recent, erratic: outlook.erratic };
}
/**
 * Every locale act against one matter in one state, in the engine's order,
 * priced on this week's campaign. Force and collection aimed at Americans are
 * offered only against unrest: against a flood they are not a choice anyone
 * would weigh, only clutter.
 */
export function localeActOptions(campaign, id, cause) {
    return LOCALE_ACTS.filter((act) => !act.coercion || cause === "unrest").map((act) => optionFor(campaign, id, cause, act));
}
/** The state's request running out unanswered, which becomes a grievance; undefined when nothing is owed, so no clock runs. */
export function localeWaiting(campaign, id, cause) {
    const claim = openRequests(campaign, id).find((entry) => entry.signature === reliefSignature(cause));
    const name = campaign.states[id]?.base.name ?? id;
    if (!claim)
        return undefined;
    const weeksLeft = Math.max(0, claim.expiresTurn - campaign.turn);
    return {
        line: `${name}'s request runs out in ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"}. If you don't answer it, the state will hold it against you.`,
        weeksLeft,
    };
}
/**
 * What went wrong when a coercive act was taken, read after the fact off the
 * campaign it was taken on: the draw is the same one the committed packet
 * made, so this is the incident on the books, not a second roll. Undefined
 * when the act carries no risk or nothing went wrong.
 */
export function localeIncident(before, id, actId, provoked = true) {
    const act = localeAct(actId);
    if (!act?.coercion)
        return undefined;
    return coercionOutcome(before, id, before.states[id]?.base.name ?? id, act.coercion, provoked).incident;
}
function homeOptionFor(campaign, id, act) {
    const availability = homeActAvailability(campaign, id, act);
    const result = availability.ok ? takeHomeAct(campaign, id, act.id) : undefined;
    const packet = result?.ok ? result.packet : undefined;
    const standing = packet ? Math.abs(metricDelta(packet, "standing")) : act.standingCost * UNPROVOKED_STANDING;
    const cost = packet ? Math.abs(metricDelta(packet, "treasury")) : localeActCost(campaign, act);
    return {
        id: act.id,
        name: act.name,
        summary: act.summary,
        cost,
        costText: formatMoney(cost),
        standing,
        standingText: standing > 0 ? `${formatSignedPoints(-standing)} pts` : "None",
        unrequested: false,
        answers: false,
        defers: false,
        needsDeclaration: act.needsDeclaration,
        ...(availability.ok ? {} : { locked: `This needs ${availability.missing}.` }),
        ...(result && !result.ok ? { locked: result.reason } : {}),
        ...(packet ? { packet } : {}),
        risk: riskOf(campaign, act, false),
        unprovoked: true,
    };
}
/**
 * Force and collection the President can send into a state on their own
 * initiative, with no unrest there to answer: every act that carries a
 * coercion risk, priced as the overreach it is read as.
 */
export function homeActOptions(campaign, id) {
    return LOCALE_ACTS.filter((act) => act.coercion).map((act) => homeOptionFor(campaign, id, act));
}
/** How long a review buys, for the sentence that says so. */
export const REVIEW_WEEKS = REVIEW_DEFERRAL_TURNS;
