import {
  AGE_BUCKET_EDGES,
  SERVICES,
  WEEKLY_INTAKE,
  ageBands,
  institutionDef,
  institutionInProse,
  institutionOpening,
  lateShare,
  pendingTotal,
  selectWorkDelivery,
  serviceDepartment,
  type Campaign,
  type ServiceDefinition,
  type ServiceId,
  type ServiceRuntime,
  type ServiceWeek,
  type WorkDelivery,
} from "@admin/engine";
import { institutionReason } from "./delivery.js";
import { departmentProjects, independentAction, type ProjectsReading } from "./projects.js";
import { executiveTree, type ExecutiveNode } from "./executive-tree.js";

// The departments' case work, read for the President: which services are
// being delivered, which are failing, why, who owns the work and what can be
// done about it. Every service is in its own unit (a normal week's intake), so
// the reading compares services by status and never pools a rate across them:
// adding one service's late share to another's would weigh them by an intake
// the engine does not know.

export type ServiceStatus = "opening" | "keeping-up" | "falling-behind" | "delayed" | "cutting-corners" | "failing" | "stopped";
export type ServiceTone = "good" | "watch" | "bad" | "neutral";

export type ServiceAge = {
  readonly key: "fresh" | "month" | "quarter" | "half";
  readonly label: string;
  /** Cases of this age, in weeks of normal intake. */
  readonly weeks: number;
  readonly late: boolean;
};

export type ServiceRow = {
  readonly id: ServiceId;
  readonly name: string;
  readonly department: string;
  readonly owner: string;
  readonly href: string;
  readonly emblem: string;
  readonly status: ServiceStatus;
  readonly statusLabel: string;
  readonly tone: ServiceTone;
  readonly standardWeeks: number;
  readonly ages: readonly ServiceAge[];
  readonly pendingWeeks: number;
  readonly lateShare: number;
  /** Of last week's decisions, the share that were wrong. Absent before the first week. */
  readonly wrongShare?: number;
  /** Of last week's decisions, the share that were refusals. Only where the service can refuse. */
  readonly refusedShare?: number;
  readonly why: string;
  readonly action: string;
};

export type ServicesReading = {
  readonly rows: readonly ServiceRow[];
  readonly summary: string;
  /** The weeks of intake every row's bar is drawn against, so rows compare. */
  readonly scaleWeeks: number;
  /** The departments' grant programs, read on their own terms below the case work. */
  readonly projects: ProjectsReading;
};

const STATUS_LABELS: Readonly<Record<ServiceStatus, string>> = {
  opening: "Not yet tracked",
  "keeping-up": "Keeping up",
  "falling-behind": "Falling behind",
  delayed: "Delayed",
  "cutting-corners": "Saying no to clear cases",
  failing: "Failing",
  stopped: "Stopped",
};

const STATUS_TONES: Readonly<Record<ServiceStatus, ServiceTone>> = {
  opening: "neutral",
  "keeping-up": "good",
  "falling-behind": "watch",
  delayed: "watch",
  "cutting-corners": "bad",
  failing: "bad",
  stopped: "bad",
};

// Worst first, for the order rows are listed in.
const SEVERITY: readonly ServiceStatus[] = ["stopped", "failing", "cutting-corners", "delayed", "falling-behind", "keeping-up", "opening"];

const AGE_LABELS = ["Under 4 weeks", "4 to 13 weeks", "13 to 26 weeks", "Over 26 weeks"] as const;
const AGE_KEYS = ["fresh", "month", "quarter", "half"] as const;

// Past these a service is failing rather than behind: half its cases late, or
// one decision in seven wrong.
const FAILING_LATE = 0.5;
const FAILING_WRONG = 0.15;
const BEHIND_LATE = 0.2;
const SHORTCUT_SHARE = 0.1;

const pct = (value: number) => `${Math.round(value * 100)}%`;
const weeksText = (value: number) => `${value < 10 ? value.toFixed(1) : Math.round(value)} weeks`;

function nameOf(id: string): string {
  return institutionDef(id)?.name ?? id;
}

function statusOf(runtime: ServiceRuntime, def: ServiceDefinition, delivery: WorkDelivery, last: ServiceWeek): ServiceStatus {
  if (delivery.status === "blocked") return "stopped";
  // Ahead of failing, because refusals pushed through under pressure are the
  // cause of the errors and the lateness a failing reading would describe.
  if (last.decided > 0 && last.pressured / last.decided >= SHORTCUT_SHARE) return "cutting-corners";
  const late = lateShare(runtime, def);
  const wrong = last.decided === 0 ? 0 : last.errors / last.decided;
  if (late >= FAILING_LATE || wrong >= FAILING_WRONG) return "failing";
  // A slow approval is only news when it is what leaves the service behind.
  const behind = last.arrivals + last.rework > last.decided + last.withdrawn || late >= BEHIND_LATE;
  if (!behind) return "keeping-up";
  return delivery.status === "delayed" ? "delayed" : "falling-behind";
}

function whyOf(status: ServiceStatus, row: { readonly def: ServiceDefinition; readonly delivery: WorkDelivery; readonly late: number; readonly last: ServiceWeek; readonly pending: number }): string {
  const { def, delivery, last } = row;
  const wrong = last.decided === 0 ? 0 : last.errors / last.decided;
  const binding = delivery.binding ? nameOf(delivery.binding) : "";
  if (status === "stopped") return `${institutionOpening(binding)} isn't giving its approvals, so no ${def.unit} can be finished.`;
  if (status === "cutting-corners") return `${pct(last.pressured / last.decided)} of last week's ${def.unit} were closed by ${def.shortcut?.kind === "plea" ? "forcing plea deals" : "pushing through refusals"} to shrink the pile of waiting cases, and ${pct(wrong)} of all decisions were wrong.`;
  if (status === "failing") return `${pct(row.late)} of ${def.unit} have waited longer than ${def.standardWeeks} weeks, and ${pct(wrong)} of last week's decisions were wrong.`;
  if (status === "delayed") return `Falling behind because every case needs ${institutionInProse(binding)}'s approval, and that approval comes more slowly than ${institutionInProse(nameOf(def.work.owner))} can work.`;
  if (status === "falling-behind") return `Deciding fewer ${def.unit} than come in. There's ${weeksText(row.pending / WEEKLY_INTAKE)} of new cases waiting, and ${pct(row.late)} have waited more than ${def.standardWeeks} weeks.`;
  return `Keeping up with new cases. ${row.late > 0 ? `${pct(row.late)} have waited` : "Nothing has waited"} more than ${def.standardWeeks} weeks.`;
}

function actionOf(campaign: Campaign, status: ServiceStatus, def: ServiceDefinition, delivery: WorkDelivery, seatTitle: string): string {
  if (status === "keeping-up") return "Nothing needed.";
  if (status === "cutting-corners") {
    return def.shortcut?.kind === "plea"
      ? `The ${seatTitle} is letting prosecutors push people into plea deals to clear cases faster. Someone with more integrity in the job would have each case go to trial or be dropped based on the facts.`
      : `The ${seatTitle} is turning cases down instead of deciding them. Someone with more integrity in the job would decide each case properly.`;
  }
  const body = (status === "stopped" || status === "delayed") && delivery.binding ? delivery.binding : def.work.owner;
  if (body !== def.work.owner && institutionDef(body)?.independence === "independent") return independentAction(nameOf(body));
  const reason = institutionReason(campaign, body);
  // With nothing dragging it, the body is doing what it was built to do and
  // the work still outruns it; saying "nothing is dragging it" as the remedy
  // would point the President at nothing.
  if (reason === "Nothing is holding it back") return `${institutionOpening(nameOf(body))} has nothing holding it back, but it isn't big enough for this much work.`;
  return `${nameOf(body)}: ${reason}.`;
}

function ages(runtime: ServiceRuntime | undefined, def: ServiceDefinition): readonly ServiceAge[] {
  const lateFrom = AGE_BUCKET_EDGES.indexOf(def.standardWeeks) + 1;
  const bands = runtime ? ageBands(runtime) : [0, 0, 0, 0];
  return AGE_KEYS.map((key, index) => ({
    key,
    label: AGE_LABELS[index]!,
    weeks: bands[index]! / WEEKLY_INTAKE,
    late: index >= lateFrom,
  }));
}

function rowOf(campaign: Campaign, def: ServiceDefinition, nodes: ReadonlyMap<string, ExecutiveNode>): ServiceRow {
  const runtime = campaign.services?.[def.id];
  const delivery = selectWorkDelivery(campaign, def.work);
  const department = serviceDepartment(def);
  const node = nodes.get(def.work.owner) ?? nodes.get(department);
  const seatTitle = nodes.get(department)?.title ?? "Secretary";
  const last = runtime?.last;
  const status: ServiceStatus = runtime && last ? statusOf(runtime, def, delivery, last) : "opening";
  const label = status === "cutting-corners" && def.shortcut?.kind === "plea" ? "Forcing plea deals to clear cases" : STATUS_LABELS[status];
  const pending = runtime ? pendingTotal(runtime) : 0;
  const late = runtime ? lateShare(runtime, def) : 0;
  return {
    id: def.id,
    name: def.name,
    department: nameOf(department),
    owner: nameOf(def.work.owner),
    href: node?.href ?? "",
    emblem: node?.emblem ?? "",
    status,
    statusLabel: label,
    tone: STATUS_TONES[status],
    standardWeeks: def.standardWeeks,
    ages: ages(runtime, def),
    pendingWeeks: pending / WEEKLY_INTAKE,
    lateShare: late,
    ...(last && last.decided > 0 ? { wrongShare: last.errors / last.decided } : {}),
    ...(def.shortcut?.kind === "refusal" && last && last.decided > 0 ? { refusedShare: last.refused / last.decided } : {}),
    why: runtime && last ? whyOf(status, { def, delivery, late, last, pending }) : "Its record starts at the end of this week.",
    action: runtime && last ? actionOf(campaign, status, def, delivery, seatTitle) : "Nothing yet.",
  };
}

function summaryOf(rows: readonly ServiceRow[]): string {
  if (rows.every((row) => row.status === "opening")) return "Tracking of the departments' case work starts at the end of this week.";
  const keeping = rows.filter((row) => row.status === "keeping-up").length;
  const worst = rows[0]!;
  const lead = `${keeping} of ${rows.length} services keeping up.`;
  return worst.status === "keeping-up" ? `${lead} Nothing is behind.` : `${lead} The worst is ${worst.name.toLowerCase()}: ${worst.statusLabel.toLowerCase()}.`;
}

export function departmentServices(campaign: Campaign): ServicesReading {
  const nodes = new Map(
    executiveTree(campaign)
      .flatMap((section) => section.nodes.flatMap((node) => [node, ...node.children]))
      .map((node) => [node.institution, node] as const),
  );
  const rows = SERVICES.map((def) => rowOf(campaign, def, nodes)).sort(
    (a, b) => SEVERITY.indexOf(a.status) - SEVERITY.indexOf(b.status) || a.name.localeCompare(b.name),
  );
  const scaleWeeks = Math.max(8, Math.ceil(Math.max(...rows.map((row) => row.pendingWeeks))));
  return { rows, summary: summaryOf(rows), scaleWeeks, projects: departmentProjects(campaign, nodes) };
}
