// The executive branch as something content can gate on: the schema for an
// `institutionState` condition, the reading that evaluates one, the strain a
// boost scales with, and the reachability rules that guard the three ways a
// writer can author one that never fires.
//
// Split out of scenario.ts and scenario-audit.ts rather than added to either,
// the same way scenario-topics.ts was: both are at their frozen size ceilings,
// and one subject reads better in one file anyway.
import { institutionDef, isMatterOpen, selectMattersFor, type Campaign } from "@admin/engine";
import { z } from "zod";
import type { FindingSink } from "./scenario-audit-cohorts.js";
import type { ScenarioDef } from "./scenario.js";

/**
 * The fields of an institution's live state a scenario may wait on.
 *
 * Deliberately only the readings the runtime honestly carries today. Every one
 * of these is a number a player can already see on the Government screen and
 * move with an act of their own — appoint or leave a chair empty, lean on an
 * agency, let a backlog build — which is the whole point: content gated on
 * this becomes content the player's own administration summoned.
 *
 * `openDocket` was specified with these and is not here: nothing in the engine
 * keeps a docket per institution (the docket that exists is the legislative
 * one, on bills, and it is not a property of an agency), so the field would
 * have been a gate that could never read anything. It goes in when a store
 * does.
 */
export const INSTITUTION_STATE_FIELDS = [
  /** What actually comes out, 0..1: the engine's derived implementationQuality. */
  "delivery",
  /** How far the body has been bent toward this administration's politics, 0..1. */
  "politicization",
  /** Work owed. An unbounded count, not a ratio — a backlog has no ceiling. */
  "backlog",
  /** Days the top office has stood empty. A count. */
  "vacantDays",
  /** How many oversight matters into this body are open right now. A count. */
  "openMatters",
] as const;
export const ScenarioInstitutionField = z.enum(INSTITUTION_STATE_FIELDS);
export type ScenarioInstitutionField = z.infer<typeof ScenarioInstitutionField>;

/** The two fields read on a nought-to-one scale; the rest are counts. */
const UNIT_FIELDS: ReadonlySet<string> = new Set<ScenarioInstitutionField>(["delivery", "politicization"]);

/**
 * The state of one named body of the executive branch.
 *
 * The institution is validated against the engine's catalog at parse time
 * rather than left as a free string: an id with a typo in it is the exact
 * shape of dead content this gate exists to make impossible, and it is
 * cheaper to refuse than to audit.
 */
export const ScenarioInstitutionState = z.object({
  kind: z.literal("institutionState"),
  institution: z.string().min(1).refine((id) => institutionDef(id) !== undefined, {
    message: "institution is not in the engine's institution catalog",
  }),
  field: ScenarioInstitutionField,
  atLeast: z.number().optional(),
  atMost: z.number().optional(),
});
export type ScenarioInstitutionState = z.infer<typeof ScenarioInstitutionState>;

// --- Reading ----------------------------------------------------------------

/** Undefined for a board that carries no runtime for this body at all. */
export function institutionReading(
  campaign: Campaign,
  institution: string,
  field: ScenarioInstitutionField,
): number | undefined {
  const runtime = campaign.institutions[institution];
  if (runtime === undefined) return undefined;
  switch (field) {
    case "delivery":
      return runtime.implementationQuality;
    case "politicization":
      return runtime.politicization;
    case "backlog":
      return runtime.backlog;
    case "vacantDays":
      return runtime.vacantDays;
    case "openMatters":
      return selectMattersFor(campaign, institution).filter(isMatterOpen).length;
  }
}

export function institutionStateMet(campaign: Campaign, condition: ScenarioInstitutionState): boolean {
  const value = institutionReading(campaign, condition.institution, condition.field);
  if (value === undefined) return false;
  if (condition.atLeast !== undefined && value < condition.atLeast) return false;
  if (condition.atMost !== undefined && value > condition.atMost) return false;
  return true;
}

/**
 * How hollow the body this scenario is about has got, 0..1 — the multiplier
 * behind the `institutionStrain` boost.
 *
 * The worst of the two readings of hollowness the runtime already carries:
 * what fails to come out (delivery is derived from vacancy, backlog, morale
 * and budget, so all four are in here without being double-counted) and how
 * far the body has been bent. Content about an agency falling apart therefore
 * gets likelier as it falls apart, which is what dynamic urgency has meant
 * everywhere else it is spelled.
 *
 * Zero for a scenario with no `institutionState` condition — there is no body
 * for the weight to read, and the audit refuses that as an inert boost.
 */
export function institutionStrainValue(
  campaign: Campaign,
  conditions: readonly { readonly kind: string }[],
): number {
  const gate = conditions.find(
    (condition): condition is ScenarioInstitutionState => condition.kind === "institutionState",
  );
  if (gate === undefined) return 0;
  const runtime = campaign.institutions[gate.institution];
  if (runtime === undefined) return 0;
  return Math.max(1 - runtime.implementationQuality, runtime.politicization);
}

// --- Reachability rules -----------------------------------------------------

/**
 * The findings these rules raise, named once so `scenario-audit.ts` carries the
 * subsystem's whole vocabulary in one member of its union rather than one line
 * per rule in a file that has no lines left.
 */
export type InstitutionFindingKind =
  | "institution-bounds-scale"
  | "unknown-institution"
  | "institution-vacancy-gate-unfounded"
  | "institution-politicization-unreachable"
  | "institution-open-matters-unreachable";

function institutionGates(def: ScenarioDef): readonly ScenarioInstitutionState[] {
  return def.conditions.filter(
    (condition): condition is ScenarioInstitutionState => condition.kind === "institutionState",
  );
}

/**
 * A bound written on the wrong scale for its field.
 *
 * The same defect that shipped a `metric: "treasury"` bound written nought-to-
 * one against a treasury holding tens of thousands: it parses, it audits
 * clean, and it is never true. Here it has two directions — a 0..1 field asked
 * for more than 1, and a count field asked for a fraction of one unit — and
 * both are certainly dead rather than probably dead, so both are errors.
 */
export function auditInstitutionBoundsScale(def: ScenarioDef, findings: FindingSink): void {
  for (const gate of institutionGates(def)) {
    if (institutionDef(gate.institution) === undefined) {
      findings.push({
        kind: "unknown-institution",
        severity: "error",
        scenario: def.id,
        message: `waits on institution "${gate.institution}", which is not in the engine's institution catalog`,
      });
      continue;
    }
    const unit = UNIT_FIELDS.has(gate.field);
    for (const [name, bound] of [["atLeast", gate.atLeast], ["atMost", gate.atMost]] as const) {
      if (bound === undefined) continue;
      if (unit && bound > 1) {
        findings.push({
          kind: "institution-bounds-scale",
          severity: "error",
          scenario: def.id,
          message: `${gate.field} is read 0..1, so ${name} ${bound} on "${gate.institution}" can never be met`,
        });
      }
      if (!unit && bound > 0 && bound < 1) {
        findings.push({
          kind: "institution-bounds-scale",
          severity: "error",
          scenario: def.id,
          message:
            `${gate.field} is a count, not a 0..1 reading, so ${name} ${bound} on "${gate.institution}" is a ` +
            "nought-to-one bound written against an absolute scale",
        });
      }
    }
  }
}

/**
 * Content waiting on an empty chair at a body whose chair the founding fills.
 *
 * A department run from a cabinet seat is led on day one, so its `vacantDays`
 * only ever leaves zero after the President removes somebody. A scenario that
 * waits on the vacancy without waiting on the deed that made it is either
 * dormant for the whole campaign or arriving out of order, and the fix is a
 * flag its own arc stamps when the chair is emptied.
 *
 * A warning rather than an error: a batch may legitimately be written for a
 * board that has already had its removals, and this rule cannot see the pack
 * that supplies them.
 */
export function auditInstitutionVacancyGate(def: ScenarioDef, findings: FindingSink): void {
  const waitsOnDeed = def.conditions.some((condition) => condition.kind === "flag" && condition.is);
  if (waitsOnDeed) return;
  for (const gate of institutionGates(def)) {
    if (gate.field !== "vacantDays" || (gate.atLeast ?? 0) <= 0) continue;
    if (institutionDef(gate.institution)?.cabinetRole === undefined) continue;
    findings.push({
      kind: "institution-vacancy-gate-unfounded",
      severity: "warning",
      scenario: def.id,
      message:
        `waits on ${gate.atLeast} vacant days at "${gate.institution}", whose chair the founding fills — ` +
        "nothing empties it but a removal, so gate this on the flag the removal stamps or it waits forever",
    });
  }
}

/**
 * How politicized an insulated body can plausibly get before content asking
 * for more is asking for a board no campaign reaches.
 *
 * Founding is 0.1 and the week decays it. It rises only in steps a president
 * takes deliberately — leaning on an assessment, removing an officer for
 * cause — and a body outside the President's direct line is the one they can
 * do that to least often, since its protected offices refuse removal outright.
 * Past this a gate needs two or three separate acts against one insulated
 * agency inside the decay window, which is close enough to never that a writer
 * should be told.
 */
export const INSULATED_POLITICIZATION_CEILING = 0.4;

export function auditInstitutionPoliticizationReach(def: ScenarioDef, findings: FindingSink): void {
  for (const gate of institutionGates(def)) {
    if (gate.field !== "politicization") continue;
    if ((gate.atLeast ?? 0) <= INSULATED_POLITICIZATION_CEILING) continue;
    const independence = institutionDef(gate.institution)?.independence;
    if (independence === undefined || independence === "executive") continue;
    findings.push({
      kind: "institution-politicization-unreachable",
      severity: "warning",
      scenario: def.id,
      message:
        `waits on politicization at least ${gate.atLeast} at "${gate.institution}", a ${independence} body — ` +
        `an insulated agency rarely passes ${INSULATED_POLITICIZATION_CEILING}, so this is very nearly unreachable`,
    });
  }
}

/**
 * The boost and the gate are one mechanism: strain reads the body the
 * scenario's own condition names, so a boost with no `institutionState`
 * beside it is weight scaling on a number that is always zero. The same
 * inert-boost error `flagAge` carries for the same reason.
 */
export function auditInstitutionStrainBoost(def: ScenarioDef, findings: FindingSink): void {
  if (!(def.boosts ?? []).some((boost) => boost.source === "institutionStrain")) return;
  if (institutionGates(def).length > 0) return;
  findings.push({
    kind: "inert-boost",
    severity: "error",
    scenario: def.id,
    message: 'boosts on "institutionStrain" but names no institutionState condition, so there is no body to read strain off',
  });
}

/**
 * A body asked to be under two audits at once.
 *
 * `openMatters` counts what this institution's own inspector general has
 * running, and the engine opens an audit only at a body that has nothing
 * running — one file per office, so the count is nought or one and never two.
 * A gate for two is the exact shape of dead content this module exists to
 * refuse: it parses, it passes every bound, and it waits forever. Content that
 * wants a body with two proceedings against it wants an `oversightMatter` gate,
 * which counts across origins.
 */
export function auditInstitutionOpenMatters(def: ScenarioDef, findings: FindingSink): void {
  for (const gate of institutionGates(def)) {
    if (gate.field !== "openMatters" || (gate.atLeast ?? 0) <= 1) continue;
    findings.push({
      kind: "institution-open-matters-unreachable",
      severity: "error",
      scenario: def.id,
      message:
        `waits on ${gate.atLeast} open matters at "${gate.institution}", but an inspector general opens an audit ` +
        "only at a body with none running, so this count is never above one",
    });
  }
}

export function auditInstitutionGates(def: ScenarioDef, findings: FindingSink): void {
  auditInstitutionBoundsScale(def, findings);
  auditInstitutionOpenMatters(def, findings);
  auditInstitutionVacancyGate(def, findings);
  auditInstitutionPoliticizationReach(def, findings);
  auditInstitutionStrainBoost(def, findings);
}
