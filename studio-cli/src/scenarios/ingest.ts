import { ScenarioClass, ScenarioDef, ScenarioSeverity } from "@admin/content";
import type { ScenarioBriefSpec } from "./brief.js";
import { KIT_CASTS, type KitCast } from "./kit-brief.js";
import { KIT_KIND } from "./kit.js";

// The pure half of `studio scenarios ingest`: read a kit file's header, sort
// its scenarios into the cells a session-driver job is made of, and turn the
// gate's findings back into a report keyed by scenario id. The gate itself is
// not here: ingest writes the job and runs the same `scenarios run` every
// other batch faces.

export type Refusal = { readonly index: number; readonly id?: string; readonly reason: string };

export type Cell = {
  readonly key: string;
  readonly spec: ScenarioBriefSpec;
  readonly scenarios: readonly unknown[];
  readonly ids: readonly string[];
};

export type Header =
  | { readonly ok: true; readonly kitVersion: string; readonly author?: string; readonly scenarios: readonly unknown[] }
  | { readonly ok: false; readonly reason: string };

const REGENERATE = "node studio-cli/dist/cli.js scenarios kit --out <dir>";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readHeader(raw: unknown, currentVersion: string): Header {
  if (Array.isArray(raw) || !isRecord(raw) || raw.kind !== KIT_KIND) {
    return {
      ok: false,
      reason: `not a scenario kit file: the top level must be an object with "kind": "${KIT_KIND}". A bare array or another document was not written against the kit — give the author a kit (${REGENERATE}).`,
    };
  }
  if (typeof raw.kitVersion !== "string" || raw.kitVersion !== currentVersion) {
    const theirs = typeof raw.kitVersion === "string" ? `kit ${raw.kitVersion}` : "no kit version";
    return {
      ok: false,
      reason: `stale kit: this file carries ${theirs}, and the current kit is ${currentVersion}. The rules changed after the author's kit was made, so nothing in it was checked. Regenerate the kit (${REGENERATE}), give it to the author, and have them check these scenarios against the new BRIEF.md and send them back with "kitVersion": "${currentVersion}".`,
    };
  }
  if (!Array.isArray(raw.scenarios) || raw.scenarios.length === 0) {
    return { ok: false, reason: 'the file has no scenarios: "scenarios" must be a non-empty array of ScenarioDef objects.' };
  }
  const author = typeof raw.author === "string" && raw.author.trim().length > 0 ? raw.author.trim() : undefined;
  return { ok: true, kitVersion: raw.kitVersion, scenarios: raw.scenarios, ...(author ? { author } : {}) };
}

type Placed = { readonly key: string; readonly spec: Omit<ScenarioBriefSpec, "count">; readonly id: string; readonly opener: boolean };

function place(raw: unknown, index: number, seen: ReadonlySet<string>): Placed | Refusal {
  if (!isRecord(raw)) return { index, reason: "not a JSON object" };
  const id = typeof raw.id === "string" && raw.id.length > 0 ? raw.id : undefined;
  const problems: string[] = [];
  if (!id) problems.push('no "id"');
  else if (seen.has(id)) problems.push(`"id" ${id} appears earlier in the file`);
  const klass = ScenarioClass.safeParse(raw.class);
  if (!klass.success) problems.push(`"class" must be one of ${ScenarioClass.options.join(", ")}`);
  const severity = ScenarioSeverity.safeParse(raw.severity);
  if (!severity.success) problems.push(`"severity" must be one of ${ScenarioSeverity.options.join(", ")}`);
  const pick = isRecord(raw.cast) ? raw.cast.pick : undefined;
  if (pick === "nation") problems.push('"cast.pick" "nation" is a set-piece, which needs an owner and is written in the repository');
  else if (!KIT_CASTS.includes(pick as KitCast)) problems.push(`"cast.pick" must be one of ${KIT_CASTS.join(", ")}`);
  if (problems.length > 0 || !id || !klass.success || !severity.success) {
    return { index, ...(id ? { id } : {}), reason: problems.join("; ") };
  }
  const cast = pick as KitCast;
  const spec = { class: klass.data, severity: severity.data, cast };
  // A family is one thing: its members span classes, casts and severities, and
  // each of those cells alone fails the arc rules (an opener with no close, a
  // close with no opener). The family is gated as the one batch it is.
  const family = isRecord(raw.family) && typeof raw.family.id === "string" && raw.family.id.length > 0 ? raw.family : undefined;
  if (family) return { key: `arc:${family.id as string}`, spec: { ...spec, arc: true }, id, opener: family.role === "opener" };
  return { key: `${klass.data}:${cast}:${severity.data}`, spec, id, opener: false };
}

/**
 * Sort a file's scenarios into cells. A scenario the gate could not be pointed
 * at (no id, no class, a cast the kit does not offer) is refused here with the
 * reason, because a cell is chosen by exactly those fields.
 */
export function planCells(scenarios: readonly unknown[]): { readonly cells: readonly Cell[]; readonly refused: readonly Refusal[] } {
  const groups = new Map<string, { spec: Omit<ScenarioBriefSpec, "count">; scenarios: unknown[]; ids: string[] }>();
  const refused: Refusal[] = [];
  const seen = new Set<string>();
  scenarios.forEach((raw, index) => {
    const placed = place(raw, index, seen);
    if ("reason" in placed) {
      refused.push(placed);
      return;
    }
    seen.add(placed.id);
    const group = groups.get(placed.key) ?? { spec: placed.spec, scenarios: [], ids: [] };
    // The opener names the cell's class, cast and severity; a close that arrives first does not.
    groups.set(placed.key, { spec: placed.opener ? placed.spec : group.spec, scenarios: [...group.scenarios, raw], ids: [...group.ids, placed.id] });
  });
  const cells = [...groups.entries()].map(([key, group]) => ({
    key,
    spec: { ...group.spec, count: group.scenarios.length },
    scenarios: group.scenarios,
    ids: group.ids,
  }));
  return { cells, refused };
}

export type Defect = {
  readonly scenario: string;
  readonly severity: "error" | "warning";
  readonly kind: string;
  readonly message: string;
};

function shapeDefect(error: string, ids: readonly string[]): Defect {
  const match = /^(\d+)(?:\.|:)/.exec(error);
  const scenario = match ? (ids[Number(match[1])] ?? "(cell)") : "(cell)";
  return { scenario, severity: "error", kind: "shape", message: error };
}

/**
 * The gate reads a document as a pack or an array, so a malformed scenario
 * fails that union as a whole with one "(root): Invalid input" and no path.
 * An author cannot fix that, so each scenario is parsed on its own here to
 * name the field. The verdict stays the gate's; this only says where.
 */
function shapeDetail(scenarios: readonly unknown[], ids: readonly string[]): readonly Defect[] {
  return scenarios.flatMap((raw, index) => {
    const parsed = ScenarioDef.safeParse(raw);
    if (parsed.success) return [];
    return parsed.error.issues.map((issue) => ({
      scenario: ids[index] ?? "(cell)",
      severity: "error" as const,
      kind: "shape",
      message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    }));
  });
}

/** The session driver's findings file, re-keyed by scenario id; `scenarios` is the cell's output, for shape detail. */
export function defectsFrom(findings: unknown, ids: readonly string[], scenarios: readonly unknown[] = []): readonly Defect[] {
  if (!isRecord(findings)) return [];
  const list = (key: string): Record<string, unknown>[] =>
    Array.isArray(findings[key]) ? (findings[key] as unknown[]).filter(isRecord) : [];
  const text = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);
  const detail = shapeDetail(scenarios, ids);
  const shape = (Array.isArray(findings.shapeErrors) ? findings.shapeErrors : [])
    .filter((error): error is string => typeof error === "string")
    .flatMap((error) => (error.startsWith("(root)") && detail.length > 0 ? detail : [shapeDefect(error, ids)]));
  const audit = list("findings").map((finding) => ({
    scenario: text(finding.scenario, "(cell)"),
    severity: finding.severity === "error" ? ("error" as const) : ("warning" as const),
    kind: text(finding.kind, "audit"),
    message: text(finding.message, ""),
  }));
  const binding = list("binding").map((finding) => ({
    scenario: text(finding.scenario, "(cell)"),
    severity: "error" as const,
    kind: text(finding.kind, "binding"),
    message: text(finding.message, ""),
  }));
  return [...shape, ...audit, ...binding];
}

export type CellOutcome = {
  readonly itemId: string;
  readonly cell: string;
  readonly ids: readonly string[];
  readonly passed: boolean;
  readonly defects: readonly Defect[];
};

export type IngestReport = {
  readonly source: string;
  readonly jobId: string;
  readonly kitVersion: string;
  readonly author?: string;
  readonly cells: readonly CellOutcome[];
  readonly refused: readonly Refusal[];
};

const passedIds = (report: IngestReport) => report.cells.filter((cell) => cell.passed).flatMap((cell) => cell.ids);
const returnedCells = (report: IngestReport) => report.cells.filter((cell) => !cell.passed);

export function needsPasteBack(report: IngestReport): boolean {
  return report.refused.length > 0 || returnedCells(report).length > 0;
}

function defectLine(defect: Defect): string {
  return `${defect.severity} [${defect.kind}]: ${defect.message}`;
}

export function formatReport(report: IngestReport, pasteBack?: string): string {
  const returned = returnedCells(report);
  const warned = report.cells.filter((cell) => cell.passed && cell.defects.length > 0);
  return [
    `INGEST ${report.source} -> job ${report.jobId} (kit ${report.kitVersion}${report.author ? `, author: ${report.author}` : ""})`,
    `passed: ${passedIds(report).length} scenario(s) in ${report.cells.length - returned.length} cell(s)`,
    ...report.cells.filter((cell) => cell.passed).map((cell) => `  ${cell.cell}: ${cell.ids.join(", ")}`),
    ...warned.flatMap((cell) => cell.defects.map((defect) => `    [${defect.scenario}] ${defectLine(defect)}`)),
    `returned with findings: ${returned.flatMap((cell) => cell.ids).length} scenario(s) in ${returned.length} cell(s)`,
    ...returned.flatMap((cell) => [
      `  ${cell.cell}: ${cell.ids.join(", ")}`,
      ...cell.defects.map((defect) => `    [${defect.scenario}] ${defectLine(defect)}`),
    ]),
    `refused before the gate: ${report.refused.length}`,
    ...report.refused.map((refusal) => `  #${refusal.index}${refusal.id ? ` ${refusal.id}` : ""}: ${refusal.reason}`),
    ...(pasteBack ? [`findings for the author: ${pasteBack}`] : []),
  ].join("\n");
}

function returnedSection(cell: CellOutcome): readonly string[] {
  return cell.ids.flatMap((id) => {
    const own = cell.defects.filter((defect) => defect.scenario === id);
    const shared = cell.defects.filter((defect) => !cell.ids.includes(defect.scenario));
    const named = [...own, ...shared];
    return [
      `### ${id} (${cell.cell})`,
      "",
      ...(named.length > 0
        ? named.map((defect) => `- ${defectLine(defect)}`)
        : ["- Nothing is named against this scenario. It was held because the gate judges a cell as one batch; send it back unchanged with the others."]),
      "",
    ];
  });
}

/** The findings file an author pastes back into the chat that wrote the batch. */
export function formatPasteBack(report: IngestReport): string {
  const accepted = passedIds(report);
  return [
    `# Findings for ${report.source}`,
    "",
    `Kit version ${report.kitVersion}. Checked by the game's validator as job ${report.jobId}.`,
    "",
    "Fix the scenarios below and return a new file holding only them, with the same ids and the same",
    `"kitVersion": "${report.kitVersion}". Every error must be gone; read each warning and fix it unless you`,
    "can say why it is wrong for this scenario.",
    "",
    ...(accepted.length > 0 ? [`Accepted, do not send again: ${accepted.join(", ")}.`, ""] : []),
    ...(returnedCells(report).length > 0 ? ["## Returned by the gate", "", ...returnedCells(report).flatMap(returnedSection)] : []),
    ...(report.refused.length > 0
      ? [
          "## Refused before the gate",
          "",
          "These could not be sorted into a cell, so nothing else about them was checked yet.",
          "",
          ...report.refused.map((refusal) => `- scenario #${refusal.index}${refusal.id ? ` (${refusal.id})` : ""}: ${refusal.reason}`),
          "",
        ]
      : []),
  ].join("\n");
}
