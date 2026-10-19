import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  auditInertGates,
  auditPasses,
  auditReachability,
  auditScenarios,
  CORE_FLAG_VOCABULARY,
  deedsRemembered,
  ScenarioDef,
  ScenarioPack,
  type CorpusContext,
  type DeedsRemembered,
  type ScenarioFinding,
  reachabilityBoards,
} from "@admin/content";
import { z } from "zod";
import type { BindingFinding } from "./binding.js";

// The publish gate for generated scenarios: shape first (zod), then the
// content audit. A batch with one bad scenario fails as a batch — partial
// publishes are how a pool fills with almost-right content.
//
// Warnings ride along with the result rather than blocking it: a writer or a
// generation session should see every smell the audit found, but only an
// error decides whether the batch ships.

export type ScenarioValidation = {
  readonly file: string;
  readonly scenarios: number;
  readonly shapeErrors: readonly string[];
  readonly findings: readonly ScenarioFinding[];
  /**
   * Binding-contract defects, kept in their own list rather than folded into
   * `findings`: `ScenarioFindingKind` is a closed union owned by `@admin/content`
   * and describes what the *shipped* audit checks, while these are the standard
   * a new draft is held to and the corpus deliberately is not. Empty everywhere
   * except a generation batch — see `bindingFindings`.
   */
  readonly binding: readonly BindingFinding[];
  readonly ok: boolean;
  /**
   * How much of what this document remembers is ever read back. Carried on the
   * result rather than printed as a finding: it is a pool-scale statistic with
   * no threshold behind it yet, and a run reports it by merging the documents
   * it read, which no single document can do for itself.
   */
  readonly deeds: DeedsRemembered;
};

const NO_DEEDS: DeedsRemembered = deedsRemembered([]);

const Document = z.union([ScenarioPack, z.array(ScenarioDef).min(1)]);

/**
 * `corpus` is the pool this batch is landing in, as indexes rather than
 * content: passing it is what makes a batch's collisions with *already
 * shipped* scenarios visible. Omitted, the batch is only checked against
 * itself — correct for a standalone directory, wrong for a publish.
 */
export function validateScenarioDocument(
  file: string,
  raw: unknown,
  corpus?: CorpusContext,
  knownFlags: readonly string[] = CORE_FLAG_VOCABULARY,
): ScenarioValidation {
  const parsed = Document.safeParse(raw);
  if (!parsed.success) {
    const shapeErrors = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    return { file, scenarios: 0, shapeErrors, findings: [], binding: [], ok: false, deeds: NO_DEEDS };
  }
  const scenarios = Array.isArray(parsed.data) ? parsed.data : parsed.data.scenarios;
  // Reachability runs here rather than inside `auditScenarios` because it is
  // the one check that needs a board: it seals real campaigns off the shipped
  // dataset and asks whether each scenario is ever true on one. Everything the
  // audit knows is a property of the document; this is the only rule that can
  // see a scenario which clears every other one and still reaches no player.
  // The same boards then say whether each player-board gate ever turns one of
  // them away, which is how a gate added only to clear gate-on-nothing shows.
  const boards = reachabilityBoards(scenarios);
  const findings = [
    ...auditScenarios(scenarios, knownFlags, corpus),
    ...auditReachability(scenarios, boards),
    ...auditInertGates(scenarios, boards),
  ];
  return {
    file,
    scenarios: scenarios.length,
    shapeErrors: [],
    findings,
    binding: [],
    ok: auditPasses(findings),
    deeds: deedsRemembered(scenarios),
  };
}

/**
 * The documents a directory holds.
 *
 * A work directory holds the gate's own rejection reports beside the documents
 * it rejected. Reading those back in would fail every one of them on shape and
 * bury the real count under noise the gate itself wrote. Shared with the readers
 * that only measure a batch, so a second caller cannot forget the exclusion and
 * quietly report on the gate's own output.
 */
export async function scenarioDocumentPaths(dir: string): Promise<readonly string[]> {
  const entries = await readdir(dir);
  return entries
    .filter((name) => name.endsWith(".json") && !name.endsWith(".findings.json"))
    .sort()
    .map((name) => path.join(dir, name));
}

export type ScenarioDirRead = {
  readonly defs: readonly ScenarioDef[];
  /** Files that did not parse, named rather than dropped: a batch measured short is a wrong measurement. */
  readonly unreadable: readonly string[];
};

/**
 * Every scenario a directory holds, for the callers that measure a batch rather
 * than gate it. The gate is `validateScenarioDir` and stays the only thing that
 * decides whether a document may ship.
 */
export async function readScenarioDir(dir: string): Promise<ScenarioDirRead> {
  const defs: ScenarioDef[] = [];
  const unreadable: string[] = [];
  for (const file of await scenarioDocumentPaths(dir)) {
    let parsed: ReturnType<typeof Document.safeParse>;
    try {
      parsed = Document.safeParse(JSON.parse(await readFile(file, "utf8")));
    } catch {
      unreadable.push(file);
      continue;
    }
    if (!parsed.success) {
      unreadable.push(file);
      continue;
    }
    defs.push(...(Array.isArray(parsed.data) ? parsed.data : parsed.data.scenarios));
  }
  return { defs, unreadable };
}

/** Validate every .json under a directory — the CI shape of the gate. */
export async function validateScenarioDir(dir: string, corpus?: CorpusContext): Promise<readonly ScenarioValidation[]> {
  const results: ScenarioValidation[] = [];
  for (const file of await scenarioDocumentPaths(dir)) {
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      results.push({
        file,
        scenarios: 0,
        shapeErrors: [`unreadable JSON: ${error instanceof Error ? error.message : String(error)}`],
        findings: [],
        binding: [],
        ok: false,
        deeds: NO_DEEDS,
      });
      continue;
    }
    results.push(validateScenarioDocument(file, raw, corpus));
  }
  return results;
}

/**
 * The errors a shipped scenario already carries, keyed kind and message, so a
 * revision gate can tell a defect it introduced from the corpus's standing
 * debt in a field it may not touch. Reachability is left out on purpose: it is
 * the one error a revision of conditions, cast or family exists to answer.
 */
export function shippedErrorKeys(
  id: string,
  original: unknown,
  corpus?: CorpusContext,
  knownFlags?: readonly string[],
): ReadonlySet<string> {
  const findings = validateScenarioDocument(id, [original], corpus, knownFlags).findings;
  return new Set(
    findings.filter((finding) => finding.severity === "error" && finding.kind !== "unreachable-scenario").map((finding) => `${finding.kind}|${finding.message}`),
  );
}
