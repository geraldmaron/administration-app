import { daysBetween, deferUntil, isDeferred, scandalResponseTaken, type AttentionMatter, type AttentionUrgency, type Campaign, type GameDate } from "@admin/engine";
import { scenarioCaseId, scenarioOccurrenceKey, type CastScenario } from "@admin/content";
import { matterDoor } from "../campaign/stop-words";
import { waitingReason } from "../conversation/labels";
import { pendingConversations, scenarioMatterId } from "../conversation/scripts";
import type { MetricStance } from "../format/figures";
import { attentionItems, matterFor, owedItems, presentedItems, type AttentionPolicySettings } from "./attention";
import { defaultAttentionSetting } from "./attention-policy";
import type { AttentionItem } from "./attention-row";
import { familyQueue } from "./family-cases";
import { caseRowViewModel } from "./case-rows";

/**
 * A countdown, drawn only where a real window runs: a statute's, a case's own
 * clock, a decision's response window. `window` and `left` are in `unit`.
 */
export type MatterClock = { readonly label: string; readonly window: number; readonly left: number; readonly unit: "day" | "week"; readonly due?: GameDate };

/** One row of what needs the President, in the order the Brief ranks them. */
export type BriefMatter = {
  readonly id: string;
  readonly kind: "decision" | "case" | "row";
  readonly kindLabel: string;
  /** The family's glyph name in the icon set, so the row is recognizable before it is read. */
  readonly kindIcon: string;
  readonly title: string;
  readonly reason: string;
  readonly urgency: AttentionUrgency;
  readonly stance: MetricStance;
  /** Whether it holds Continue right now. */
  readonly holds: boolean;
  readonly clock?: MatterClock;
  /** A standing matter's age instead of a countdown, where it has one. */
  readonly age?: string;
  readonly due?: GameDate;
  /** Where it is answered. */
  readonly href?: string;
  /** The map's framing for it, where it has a place. */
  readonly camera?: string;
  /** The region it happens in, which the map lifts, where it is one. */
  readonly selection?: string;
  /** The matter the Desk's put-off keys on, when it can be put off from its row. */
  readonly putOff?: AttentionMatter;
  /** The day a put-off would bring it back, so the control can say what it buys. */
  readonly putOffUntil?: GameDate;
};

const SEVERITY_STANCE = { routine: "neutral", serious: "caution", critical: "adverse" } as const;

/** Where a decision happens, as the map frames it: its US state, else its point, else its government. */
export function decisionCamera(cast: CastScenario): { readonly camera: string; readonly selection?: string } {
  const locus = cast.locus;
  if (locus?.state) return { camera: `state:${locus.state}`, selection: `state:${locus.state}` };
  // Abroad, the whole government is framed and detached: a point a few degrees
  // across inside a large country shows nothing but its interior.
  if (locus && locus.nation !== "USA") return { camera: `nation:${locus.nation}`, selection: `nation:${locus.nation}` };
  if (locus) return { camera: `point:${locus.lon.toFixed(3)},${locus.lat.toFixed(3)}` };
  return { camera: `nation:${cast.counterpart}`, selection: `nation:${cast.counterpart}` };
}

/**
 * The decision's response window: its case's own clock once the case is
 * seated, else the window the docket holds the document open for. A decision
 * with neither has no countdown to draw.
 */
function decisionClock(campaign: Campaign, cast: CastScenario): MatterClock | undefined {
  const record = campaign.cases?.[scenarioCaseId(cast)];
  const docketed = campaign.docket?.find((entry) => entry.id === scenarioMatterId(scenarioOccurrenceKey(cast)));
  const window = record && record.clock.kind !== "none" ? { from: record.raisedAt, to: record.clock.dueAt } : docketed ? { from: docketed.arrives, to: docketed.closes } : undefined;
  if (!window) return undefined;
  return { label: "Time to respond", window: Math.max(1, daysBetween(window.from, window.to)), left: Math.max(0, daysBetween(campaign.calendar, window.to)), unit: "day", due: window.to };
}

function decisionRow(campaign: Campaign, cast: CastScenario): BriefMatter {
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
    href: matterDoor({ id: scenarioMatterId(scenarioOccurrenceKey(cast)) })!,
    ...decisionCamera(cast),
  };
}

function itemClock(campaign: Campaign, item: AttentionItem): Pick<BriefMatter, "clock" | "age"> {
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
  if (item.clock?.kind === "elapsed") return { age: `${item.clock.name}: ${item.clock.elapsed} ${item.clock.elapsed === 1 ? item.clock.unit : (item.clock.unitPlural ?? `${item.clock.unit}s`)}` };
  return {};
}

const KIND_LABEL: Readonly<Partial<Record<AttentionItem["source"], string>>> = {
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

const KIND_ICON: Readonly<Partial<Record<AttentionItem["source"], string>>> = {
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

function itemRow(campaign: Campaign, item: AttentionItem, presented: ReadonlySet<string>): BriefMatter {
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
function putOffOf(campaign: Campaign, item: AttentionItem): Pick<BriefMatter, "putOff" | "putOffUntil"> {
  if (item.urgency === "ambient") return {};
  const matter = matterFor(item, campaign.calendar);
  return { putOff: matter, putOffUntil: deferUntil(matter, campaign.calendar, campaign.foundingDate) };
}

/**
 * Stories still running and still unanswered. A story stops time only in the
 * week it breaks; after that it is ambient, and still waits on the President's
 * answer for as long as it runs, so the Brief keeps it in the list without
 * letting it hold the week.
 */
function unansweredStories(campaign: Campaign, listed: ReadonlySet<string>): readonly AttentionItem[] {
  return attentionItems(campaign).filter(
    (item) => item.source === "scandal" && item.urgency === "ambient" && !listed.has(item.id) && scandalResponseTaken(campaign, item.id.slice("scandal:".length)) === undefined,
  );
}

/**
 * An empty cabinet seat, or an agency with nobody leading it. Neither carries
 * a deadline, so under the default setting neither ever competes for the week;
 * yet a nominee is the one thing nobody but the President can send, so the
 * Brief keeps the seat in the list, without letting it hold the week, until
 * it is filled, put off, or its kind is set to the log.
 */
const STANDING_VACANCIES: ReadonlySet<string> = new Set(["cabinet-vacant", "executive-delivery"]);

function standingVacancies(campaign: Campaign, listed: ReadonlySet<string>, settings: AttentionPolicySettings | undefined): readonly AttentionItem[] {
  return attentionItems(campaign).filter(
    (item) =>
      STANDING_VACANCIES.has(item.id) &&
      !listed.has(item.id) &&
      (settings?.[item.source] ?? defaultAttentionSetting(item.source)) !== "log" &&
      !isDeferred(campaign.deferrals, item.id, campaign.calendar),
  );
}

/**
 * Everything waiting on the President, worst first: decisions, which always
 * hold the week, then every owed row in the order the engine's composer ranks
 * them, the three it presents before the ones queued behind, then the empty
 * seats still waiting on a nominee, then the stories still waiting for an
 * answer. Other ambient rows are not here; they reach the wire and the Record.
 */
export function briefMatters(campaign: Campaign, settings?: AttentionPolicySettings): readonly BriefMatter[] {
  const presented = new Set(presentedItems(campaign, settings).map((item) => item.id));
  const owed = owedItems(campaign, settings);
  const listed = new Set(owed.map((item) => item.id));
  const stories = unansweredStories(campaign, listed);
  const vacancies = standingVacancies(campaign, listed, settings);
  return [...pendingConversations(campaign).map((cast) => decisionRow(campaign, cast)), ...[...owed, ...vacancies, ...stories].map((item) => itemRow(campaign, item, presented))];
}

/** What waits on the President, counted once for every place that shows the count. */
export type WaitingOnYou = {
  readonly matters: readonly BriefMatter[];
  readonly count: number;
  /** How many of them hold Continue right now. */
  readonly holding: number;
};

/**
 * The one count of what waits on the President. The Brief's lede, the rail's
 * badges, the bar's "waiting on you" and the bell's desk rows all read it, so
 * no two of them can ever name a different number for the same desk.
 */
export function waitingOnYou(campaign: Campaign, settings?: AttentionPolicySettings): WaitingOnYou {
  const matters = briefMatters(campaign, settings);
  return { matters, count: matters.length, holding: matters.filter((matter) => matter.holds).length };
}
