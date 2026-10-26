import { LOCALE_ACTS, REVIEW_DEFERRAL_TURNS, RELIEF_SIGNATURE_PREFIX, SURVEILLANCE_ORDER_KINDS, coercionOutcome, coercionOutlook, governorAssents, hazardLabel, homeActAvailability, liveCourtOrder, liveLocaleMissions, localeAct, localeActAuthority, localeActPrice, localeActProjection, localeAvailability, openRequests, reliefSignature, selectActiveConditions, statePartyName, surveillanceRisk, takeHomeAct, takeLocaleAct, unrestReaching, } from "@admin/engine";
import { orderAuthorityRecord } from "../authority/registry";
import { formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";
import { holdingCount } from "./nation-forces";
const causeOfClaim = (signature) => signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`) ? signature.slice(RELIEF_SIGNATURE_PREFIX.length + 1) : undefined;
/** The conditions in this state, and unrest anywhere at home that reaches it. */
function stateConditions(campaign, id) {
    const placed = selectActiveConditions(campaign).filter((condition) => condition.nation === campaign.founding.nation && condition.state === id);
    const unrest = unrestReaching(campaign, id);
    return unrest && !placed.some((condition) => condition.id === unrest.id) ? [...placed, unrest] : placed;
}
/** What in this state a locale act could answer, requests first, then the worst condition. */
export function localeMatters(campaign, id) {
    const conditions = stateConditions(campaign, id);
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
function assentWords(campaign, id, act) {
    if (!act.needsGovernorAssent)
        return undefined;
    const governor = campaign.states[id]?.governor;
    if (!governor)
        return "There's no governor in office, so we can't tell whether they'd agree.";
    return governorAssents(governor) ? "The governor agrees to it." : "The governor won't agree to it.";
}
function riskOf(campaign, id, act, provoked) {
    const risk = surveillanceRisk(campaign, id, act);
    if (!risk)
        return undefined;
    const outlook = coercionOutlook(campaign, risk, provoked);
    return { odds: outlook.odds, recent: outlook.recent, erratic: outlook.erratic };
}
/** A weekly bill in USD millions, kept to one decimal below $100M so $13.45M reads $13.5M, not $13M. */
export function formatWeeklyBill(usdMillions) {
    if (Math.abs(usdMillions) >= 100 || Number.isInteger(usdMillions))
        return formatMoney(usdMillions);
    const tenths = Math.round(Math.abs(usdMillions) * 10 + 1e-9) / 10;
    return `${usdMillions < 0 ? "-" : ""}$${Number.isInteger(tenths) ? tenths.toFixed(0) : tenths.toFixed(1)}M`;
}
function authorityView(act) {
    const authority = localeActAuthority(act);
    if (!authority)
        return undefined;
    const record = orderAuthorityRecord(authority);
    return { cite: authority.cite, name: authority.name, limit: authority.limit, ...(record ? { recordId: record.id } : {}) };
}
const CLASS_WORDS = {
    advocacy: "Civil liberties and advocacy groups",
    regulated: "Businesses the order binds",
    individuals: "People the mission stops or arrests",
    congress: "Members of Congress",
};
/** At most this many states are named before the rest are counted. */
const NAMED_STATES = 4;
function plaintiffsOf(projection) {
    const states = projection.filing.states.slice(0, NAMED_STATES).map((entry) => statePartyName(entry.stateId, entry.name));
    const more = projection.filing.states.length - NAMED_STATES;
    const classes = Object.keys(projection.filing.classes)
        .filter((kind) => (projection.filing.classes[kind] ?? 0) > 0).map((kind) => CLASS_WORDS[kind]);
    return [...states, ...(more > 0 ? [`${more} more ${more === 1 ? "state" : "states"}`] : []), ...classes];
}
function litigationOf(projected) {
    const projection = projected.order?.projection;
    if (!projection)
        return undefined;
    const review = projection.review;
    return {
        filingChance: projection.challengeChance,
        meritsChance: projection.meritsChance,
        plaintiffs: plaintiffsOf(projection),
        ...(review ? { counsel: { name: review.reviewer.base.name, objects: review.objects } } : {}),
        reasoning: projection.reasoning,
        ...(projected.interimRelief ? { interimRelief: projected.interimRelief.chance } : {}),
    };
}
function commitmentOf(projected) {
    const commitment = projected.commitment;
    if (!commitment)
        return undefined;
    const forces = commitment.forces;
    return {
        ...(forces ? { forcesText: holdingCount(forces.unitType, forces.count) } : {}),
        weeklyText: formatWeeklyBill(commitment.amountPerTurn),
        weeks: commitment.weeks,
    };
}
function easesOf(projected) {
    const mission = projected.mission;
    if (!mission && projected.protestDelta === 0)
        return undefined;
    return { attention: mission?.attention ?? 0, weeks: mission?.weeks ?? 0, protest: projected.protestDelta };
}
function stepOf(campaign, id, act, projected) {
    if (act.predicate !== "proclaimed")
        return undefined;
    const issued = projected.gates.some((gate) => gate.met);
    return {
        after: "proclaim",
        text: issued
            ? `Rests on the proclamation to disperse already issued for ${campaign.states[id]?.base.name ?? id}.`
            : "Issue a proclamation to disperse first. The troops can go in from the following week.",
    };
}
function refusedByLaw(campaign, id, act, availability) {
    if (!act.boundary || availability.ok)
        return undefined;
    const lawful = liveCourtOrder(campaign, id, SURVEILLANCE_ORDER_KINDS) ? "surveil-under-order" : "priority";
    return { reason: `This needs ${availability.missing}.`, neighbor: lawful };
}
const standingText = (standing) => (standing > 0 ? `${formatSignedPoints(-standing)} pts` : "None");
const costText = (cost) => (cost > 0 ? formatMoney(cost) : "None");
/** The law, the gates, the suit, the mission and its bill: what every desk reads beside the price. */
function legalTerms(campaign, id, base, projected) {
    const authority = authorityView(projected.act);
    const litigation = litigationOf(projected);
    const commitment = commitmentOf(projected);
    const eases = easesOf(projected);
    const step = stepOf(campaign, id, base, projected);
    const refused = refusedByLaw(campaign, id, base, projected.availability);
    return {
        gates: projected.gates,
        ...(authority ? { authority } : {}),
        ...(litigation ? { litigation } : {}),
        ...(commitment ? { commitment } : {}),
        ...(eases ? { eases } : {}),
        ...(projected.governorShift ? { governorShift: projected.governorShift } : {}),
        ...(step ? { step } : {}),
        ...(refused ? { refusedByLaw: refused } : {}),
    };
}
function built(result) {
    if (!result)
        return {};
    return result.ok ? { packet: result.packet } : { refused: result.reason };
}
function answersMatter(campaign, id, act, cause) {
    const answers = act.answersClaim === true || (act.answersClaim === "with-assent" && governorAssents(campaign.states[id]?.governor));
    return answers && openRequests(campaign, id).some((claim) => claim.signature === reliefSignature(cause));
}
function optionFor(campaign, id, cause, base) {
    const projected = localeActProjection(campaign, id, base.id, cause);
    const act = projected.act;
    const { availability } = projected;
    const { packet, refused } = built(availability.ok ? takeLocaleAct(campaign, id, base.id, cause) : undefined);
    const price = localeActPrice(campaign, id, base);
    const cost = Math.abs(price.treasury ?? 0);
    const standing = Math.abs(price.standing ?? 0);
    const assent = assentWords(campaign, id, act);
    const risk = riskOf(campaign, id, act, true);
    return {
        id: act.id,
        name: act.name,
        summary: act.summary,
        group: act.group,
        cost,
        costText: costText(cost),
        standing,
        standingText: standingText(standing),
        unrequested: act.predicate === "request" && openRequests(campaign, id).length === 0,
        answers: answersMatter(campaign, id, act, cause),
        defers: act.id === "review" && openRequests(campaign, id).length > 0,
        ...(assent ? { assent } : {}),
        needsDeclaration: act.needsDeclaration,
        ...(availability.ok ? {} : { locked: `This needs ${availability.missing}.` }),
        ...(refused ? { locked: refused } : {}),
        ...(packet ? { packet } : {}),
        ...(risk ? { risk } : {}),
        ...legalTerms(campaign, id, base, projected),
    };
}
/**
 * Force and collection aimed at Americans answer disorder, and nothing else: a
 * brigade or a wiretap against a flood is not a choice anyone would weigh. An
 * immigration operation answers nothing at all, since it is routine federal
 * law that runs whatever is happening, so it is offered only as a home act.
 */
function answersOnlyUnrest(act) {
    return act.group === "enforcement" || act.group === "investigation" || (act.group === "military" && act.id !== "request-deployment");
}
const offeredAgainst = (cause) => (act) => act.id !== "immigration-operation" && (cause === "unrest" || !answersOnlyUnrest(act));
/** Every locale act against one matter in one state, in the engine's order, priced on this week's campaign. */
export function localeActOptions(campaign, id, cause) {
    return LOCALE_ACTS.filter(offeredAgainst(cause)).map((act) => optionFor(campaign, id, cause, act));
}
/**
 * How many of those acts the engine would take this week, read off its own
 * gate without pricing or building any of them: a table of every state asks
 * this once per row.
 */
export function openLocaleActCount(campaign, id, cause) {
    return LOCALE_ACTS.filter(offeredAgainst(cause)).filter((act) => localeAvailability(campaign, id, act, cause).ok).length;
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
    const risk = act ? surveillanceRisk(before, id, act) : undefined;
    if (!risk)
        return undefined;
    return coercionOutcome(before, id, before.states[id]?.base.name ?? id, risk, provoked).incident;
}
function homeOptionFor(campaign, id, base) {
    const projected = localeActProjection(campaign, id, base.id);
    const act = projected.act;
    const availability = homeActAvailability(campaign, id, base);
    const { packet, refused } = built(availability.ok ? takeHomeAct(campaign, id, base.id) : undefined);
    const price = localeActPrice(campaign, id, base, true);
    const cost = Math.abs(price.treasury ?? 0);
    const standing = Math.abs(price.standing ?? 0);
    // Routine enforcement is never read as unprovoked; force and collection with no unrest to answer are.
    const provoked = act.occasion === "enforcement";
    const risk = riskOf(campaign, id, act, provoked);
    return {
        id: act.id,
        name: act.name,
        summary: act.summary,
        group: act.group,
        cost,
        costText: costText(cost),
        standing,
        standingText: standingText(standing),
        unrequested: false,
        answers: false,
        defers: false,
        needsDeclaration: act.needsDeclaration,
        ...(availability.ok ? {} : { locked: `This needs ${availability.missing}.` }),
        ...(refused ? { locked: refused } : {}),
        ...(packet ? { packet } : {}),
        ...(risk ? { risk } : {}),
        ...(provoked ? {} : { unprovoked: true }),
        ...legalTerms(campaign, id, base, { ...projected, availability }),
    };
}
/**
 * Force and collection the President can send into a state on their own
 * initiative, with nothing there to answer: every coercive act the home path
 * takes, which is the ones whose occasion is not "any". Only routine
 * enforcement can actually go; the rest say which unrest they wait on.
 */
export function homeActOptions(campaign, id) {
    return LOCALE_ACTS.filter((act) => act.coercion && act.occasion !== "any").map((act) => homeOptionFor(campaign, id, act));
}
const MISSION_STATUS = {
    operative: "in force",
    "not-yet-effective": "not yet in force",
    suspended: "paused by a court",
    ended: "ended",
};
/** Every federal mission still inside its window in this state, newest first, with whether its order still runs. */
export function localeMissions(campaign, id) {
    return liveLocaleMissions(campaign, id).map((mission) => ({
        act: mission.act,
        name: localeAct(mission.act)?.name ?? mission.act,
        since: mission.sinceTurn,
        status: MISSION_STATUS[mission.status],
    }));
}
/** How long a review buys, for the sentence that says so. */
export const REVIEW_WEEKS = REVIEW_DEFERRAL_TURNS;
