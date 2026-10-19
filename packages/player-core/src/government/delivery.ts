import {
  INSTITUTION_CATALOG,
  implementationTerms,
  leaderCompetenceOf,
  selectExecutiveCapacity,
  type Campaign,
  type ImplementationTerms,
  type InstitutionDef,
  type InstitutionId,
} from "@admin/engine";
import { executiveTree, type ExecutiveNode, type Staffing } from "./executive-tree.js";

// How the executive branch is performing, as against how it is staffed. A
// chair count says the government is manned; delivery says whether what the
// President orders actually happens, and every part of the answer is a fact
// the President can move: fill the chair, clear the backlog, stop bending the
// agency, fund it.

export type BuiltKey = "staffing" | "morale" | "budget" | "capacity" | "leader";
export type LostKey = "vacancy" | "backlog" | "politicization" | "leader";

export type DeliveryPart<K extends string> = { readonly key: K; readonly label: string; readonly value: number };

export type DeliveryRow = {
  readonly institution: InstitutionId;
  readonly name: string;
  readonly href: string;
  readonly emblem: string;
  readonly staffing: Staffing;
  /** What the body delivers, 0..1: the built parts less the lost ones. */
  readonly quality: number;
  /** What the body could deliver, in the order a bar stacks them. */
  readonly built: readonly DeliveryPart<BuiltKey>[];
  /** What is coming off it, largest first. Empty when nothing is. */
  readonly lost: readonly DeliveryPart<LostKey>[];
  /** Why it sits where it does, in one line. */
  readonly reason: string;
};

export type BranchDelivery = {
  /** The branch's delivery, weighted by staff the way the engine weighs it. */
  readonly quality: number;
  /** What the branch is losing, weighted the same way, largest first. Only causes worth a point or more. */
  readonly lost: readonly DeliveryPart<LostKey>[];
  readonly sentence: string;
  /** Every top-level body the branch figure counts, weakest first. */
  readonly rows: readonly DeliveryRow[];
};

export const BUILT_LABELS: Readonly<Record<BuiltKey, string>> = {
  staffing: "Staff",
  morale: "Morale",
  budget: "Funding",
  capacity: "Capacity",
  leader: "Strong leader",
};

export const LOST_LABELS: Readonly<Record<LostKey, string>> = {
  vacancy: "No leader",
  backlog: "Backlog",
  politicization: "Political pressure",
  leader: "Weak leader",
};

const LOST_PHRASES: Readonly<Record<LostKey, string>> = {
  vacancy: "empty top jobs",
  backlog: "backlog",
  politicization: "political pressure",
  leader: "weak leaders",
};

/** Below this a part is rounding, not a cause. */
const VISIBLE = 0.0005;

/** The bodies `selectExecutiveCapacity` counts: everything below the presidency the President directs. */
function counted(def: InstitutionDef): boolean {
  return def.tier !== 0 && def.independence !== "independent";
}

function builtParts(terms: ImplementationTerms): readonly DeliveryPart<BuiltKey>[] {
  const keys = ["capacity", "staffing", "budget", "morale"] as const;
  const parts = keys.map((key) => ({ key, label: BUILT_LABELS[key], value: terms[key] }));
  return terms.leader > VISIBLE ? [...parts, { key: "leader", label: BUILT_LABELS.leader, value: terms.leader }] : parts;
}

function lostParts(terms: ImplementationTerms): readonly DeliveryPart<LostKey>[] {
  const parts: readonly DeliveryPart<LostKey>[] = [
    { key: "vacancy", label: LOST_LABELS.vacancy, value: terms.vacancy },
    { key: "backlog", label: LOST_LABELS.backlog, value: terms.backlog },
    { key: "politicization", label: LOST_LABELS.politicization, value: terms.politicization },
    { key: "leader", label: LOST_LABELS.leader, value: -terms.leader },
  ];
  return parts.filter((part) => part.value > VISIBLE).sort((a, b) => b.value - a.value);
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** The facts behind a body's figure, the heaviest first, falling back to its weakest input when nothing drags it. */
function reasonFor(campaign: Campaign, institution: InstitutionId, lost: readonly DeliveryPart<LostKey>[]): string {
  const runtime = campaign.institutions[institution];
  if (!runtime) return "";
  const lines = lost.slice(0, 2).map((part) => {
    if (part.key === "vacancy") return runtime.actingLeader ? `A temporary leader for ${plural(runtime.vacantDays, "day")}` : `No leader for ${plural(runtime.vacantDays, "day")}, not even a temporary one`;
    if (part.key === "backlog") return runtime.backlog < 1 ? "Work is starting to back up" : `${plural(Math.round(runtime.backlog), "item")} waiting`;
    if (part.key === "politicization") return "Serving your politics instead of its job";
    return "Its leader isn't up to the job";
  });
  if (lines.length > 0) return lines.join(" · ");
  if (runtime.budgetAdequacy < 0.6) return "Nothing is holding it back, but it doesn't have enough money";
  if (runtime.morale < 0.45) return "Nothing is holding it back, but morale is low";
  return "Nothing is holding it back";
}

/** Why one body delivers what it does, in the same line its delivery row prints. */
export function institutionReason(campaign: Campaign, institution: InstitutionId): string {
  const runtime = campaign.institutions[institution];
  const def = INSTITUTION_CATALOG.find((entry) => entry.id === institution);
  if (!runtime || !def) return "";
  return reasonFor(campaign, institution, lostParts(implementationTerms(runtime, def, leaderCompetenceOf(campaign, runtime))));
}

function rowOf(campaign: Campaign, def: InstitutionDef, node: ExecutiveNode): DeliveryRow | undefined {
  const runtime = campaign.institutions[def.id];
  if (!runtime) return undefined;
  const terms = implementationTerms(runtime, def, leaderCompetenceOf(campaign, runtime));
  const lost = lostParts(terms);
  const built = builtParts(terms);
  // Summed here rather than read from the stored figure, so the bar always
  // ends at the number beside it; the two agree from the first weekly tick.
  const quality = Math.min(1, Math.max(0, built.reduce((sum, part) => sum + part.value, 0) - lost.reduce((sum, part) => sum + part.value, 0)));
  return {
    institution: def.id,
    name: node.name,
    href: node.href,
    emblem: node.emblem,
    staffing: node.staffing,
    quality,
    built,
    lost,
    reason: reasonFor(campaign, def.id, lost),
  };
}

/** What the whole branch is losing to each cause, weighted by staff over every body the branch figure counts. */
function branchLost(campaign: Campaign): readonly DeliveryPart<LostKey>[] {
  const totals: Record<LostKey, number> = { vacancy: 0, backlog: 0, politicization: 0, leader: 0 };
  let weight = 0;
  for (const def of INSTITUTION_CATALOG.filter(counted)) {
    const runtime = campaign.institutions[def.id];
    if (!runtime) continue;
    weight += def.staffScale;
    for (const part of lostParts(implementationTerms(runtime, def, leaderCompetenceOf(campaign, runtime)))) {
      totals[part.key] += part.value * def.staffScale;
    }
  }
  if (weight === 0) return [];
  return (Object.keys(totals) as LostKey[])
    .map((key) => ({ key, label: LOST_LABELS[key], value: totals[key] / weight }))
    .filter((part) => part.value >= 0.005)
    .sort((a, b) => b.value - a.value);
}

function points(value: number): number {
  return Math.max(1, Math.round(value * 100));
}

function sentenceFor(lost: readonly DeliveryPart<LostKey>[], rows: readonly DeliveryRow[]): string {
  if (lost.length > 0) {
    const total = lost.reduce((sum, part) => sum + part.value, 0);
    const parts = lost.map((part) => `${points(part.value)} to ${LOST_PHRASES[part.key]}`);
    return `Losing ${plural(points(total), "point")}: ${parts.join(", ")}.`;
  }
  // Small offices losing ground barely move a staff-weighted figure, and
  // saying nothing is wrong beside their hatched bars would be false.
  const losing = rows.filter((row) => row.lost.length > 0);
  if (losing.length === 0) return "Nothing is slowing the work down. Every office has a leader, no work is piling up, and none is serving your politics instead of its job.";
  const cause = LOST_PHRASES[losing[0]!.lost[0]!.key];
  return `Less than a point is lost across the government, but ${plural(losing.length, "office")} ${losing.length === 1 ? "is" : "are"} slipping. The biggest problem is ${cause}.`;
}

export function branchDelivery(campaign: Campaign): BranchDelivery {
  const nodes = new Map(
    executiveTree(campaign)
      .flatMap((section) => section.nodes.flatMap((node) => [node, ...node.children]))
      .map((node) => [node.institution, node] as const),
  );
  const rows = INSTITUTION_CATALOG.filter((def) => counted(def) && def.tier === 1)
    .flatMap((def) => {
      const node = nodes.get(def.id);
      const row = node ? rowOf(campaign, def, node) : undefined;
      return row ? [row] : [];
    })
    .sort((a, b) => a.quality - b.quality || a.name.localeCompare(b.name));
  const lost = branchLost(campaign);
  return { quality: selectExecutiveCapacity(campaign), lost, sentence: sentenceFor(lost, rows), rows };
}
