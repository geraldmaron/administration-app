import { type Campaign } from "@admin/engine";
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
export declare const INSTITUTION_STATE_FIELDS: readonly ["delivery", "politicization", "backlog", "vacantDays", "openMatters"];
export declare const ScenarioInstitutionField: z.ZodEnum<{
    delivery: "delivery";
    politicization: "politicization";
    backlog: "backlog";
    vacantDays: "vacantDays";
    openMatters: "openMatters";
}>;
export type ScenarioInstitutionField = z.infer<typeof ScenarioInstitutionField>;
/**
 * The state of one named body of the executive branch.
 *
 * The institution is validated against the engine's catalog at parse time
 * rather than left as a free string: an id with a typo in it is the exact
 * shape of dead content this gate exists to make impossible, and it is
 * cheaper to refuse than to audit.
 */
export declare const ScenarioInstitutionState: z.ZodObject<{
    kind: z.ZodLiteral<"institutionState">;
    institution: z.ZodString;
    field: z.ZodEnum<{
        delivery: "delivery";
        politicization: "politicization";
        backlog: "backlog";
        vacantDays: "vacantDays";
        openMatters: "openMatters";
    }>;
    atLeast: z.ZodOptional<z.ZodNumber>;
    atMost: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ScenarioInstitutionState = z.infer<typeof ScenarioInstitutionState>;
/** Undefined for a board that carries no runtime for this body at all. */
export declare function institutionReading(campaign: Campaign, institution: string, field: ScenarioInstitutionField): number | undefined;
export declare function institutionStateMet(campaign: Campaign, condition: ScenarioInstitutionState): boolean;
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
export declare function institutionStrainValue(campaign: Campaign, conditions: readonly {
    readonly kind: string;
}[]): number;
/**
 * The findings these rules raise, named once so `scenario-audit.ts` carries the
 * subsystem's whole vocabulary in one member of its union rather than one line
 * per rule in a file that has no lines left.
 */
export type InstitutionFindingKind = "institution-bounds-scale" | "unknown-institution" | "institution-vacancy-gate-unfounded" | "institution-politicization-unreachable" | "institution-open-matters-unreachable";
/**
 * A bound written on the wrong scale for its field.
 *
 * The same defect that shipped a `metric: "treasury"` bound written nought-to-
 * one against a treasury holding tens of thousands: it parses, it audits
 * clean, and it is never true. Here it has two directions — a 0..1 field asked
 * for more than 1, and a count field asked for a fraction of one unit — and
 * both are certainly dead rather than probably dead, so both are errors.
 */
export declare function auditInstitutionBoundsScale(def: ScenarioDef, findings: FindingSink): void;
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
export declare function auditInstitutionVacancyGate(def: ScenarioDef, findings: FindingSink): void;
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
export declare const INSULATED_POLITICIZATION_CEILING = 0.4;
export declare function auditInstitutionPoliticizationReach(def: ScenarioDef, findings: FindingSink): void;
/**
 * The boost and the gate are one mechanism: strain reads the body the
 * scenario's own condition names, so a boost with no `institutionState`
 * beside it is weight scaling on a number that is always zero. The same
 * inert-boost error `flagAge` carries for the same reason.
 */
export declare function auditInstitutionStrainBoost(def: ScenarioDef, findings: FindingSink): void;
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
export declare function auditInstitutionOpenMatters(def: ScenarioDef, findings: FindingSink): void;
export declare function auditInstitutionGates(def: ScenarioDef, findings: FindingSink): void;
