import { daysBetween, deferUntil, isDeferred, scandalResponseTaken } from "@admin/engine";
import { scenarioCaseId, scenarioOccurrenceKey } from "@admin/content";
import { matterDoor } from "../campaign/stop-words";
import { waitingReason } from "../conversation/labels";
import { pendingConversations, scenarioMatterId } from "../conversation/scripts";
import { attentionItems, matterFor, owedItems, presentedItems } from "./attention";
import { defaultAttentionSetting } from "./attention-policy";
import { familyQueue } from "./family-cases";
import { caseRowViewModel } from "./case-rows";
const SEVERITY_STANCE = { routine: "neutral", serious: "caution", critical: "adverse" };
/** Where a decision happens, as the map frames it: its US state, else its point, else its government. */
export function decisionCamera(cast) {
    const locus = cast.locus;
    if (locus?.state)
        return { camera: `state:${locus.state}`, selection: `state:${locus.state}` };
    // Abroad, the whole government is framed and detached: a point a few degrees
    // across inside a large country shows nothing but its interior.
    if (locus && locus.nation !== "USA")
        return { camera: `nation:${locus.nation}`, selection: `nation:${locus.nation}` };
    if (locus)
        return { camera: `point:${locus.lon.toFixed(3)},${locus.lat.toFixed(3)}` };
    return { camera: `nation:${cast.counterpart}`, selection: `nation:${cast.counterpart}` };
}
/**
 * The decision's response window: its case's own clock once the case is
 * seated, else the window the docket holds the document open for. A decision
 * with neither has no countdown to draw.
 */
function decisionClock(campaign, cast) {
    const record = campaign.cases?.[scenarioCaseId(cast)];
    const docketed = campaign.docket?.find((entry) => entry.id === scenarioMatterId(scenarioOccurrenceKey(cast)));
    const window = record && record.clock.kind !== "none" ? { from: record.raisedAt, to: record.clock.dueAt } : docketed ? { from: docketed.arrives, to: docketed.closes } : undefined;
    if (!window)
        return undefined;
    return { label: "Time to respond", window: Math.max(1, daysBetween(window.from, window.to)), left: Math.max(0, daysBetween(campaign.calendar, window.to)), unit: "day", due: window.to };
}
function decisionRow(campaign, cast) {
    const clock = decisionClock(campaign, cast);
    return {
        id: scenarioMatterId(scenarioOccurrenceKey(cast)),
        kind: "decision",
        kindLabel: "Decision",
        kindIcon: "decision",
        title: cast.script.subject,
        reason: waitingReason(cast.def.severity, cast.def.class),
        urgency: cast.orderCase?.posture === "adverse-lower" || cast.def.severity === "critical" ? "hard" : "soft",
        stance: SEVERITY_STANCE[cast.def.severity],
        holds: true,
        ...(clock ? { clock, due: clock.due } : {}),
        href: matterDoor({ id: scenarioMatterId(scenarioOccurrenceKey(cast)) }),
        ...decisionCamera(cast),
    };
}
function itemClock(campaign, item) {
    const record = item.id.startsWith("case:") ? familyQueue(campaign).find((entry) => entry.record.id === item.id)?.record : undefined;
    if (record) {
        const view = caseRowViewModel(campaign, record);
        if (view.clock?.windowDays !== undefined && view.clock.daysRemaining !== undefined) {
            return { clock: { label: view.clock.dueLabel, window: view.clock.windowDays, left: view.clock.daysRemaining, unit: "day", ...(record.clock.kind === "none" ? {} : { due: record.clock.dueAt }) } };
        }
        return { age: view.ageDays === 0 ? "Raised today" : `Waiting ${view.ageDays} ${view.ageDays === 1 ? "day" : "days"}` };
    }
    if (item.clock?.kind === "statutory") {
        const unit = item.clock.unit === "week" ? "week" : "day";
        return { clock: { label: item.clock.statute ? `${item.clock.name} (${item.clock.statute})` : item.clock.name, window: item.clock.window, left: Math.max(0, item.clock.window - item.clock.consumed), unit } };
    }
    if (item.clock?.kind === "elapsed")
        return { age: `${item.clock.name}: ${item.clock.elapsed} ${item.clock.elapsed === 1 ? item.clock.unit : (item.clock.unitPlural ?? `${item.clock.unit}s`)}` };
    return {};
}
const KIND_LABEL = {
    scenario: "Decision",
    "bill-signature": "Bill",
    nomination: "Nomination",
    "constitutional-deadline": "Deadline",
    "appropriations-deadline": "Budget",
    "military-escalation": "Security",
    "intelligence-warning": "Intelligence",
    "treaty-deadline": "Treaty",
    "governor-request": "Governor",
    "diplomatic-request": "World request",
    disaster: "Disaster",
    incident: "Incident",
    investigation: "Investigation",
    pledge: "Promise",
    scandal: "Scandal",
    "market-threshold": "Markets",
    "court-ruling": "Court",
    "agency-request": "Government",
    "standing-threshold": "Standing",
    "resignation-offer": "Resignation",
};
const KIND_ICON = {
    scenario: "decision",
    "bill-signature": "sign",
    nomination: "appoint",
    "constitutional-deadline": "pending",
    "appropriations-deadline": "budget",
    "military-escalation": "shield",
    "intelligence-warning": "intel",
    "treaty-deadline": "law",
    "governor-request": "flag",
    "diplomatic-request": "summit",
    disaster: "caution",
    incident: "active",
    investigation: "review",
    pledge: "ballot",
    scandal: "press",
    "market-threshold": "graph",
    "court-ruling": "court",
    "agency-request": "building",
    "standing-threshold": "layerReading",
    "resignation-offer": "reject",
};
function itemRow(campaign, item, presented) {
    const isCase = item.id.startsWith("case:");
    return {
        id: item.id,
        kind: isCase ? "case" : "row",
        kindLabel: KIND_LABEL[item.source] ?? "Matter",
        kindIcon: KIND_ICON[item.source] ?? "brief",
        title: item.title,
        reason: item.reason,
        urgency: item.urgency,
        stance: item.stance,
        holds: presented.has(item.id),
        ...itemClock(campaign, item),
        ...(item.dueDate ? { due: item.dueDate } : {}),
        href: matterDoor(item, item.href) ?? item.href,
        ...putOffOf(campaign, item),
    };
}
/**
 * Every row that can hold Continue carries its own put-off. Some rows hold the
 * week only because their fact is new, and only a turn makes it old; with
 * Continue held, no turn comes, so without a put-off the Brief would be a dead end.
 */
function putOffOf(campaign, item) {
    if (item.urgency === "ambient")
        return {};
    const matter = matterFor(item, campaign.calendar);
    return { putOff: matter, putOffUntil: deferUntil(matter, campaign.calendar, campaign.foundingDate) };
}
/**
 * Stories still running and still unanswered. A story stops time only in the
 * week it breaks; after that it is ambient, and still waits on the President's
 * answer for as long as it runs, so the Brief keeps it in the list without
 * letting it hold the week.
 */
function unansweredStories(campaign, listed) {
    return attentionItems(campaign).filter((item) => item.source === "scandal" && item.urgency === "ambient" && !listed.has(item.id) && scandalResponseTaken(campaign, item.id.slice("scandal:".length)) === undefined);
}
/**
 * An empty cabinet seat, or an agency with nobody leading it. Neither carries
 * a deadline, so under the default setting neither ever competes for the week;
 * yet a nominee is the one thing nobody but the President can send, so the
 * Brief keeps the seat in the list, without letting it hold the week, until
 * it is filled, put off, or its kind is set to the log.
 */
const STANDING_VACANCIES = new Set(["cabinet-vacant", "executive-delivery"]);
function standingVacancies(campaign, listed, settings) {
    return attentionItems(campaign).filter((item) => STANDING_VACANCIES.has(item.id) &&
        !listed.has(item.id) &&
        (settings?.[item.source] ?? defaultAttentionSetting(item.source)) !== "log" &&
        !isDeferred(campaign.deferrals, item.id, campaign.calendar));
}
/**
 * Everything waiting on the President, worst first: decisions, which always
 * hold the week, then every owed row in the order the engine's composer ranks
 * them, the three it presents before the ones queued behind, then the empty
 * seats still waiting on a nominee, then the stories still waiting for an
 * answer. Other ambient rows are not here; they reach the wire and the Record.
 */
export function briefMatters(campaign, settings) {
    const presented = new Set(presentedItems(campaign, settings).map((item) => item.id));
    const owed = owedItems(campaign, settings);
    const listed = new Set(owed.map((item) => item.id));
    const stories = unansweredStories(campaign, listed);
    const vacancies = standingVacancies(campaign, listed, settings);
    return [...pendingConversations(campaign).map((cast) => decisionRow(campaign, cast)), ...[...owed, ...vacancies, ...stories].map((item) => itemRow(campaign, item, presented))];
}
/**
 * The one count of what waits on the President. The Brief's lede, the rail's
 * badges, the bar's "waiting on you" and the bell's desk rows all read it, so
 * no two of them can ever name a different number for the same desk.
 */
export function waitingOnYou(campaign, settings) {
    const matters = briefMatters(campaign, settings);
    return { matters, count: matters.length, holding: matters.filter((matter) => matter.holds).length };
}
