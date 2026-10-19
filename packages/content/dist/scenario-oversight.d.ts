import { type Campaign } from "@admin/engine";
import { z } from "zod";
import type { FindingSink } from "./scenario-audit-cohorts.js";
import { ScenarioInstitutionState, type InstitutionFindingKind } from "./scenario-institutions.js";
import type { ScenarioDef } from "./scenario.js";
export { institutionStrainValue } from "./scenario-institutions.js";
/**
 * Who is doing the looking, in the three shapes the engine actually opens.
 *
 * A departmental inspector general opens on the agency's own numbers, a
 * committee opens on a fact already on the record, and a special counsel is
 * appointed by the Attorney General out of a matter the department can no
 * longer be seen to handle itself.
 */
export declare const MATTER_ORIGINS: readonly ["inspector-general", "committee", "special-counsel"];
/**
 * The stages a matter can be waited on at.
 *
 * `closed` is deliberately absent. Every reading here counts *open* matters,
 * because an inquiry that is over is not a thing the week is about, and a gate
 * that could name `closed` would be asking one question in the schema and
 * getting the answer to another. Content about a file that has been shut gates
 * on the flag its own arc stamps.
 */
export declare const MATTER_STAGES: readonly ["opened", "gathering", "reported"];
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
export declare const ScenarioOversightMatter: z.ZodObject<{
    kind: z.ZodLiteral<"oversightMatter">;
    origin: z.ZodOptional<z.ZodEnum<{
        "inspector-general": "inspector-general";
        committee: "committee";
        "special-counsel": "special-counsel";
    }>>;
    institution: z.ZodOptional<z.ZodString>;
    stage: z.ZodOptional<z.ZodEnum<{
        opened: "opened";
        gathering: "gathering";
        reported: "reported";
    }>>;
    public: z.ZodOptional<z.ZodBoolean>;
    obstructed: z.ZodOptional<z.ZodBoolean>;
    atLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ScenarioOversightMatter = z.infer<typeof ScenarioOversightMatter>;
/**
 * Whether the government is closed, and for how long.
 *
 * `is: false` is worth having rather than assuming: a week that would read
 * absurdly during a lapse — an expansion, a state visit, a ribbon — can say so
 * instead of being written and then arriving in the wrong week.
 */
export declare const ScenarioShutdown: z.ZodObject<{
    kind: z.ZodLiteral<"shutdown">;
    is: z.ZodOptional<z.ZodBoolean>;
    weeksAtLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
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
export declare const ScenarioAppropriation: z.ZodObject<{
    kind: z.ZodLiteral<"appropriation">;
    onPriorYear: z.ZodOptional<z.ZodBoolean>;
    weeksLeftAtMost: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ScenarioAppropriation = z.infer<typeof ScenarioAppropriation>;
/**
 * Rules the President has started and where they have got to.
 *
 * An order that goes by rulemaking changes nothing for six weeks; the whole
 * point of the clock is that the country is unchanged while it runs. Content
 * about the comment period, the week the rule binds, or the week the bench
 * stopped it is content about which status is on the record.
 */
export declare const PENDING_RULE_STATUSES: readonly ["pending", "stayed", "in-effect", "canceled", "struck-down", "disapproved"];
export declare const ScenarioPendingRule: z.ZodObject<{
    kind: z.ZodLiteral<"pendingRule">;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        stayed: "stayed";
        "in-effect": "in-effect";
        canceled: "canceled";
        "struck-down": "struck-down";
        disapproved: "disapproved";
    }>>;
    atLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ScenarioPendingRule = z.infer<typeof ScenarioPendingRule>;
/**
 * The executive branch's own state, as the condition union carries it.
 *
 * Assembled here rather than listed in `scenario.ts` so the union pays for one
 * line there however many members this grows to, and so the five kinds that
 * read the same subsystem are declared beside each other.
 */
export declare const EXECUTIVE_STATE_CONDITIONS: readonly [z.ZodObject<{
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
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"oversightMatter">;
    origin: z.ZodOptional<z.ZodEnum<{
        "inspector-general": "inspector-general";
        committee: "committee";
        "special-counsel": "special-counsel";
    }>>;
    institution: z.ZodOptional<z.ZodString>;
    stage: z.ZodOptional<z.ZodEnum<{
        opened: "opened";
        gathering: "gathering";
        reported: "reported";
    }>>;
    public: z.ZodOptional<z.ZodBoolean>;
    obstructed: z.ZodOptional<z.ZodBoolean>;
    atLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"shutdown">;
    is: z.ZodOptional<z.ZodBoolean>;
    weeksAtLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"appropriation">;
    onPriorYear: z.ZodOptional<z.ZodBoolean>;
    weeksLeftAtMost: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"pendingRule">;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        stayed: "stayed";
        "in-effect": "in-effect";
        canceled: "canceled";
        "struck-down": "struck-down";
        disapproved: "disapproved";
    }>>;
    atLeast: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>];
type ExecutiveStateCondition = ScenarioInstitutionState | ScenarioOversightMatter | ScenarioShutdown | ScenarioAppropriation | ScenarioPendingRule;
/**
 * Every condition that reads the executive branch's own state, answered in one
 * place — so `scenario-cast.ts` spends five case labels on the subsystem rather
 * than five imports and five bodies.
 */
export declare function executiveStateMet(campaign: Campaign, condition: ExecutiveStateCondition): boolean;
export type ExecutiveFindingKind = InstitutionFindingKind | "oversight-count-unreachable" | "oversight-facets-contradict" | "shutdown-gate-contradicts" | "pending-rule-count-unreachable";
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
export declare function auditOversightFacets(def: ScenarioDef, findings: FindingSink): void;
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
export declare const IMPLAUSIBLE_LAPSE_WEEKS: number;
export declare function auditShutdownGate(def: ScenarioDef, findings: FindingSink): void;
export declare function auditPendingRuleGate(def: ScenarioDef, findings: FindingSink): void;
/** Every rule that guards a gate on the executive branch's own state. */
export declare function auditExecutiveStateGates(def: ScenarioDef, findings: FindingSink): void;
