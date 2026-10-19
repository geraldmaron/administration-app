// The oversight, funding and rulemaking machinery as something content can gate
// on: four condition kinds, the readings that evaluate them, and the rules that
// refuse the combinations the engine can never produce.
//
// The subsystems landed and nothing could see them. `ScenarioCondition` had
// twenty discriminants and not one read `campaign.oversight`, `campaign.lapses`,
// `campaign.congress.appropriation` or `campaign.pendingRules`, and none of the
// four sets a flag either, so a cell that claimed to be gated on a shutdown was
// describing a dead gate. Everything here reads state the engine already keeps,
// through the engine's own exported selectors, and nothing in the engine's
// simulation changed to make it readable.
//
// A new module for the same reason `scenario-institutions.ts` and
// `scenario-topics.ts` are: `scenario.ts` and `scenario-audit.ts` are both at
// their frozen size ceilings, and one subject reads better in one file.
import {
  inShutdown,
  LAPSE_STABILITY_COST,
  selectOpenMatters,
  selectShutdown,
  type Campaign,
} from "@admin/engine";
import { z } from "zod";
import type { FindingSink } from "./scenario-audit-cohorts.js";
import {
  auditInstitutionGates,
  institutionStateMet,
  ScenarioInstitutionState,
  type InstitutionFindingKind,
} from "./scenario-institutions.js";
import type { ScenarioDef } from "./scenario.js";

export { institutionStrainValue } from "./scenario-institutions.js";

// --- The matters ------------------------------------------------------------

/**
 * Who is doing the looking, in the three shapes the engine actually opens.
 *
 * A departmental inspector general opens on the agency's own numbers, a
 * committee opens on a fact already on the record, and a special counsel is
 * appointed by the Attorney General out of a matter the department can no
 * longer be seen to handle itself.
 */
export const MATTER_ORIGINS = ["inspector-general", "committee", "special-counsel"] as const;

/**
 * The stages a matter can be waited on at.
 *
 * `closed` is deliberately absent. Every reading here counts *open* matters,
 * because an inquiry that is over is not a thing the week is about, and a gate
 * that could name `closed` would be asking one question in the schema and
 * getting the answer to another. Content about a file that has been shut gates
 * on the flag its own arc stamps.
 */
export const MATTER_STAGES = ["opened", "gathering", "reported"] as const;

/**
 * Open oversight matters against this administration, counted across the whole
 * government and narrowed by any facet the scenario states.
 *
 * `direction` was specified with these and is not here, on the same rule that
 * kept `openDocket` out of `institutionState`: `MatterDirection` has a
 * `directed` value and nothing anywhere in the engine ever opens one, so the
 * facet would have been a filter with one reachable setting and one dead one.
 * It goes in the week a president can open their own review.
 */
export const ScenarioOversightMatter = z.object({
  kind: z.literal("oversightMatter"),
  origin: z.enum(MATTER_ORIGINS).optional(),
  institution: z.string().min(1).optional(),
  stage: z.enum(MATTER_STAGES).optional(),
  /** Whether the country knows. An audit opens quiet; a committee never does. */
  public: z.boolean().optional(),
  /** Whether this administration moved against the people conducting it. */
  obstructed: z.boolean().optional(),
  /** How many matching matters have to be open. One if unstated. */
  atLeast: z.number().optional(),
});
export type ScenarioOversightMatter = z.infer<typeof ScenarioOversightMatter>;

// --- The money --------------------------------------------------------------

/**
 * Whether the government is closed, and for how long.
 *
 * `is: false` is worth having rather than assuming: a week that would read
 * absurdly during a lapse — an expansion, a state visit, a ribbon — can say so
 * instead of being written and then arriving in the wrong week.
 */
export const ScenarioShutdown = z.object({
  kind: z.literal("shutdown"),
  /** True if unstated: the condition exists to wait for a closed government. */
  is: z.boolean().optional(),
  /** Full weeks closed, counted from the first. Implies `is: true`. */
  weeksAtLeast: z.number().optional(),
});
export type ScenarioShutdown = z.infer<typeof ScenarioShutdown>;

/**
 * The book the government is funded by.
 *
 * Two facts, and they are about different things. `onPriorYear` is the
 * president who could not get a budget at all and whose government runs on
 * last year's numbers. `weeksLeftAtMost` is the run-up: how close the
 * appropriation is to running out, which is the week the negotiation actually
 * happens in and which goes negative once it has.
 *
 * `Appropriation.priorYear` — the individual lines a floor struck out — is not
 * exposed. Producing one takes a budget request in which some accounts carry
 * and others do not, and at every congressional disposition a campaign can
 * reach in its first year either the whole request carries or none of it does,
 * so the gate would have had nowhere to be true. It goes in when a board can
 * reach it.
 */
export const ScenarioAppropriation = z
  .object({
    kind: z.literal("appropriation"),
    onPriorYear: z.boolean().optional(),
    /** Weeks until the money runs out. Negative once the deadline has passed. */
    weeksLeftAtMost: z.number().optional(),
  })
  .refine((condition) => condition.onPriorYear !== undefined || condition.weeksLeftAtMost !== undefined, {
    message: "an appropriation condition that states neither facet is true of every week and gates nothing",
  });
export type ScenarioAppropriation = z.infer<typeof ScenarioAppropriation>;

/**
 * Rules the President has started and where they have got to.
 *
 * An order that goes by rulemaking changes nothing for six weeks; the whole
 * point of the clock is that the country is unchanged while it runs. Content
 * about the comment period, the week the rule binds, or the week the bench
 * stopped it is content about which status is on the record.
 */
export const PENDING_RULE_STATUSES = ["pending", "stayed", "in-effect", "canceled", "struck-down", "disapproved"] as const;

export const ScenarioPendingRule = z.object({
  kind: z.literal("pendingRule"),
  /** Any status if unstated. */
  status: z.enum(PENDING_RULE_STATUSES).optional(),
  atLeast: z.number().optional(),
});
export type ScenarioPendingRule = z.infer<typeof ScenarioPendingRule>;

/**
 * The executive branch's own state, as the condition union carries it.
 *
 * Assembled here rather than listed in `scenario.ts` so the union pays for one
 * line there however many members this grows to, and so the five kinds that
 * read the same subsystem are declared beside each other.
 */
export const EXECUTIVE_STATE_CONDITIONS = [
  ScenarioInstitutionState,
  ScenarioOversightMatter,
  ScenarioShutdown,
  ScenarioAppropriation,
  ScenarioPendingRule,
] as const;

type ExecutiveStateCondition =
  | ScenarioInstitutionState
  | ScenarioOversightMatter
  | ScenarioShutdown
  | ScenarioAppropriation
  | ScenarioPendingRule;

// --- Reading ----------------------------------------------------------------

function matchingOpenMatters(campaign: Campaign, condition: ScenarioOversightMatter): number {
  return selectOpenMatters(campaign).filter(
    (matter) =>
      (condition.origin === undefined || matter.origin.kind === condition.origin) &&
      (condition.institution === undefined || (matter.origin.kind === "inspector-general" && matter.origin.institution === condition.institution)) &&
      (condition.stage === undefined || matter.stage === condition.stage) &&
      (condition.public === undefined || matter.public === condition.public) &&
      (condition.obstructed === undefined || matter.obstructed === condition.obstructed),
  ).length;
}

function shutdownMet(campaign: Campaign, condition: ScenarioShutdown): boolean {
  if (condition.is === false) return !inShutdown(campaign);
  const reading = selectShutdown(campaign);
  if (reading === undefined) return false;
  return reading.weeks >= (condition.weeksAtLeast ?? 1);
}

function appropriationMet(campaign: Campaign, condition: ScenarioAppropriation): boolean {
  const book = campaign.congress.appropriation;
  if (condition.onPriorYear !== undefined && book.onPriorYear !== condition.onPriorYear) return false;
  if (condition.weeksLeftAtMost !== undefined && book.throughTurn - campaign.turn > condition.weeksLeftAtMost) {
    return false;
  }
  return true;
}

function pendingRuleMet(campaign: Campaign, condition: ScenarioPendingRule): boolean {
  const matching = campaign.pendingRules.filter(
    (rule) => condition.status === undefined || rule.status === condition.status,
  );
  return matching.length >= (condition.atLeast ?? 1);
}

/**
 * Every condition that reads the executive branch's own state, answered in one
 * place — so `scenario-cast.ts` spends five case labels on the subsystem rather
 * than five imports and five bodies.
 */
export function executiveStateMet(campaign: Campaign, condition: ExecutiveStateCondition): boolean {
  switch (condition.kind) {
    case "institutionState":
      return institutionStateMet(campaign, condition);
    case "oversightMatter":
      return matchingOpenMatters(campaign, condition) >= (condition.atLeast ?? 1);
    case "shutdown":
      return shutdownMet(campaign, condition);
    case "appropriation":
      return appropriationMet(campaign, condition);
    case "pendingRule":
      return pendingRuleMet(campaign, condition);
  }
}

// --- Reachability rules -----------------------------------------------------

export type ExecutiveFindingKind =
  | InstitutionFindingKind
  | "oversight-count-unreachable"
  | "oversight-facets-contradict"
  | "shutdown-gate-contradicts"
  | "pending-rule-count-unreachable";

function gatesOf<TKind extends ExecutiveStateCondition["kind"]>(
  def: ScenarioDef,
  kind: TKind,
): readonly Extract<ExecutiveStateCondition, { kind: TKind }>[] {
  return def.conditions.filter(
    (condition): condition is Extract<ExecutiveStateCondition, { kind: TKind }> => condition.kind === kind,
  );
}

/** A count gate below one is true of every campaign; a fractional one is a scale error. */
function auditCount(
  def: ScenarioDef,
  findings: FindingSink,
  kind: "oversight-count-unreachable" | "pending-rule-count-unreachable",
  subject: string,
  atLeast: number | undefined,
): void {
  if (atLeast === undefined) return;
  if (atLeast >= 1 && Number.isInteger(atLeast)) return;
  findings.push({
    kind,
    severity: "error",
    scenario: def.id,
    message:
      `waits on at least ${atLeast} ${subject}, which is a whole count — a bound under one is true of every ` +
      "campaign and a fractional one is a nought-to-one bound written against an absolute scale",
  });
}

/**
 * The three facets of a matter the engine can never combine.
 *
 * All of them are properties of the record rather than judgments about how
 * likely a board is, so all three are errors: a matter reaching `reported` sets
 * the public flag in the same transition that sets the stage, and the only
 * thing that marks a matter obstructed is a removal notice filed against the
 * inspector general conducting it — which a committee inquiry and a special
 * counsel do not have. Only one counsel runs across the whole government at a
 * time, so waiting for two is waiting forever.
 */
export function auditOversightFacets(def: ScenarioDef, findings: FindingSink): void {
  for (const gate of gatesOf(def, "oversightMatter")) {
    auditCount(def, findings, "oversight-count-unreachable", "open oversight matters", gate.atLeast);
    if (gate.stage === "reported" && gate.public === false) {
      findings.push({
        kind: "oversight-facets-contradict",
        severity: "error",
        scenario: def.id,
        message:
          "waits on a matter that has reported and is not public — reporting is the transition that makes a " +
          "matter public, so the two are never true together",
      });
    }
    if (gate.obstructed === true && gate.origin !== undefined && gate.origin !== "inspector-general") {
      findings.push({
        kind: "oversight-facets-contradict",
        severity: "error",
        scenario: def.id,
        message:
          `waits on an obstructed ${gate.origin} matter — only a departmental audit can be obstructed, because ` +
          "obstruction is what a removal notice does to the inspector general conducting one",
      });
    }
    if (gate.origin === "special-counsel" && (gate.atLeast ?? 1) > 1) {
      findings.push({
        kind: "oversight-count-unreachable",
        severity: "error",
        scenario: def.id,
        message:
          `waits on ${gate.atLeast} open special counsels — one runs across the whole government at a time, and ` +
          "no second is appointed while the first is open",
      });
    }
  }
}

/**
 * How long a lapse can run before the gate is waiting on a government that no
 * longer exists.
 *
 * A week of lapse costs `LAPSE_STABILITY_COST` of stability outright, so a
 * shutdown this long has taken a full point of it — more than any campaign
 * holds — and whatever ends the presidency has ended it well before the gate
 * comes true. Derived from the engine's own constant rather than picked, so a
 * change to the price of a lapse moves the rule with it.
 */
export const IMPLAUSIBLE_LAPSE_WEEKS = Math.ceil(1 / LAPSE_STABILITY_COST);

export function auditShutdownGate(def: ScenarioDef, findings: FindingSink): void {
  for (const gate of gatesOf(def, "shutdown")) {
    if (gate.is === false && gate.weeksAtLeast !== undefined) {
      findings.push({
        kind: "shutdown-gate-contradicts",
        severity: "error",
        scenario: def.id,
        message: "asks for an open government and for weeks of lapse at once, which are never both true",
      });
    }
    if ((gate.weeksAtLeast ?? 0) >= IMPLAUSIBLE_LAPSE_WEEKS) {
      findings.push({
        kind: "shutdown-gate-contradicts",
        severity: "warning",
        scenario: def.id,
        message:
          `waits on ${gate.weeksAtLeast} weeks of lapse, which costs more stability than a government holds — ` +
          `past about ${IMPLAUSIBLE_LAPSE_WEEKS} weeks the presidency this is written for is already over`,
      });
    }
  }
}

export function auditPendingRuleGate(def: ScenarioDef, findings: FindingSink): void {
  for (const gate of gatesOf(def, "pendingRule")) {
    auditCount(def, findings, "pending-rule-count-unreachable", "pending rules", gate.atLeast);
  }
}

/** Every rule that guards a gate on the executive branch's own state. */
export function auditExecutiveStateGates(def: ScenarioDef, findings: FindingSink): void {
  auditInstitutionGates(def, findings);
  auditOversightFacets(def, findings);
  auditShutdownGate(def, findings);
  auditPendingRuleGate(def, findings);
}
