import { EMERGENCY_RENEWAL_TURNS, daysBetween, emergencyCauseLabel, reliefSignature, renewalIsOpen, selectConditionsFor, selectDateOfTurn, selectDeclaredEmergencies, weeksToLapse, } from "@admin/engine";
import { stateById } from "@admin/world";
import { anchored, place } from "../navigation/places";
import { conditionReadings } from "../world/board-state";
import { justHappened } from "./attention-row";
import { conditionRoute } from "./condition-route";
import { governorRequestGroups, guardRequestCandidates } from "./attention-requests";
import { familyRaise } from "./family-raise";
import { weekCount } from "../summons/clock-math";
// The emergency family: a state waiting on Washington for relief, and a
// declaration the President has to decide whether to continue. A Guard ask
// about a state already waiting is that emergency's own act, so it rides on
// the request's case rather than standing beside it as a second matter.
/** Inside this many days of its own expiry, an open claim is this week's problem. */
const CLOSING_WINDOW_DAYS = 7;
/** Inside this many weeks of its lapse, a declaration's continuation is this week's problem. */
const RENEWAL_CLOSING_WEEKS = 2;
/** The Guard asks that belong to a relief request: the same hazard, in a state that is waiting. */
export function guardAsksFor(group, candidates) {
    const waiting = new Set(group.states);
    return candidates.filter((candidate) => waiting.has(candidate.state) && reliefSignature(candidate.condition.kind) === group.signature);
}
function requestTitle(group) {
    if (group.states.length > 1)
        return `${group.states.length} governors are waiting to hear if you'll send federal help`;
    const name = stateById.get(group.states[0])?.name;
    return name ? `${name} is waiting to hear if you'll send federal help` : "A governor is waiting to hear if you'll send federal help";
}
/**
 * The condition a governor's request is about, where it is still running.
 *
 * A claim opens only on the week its condition does (`obligationPhase`), for
 * the condition's own hazard, in the state it is running in or in every state
 * for a national one. So the same hazard, the same opening week and a state
 * that is asking names exactly one condition.
 */
function requestCondition(campaign, group) {
    const running = selectConditionsFor(campaign, campaign.founding.nation).find((condition) => reliefSignature(condition.kind) === group.signature &&
        condition.startedTurn === group.openedTurn &&
        (condition.state === undefined || group.states.includes(condition.state)));
    if (!running)
        return undefined;
    const reading = conditionReadings(campaign).find((entry) => entry.id === running.id);
    if (!reading)
        return undefined;
    return {
        id: running.id,
        title: reading.headline,
        line: reading.standfirst,
        href: conditionRoute(reading),
        source: reading.incident ? "incident" : "disaster",
        arriving: justHappened(campaign, running.beats.at(-1)?.turn ?? running.startedTurn),
        stance: reading.severity.stance,
    };
}
/** The conditions a relief case already carries, whose own rows would say the same matter twice. */
export function conditionsInReliefCases(campaign) {
    return new Set(governorRequestGroups(campaign).flatMap((group) => {
        const condition = requestCondition(campaign, group);
        return condition ? [condition.id] : [];
    }));
}
// A relief request and the emergency it is about are one matter, so the case
// carries the condition: its headline and place, its link, and, the week it
// arrives, its kind and its standing to stop the run as a disaster does. After
// that it waits as a request, soft only inside its closing window.
function requestSource(campaign, group, candidates) {
    const expires = selectDateOfTurn(campaign, group.expiresTurn);
    const condition = requestCondition(campaign, group);
    const arriving = condition?.arriving === true;
    const closing = group.openedTurn !== campaign.turn && daysBetween(campaign.calendar, expires) <= CLOSING_WINDOW_DAYS;
    const id = `case:emergency:${group.signature}:${group.openedTurn}`;
    const title = requestTitle(group);
    const guard = guardAsksFor(group, candidates);
    // The board opened on the emergency the governors are asking about, where the declaration that answers them is drawn.
    const board = anchored(condition ? place.emergencyIncident(condition.id) : place.emergency(), "emergency-incidents");
    return {
        raise: familyRaise("emergency", id, title, { kind: "emergency", id: `${group.signature}:${group.openedTurn}` }, expires),
        row: {
            id,
            source: arriving ? condition.source : "governor-request",
            urgency: closing || arriving ? "soft" : "ambient",
            subject: `governor-request:${group.signature}:${group.openedTurn}`,
            title,
            reason: condition ? `${condition.title}: ${condition.line} ${group.reason}` : group.reason,
            href: board,
            stance: closing ? "adverse" : arriving ? condition.stance : "caution",
            figure: `${group.states.length}`,
            icon: "mapPin",
            dueDate: expires,
        },
        door: { href: board, label: "Open the emergency board" },
        ...(condition ? { context: { title: condition.title, line: condition.line, href: condition.href } } : {}),
        ...(guard.length > 0 ? { guardStates: guard.map((candidate) => candidate.state) } : {}),
    };
}
function renewalTitle(emergency) {
    const where = emergency.scope.kind === "nation" ? "national" : `${stateById.get(emergency.scope.state)?.name ?? "state"}`;
    return `The ${where} emergency over ${emergencyCauseLabel(emergency.cause).toLowerCase()} ends unless you renew it`;
}
function renewalSource(campaign, emergency) {
    const lapseTurn = emergency.renewedTurn + EMERGENCY_RENEWAL_TURNS;
    const due = selectDateOfTurn(campaign, lapseTurn);
    const weeks = weeksToLapse(emergency, campaign.turn);
    const id = `case:emergency:${emergency.id}:${lapseTurn}`;
    const title = renewalTitle(emergency);
    const declaration = anchored(place.emergencyDeclaration(emergency.id), "emergency-declared");
    return {
        raise: familyRaise("emergency", id, title, { kind: "emergency", id: emergency.id }, due),
        row: {
            id,
            // A declaration coming to its end is an instrument lapsing, the same
            // demand on the President as a force authorization running out.
            source: "treaty-deadline",
            urgency: weeks <= RENEWAL_CLOSING_WEEKS ? "soft" : "ambient",
            subject: `emergency:${emergency.id}`,
            title,
            reason: "The special powers it gave you end on its one-year anniversary unless you renew it.",
            href: declaration,
            stance: weeks <= RENEWAL_CLOSING_WEEKS ? "adverse" : "caution",
            figure: weekCount(Math.max(0, weeks)),
            icon: "escalate",
            dueDate: due,
        },
        door: { href: declaration, label: "Open the declaration" },
    };
}
export function emergencySources(campaign) {
    const candidates = guardRequestCandidates(campaign);
    return [
        ...governorRequestGroups(campaign).map((group) => requestSource(campaign, group, candidates)),
        ...selectDeclaredEmergencies(campaign)
            .filter((emergency) => renewalIsOpen(emergency, campaign.turn))
            .map((emergency) => renewalSource(campaign, emergency)),
    ];
}
