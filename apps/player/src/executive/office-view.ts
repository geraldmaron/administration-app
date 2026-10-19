import { seatKindOf, type Campaign } from "@admin/engine";
import type { OfficeCondition, OfficeFile } from "@admin/player-core";

export const OFFICE_VIEWS = ["overview", "leadership", "organization", "actions", "record"] as const;
export type OfficeView = (typeof OFFICE_VIEWS)[number];
export type FillAct = "appoint" | "acting";

export function officeViewOf(value: unknown): OfficeView {
  const raw = Array.isArray(value) ? value[0] : value;
  return OFFICE_VIEWS.find((view) => view === raw) ?? "overview";
}

export function fillOf(value: unknown): FillAct | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "appoint" || raw === "acting" ? raw : undefined;
}

export function officeLede(file: OfficeFile): string {
  if (file.staffing === "vacant") return `Nobody is serving as ${file.office.title} right now.`;
  const name = file.holderName ?? "Somebody";
  return file.staffing === "acting" ? `${name} is filling in as acting ${file.office.title}, without the full authority of a confirmed leader.` : `${name} leads this office.`;
}

/** Why the chair needs the President, from what the record says is waiting or missing. */
export function officeAttention(file: OfficeFile): readonly string[] {
  const days = file.condition?.vacantDays ?? 0;
  return [
    ...(file.staffing === "vacant" ? [`Nobody is in the job${days > 0 ? `, and it has been empty ${days} days` : ""}. The office gets less done each week it stays empty.`] : []),
    ...(file.staffing === "acting" ? [`${file.holderName ?? "Someone"} is only filling in, without the full authority of the job. Nobody confirmed holds it.`] : []),
    ...file.alerts.map((alert) => alert.text),
  ];
}

export type ConditionKey = "implementationQuality" | "capacity" | "staffing" | "morale";
export const CONDITION_KEYS: readonly ConditionKey[] = ["implementationQuality", "capacity", "staffing", "morale"];

/**
 * The branch's average of each operating reading, over every body the
 * simulation runs: the benchmark one office's reading is read against. A
 * plain mean, so a small board and a large department count alike, which is
 * what "compared with its peers" means here.
 */
export function branchAverages(campaign: Campaign): Readonly<Record<ConditionKey, number>> | undefined {
  const bodies = Object.values(campaign.institutions).filter((runtime) => runtime !== undefined);
  if (bodies.length === 0) return undefined;
  const mean = (key: ConditionKey) => bodies.reduce((sum, runtime) => sum + runtime[key], 0) / bodies.length;
  return { implementationQuality: mean("implementationQuality"), capacity: mean("capacity"), staffing: mean("staffing"), morale: mean("morale") };
}

/** Where the office stands against the branch on each reading, in points, positive when above. */
export function againstBranch(condition: OfficeCondition, averages: Readonly<Record<ConditionKey, number>>): Readonly<Record<ConditionKey, number>> {
  return Object.fromEntries(CONDITION_KEYS.map((key) => [key, Math.round((condition[key] - averages[key]) * 100)])) as Record<ConditionKey, number>;
}

/** What the chair's appointment rule is, in the words the facts panel prints. */
export function appointmentWords(file: OfficeFile): { readonly title: string; readonly detail: string } {
  if (file.lever === "cabinet") return { title: "The Senate must approve", detail: "Nominate someone permanent, or name someone to fill in for now" };
  if (file.lever === "acting") return { title: "Stand-in only", detail: "You can only name someone to fill in here" };
  return { title: "Someone else picks", detail: "This office isn't filled from this screen" };
}

export type ChairAct = "appoint" | "acting" | "dismiss";

/** Whether this is a seat the Senate confirms, at the top of its body: the seats the appointments desk fills. */
export function nominable(file: OfficeFile): boolean {
  return seatKindOf(file.office.id) !== undefined && file.institution.offices[0]?.id === file.office.id;
}

/** Which acts the chair carries today, from the office's own lever, whether the Senate confirms it, and who is in it. */
export function chairActsFor(file: OfficeFile): readonly ChairAct[] {
  if (file.staffing === "confirmed") return file.lever === "cabinet" ? ["dismiss"] : [];
  const acting = file.lever !== "none" && file.office.actingAuthority !== "none" && file.office.actingAuthority !== "board-quorum";
  return [...(nominable(file) ? (["appoint"] as const) : []), ...(acting ? (["acting"] as const) : [])];
}
