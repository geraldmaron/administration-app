import { z } from "zod";
import type { ScenarioDef } from "./scenario.js";
/**
 * What a scenario is about, independent of `class` (which desk the week
 * arrives at) and `dilemmaShape` (which argument the room is having). A topic
 * is the subject a retrieval or lifecycle pass filters on — "find every
 * trade scenario" spans several classes (economy, foreign-crisis, scandal)
 * and several shapes, and neither existing axis answers that question alone.
 *
 * Closed for the same reason `class` is: a filter is only useful while every
 * scenario that could carry a value does, in a value some other scenario
 * also carries, so a writer's one-off word is worse than no tag. Chosen by
 * reading the shipped corpus's class distribution and the classes that most
 * often needed splitting by subject (economy alone covers trade, fiscal and
 * labor weeks that a filter would otherwise conflate).
 *
 * Optional, and the corpus is not retagged by this change: an untagged
 * scenario is one nobody has classified yet, not one the field excludes.
 */
export declare const TOPIC_TAGS: readonly ["trade", "war", "intelligence", "judiciary", "disaster", "labor", "health", "immigration", "energy", "tech", "scandal", "fiscal", "diplomacy", "security", "environment", "culture", "civil-rights", "public-safety"];
export declare const ScenarioTopicTag: z.ZodEnum<{
    disaster: "disaster";
    war: "war";
    scandal: "scandal";
    culture: "culture";
    fiscal: "fiscal";
    trade: "trade";
    security: "security";
    labor: "labor";
    health: "health";
    energy: "energy";
    intelligence: "intelligence";
    judiciary: "judiciary";
    immigration: "immigration";
    tech: "tech";
    diplomacy: "diplomacy";
    environment: "environment";
    "civil-rights": "civil-rights";
    "public-safety": "public-safety";
}>;
export type ScenarioTopicTag = z.infer<typeof ScenarioTopicTag>;
/**
 * Whether a scenario's briefing can be dealt at any point the game is played,
 * or whether its premise is anchored to a moment that will pass.
 *
 * "evergreen" is the default and needs nothing else: the situation could
 * recur next month or next decade and the writing does not date itself.
 * "dated" is the admission that a scenario leans on a fact with a shelf
 * life — a leader's term, a live negotiation, a technology's current state —
 * and it must carry `staleAfter` so a lifecycle pass has something to check
 * it against; the schema refuses a dated scenario that omits the date, and
 * refuses `staleAfter` on anything still evergreen, because a shelf life on
 * content that does not have one is a claim nobody can act on.
 */
export declare const ScenarioEraAssumption: z.ZodEnum<{
    evergreen: "evergreen";
    dated: "dated";
}>;
export type ScenarioEraAssumption = z.infer<typeof ScenarioEraAssumption>;
export declare function scenarioEra(def: Pick<ScenarioDef, "eraAssumption">): ScenarioEraAssumption;
type EraAssumptionRefinementCtx = {
    addIssue(issue: {
        code: "custom";
        path: (string | number)[];
        message: string;
    }): void;
};
/**
 * The two-way coherence check between `eraAssumption` and `staleAfter`,
 * called from `ScenarioDef`'s `superRefine`. Split out with the rest of the
 * era-assumption vocabulary rather than left inline so the two stay next to
 * each other.
 */
export declare function checkEraAssumptionCoherence(def: Pick<ScenarioDef, "eraAssumption" | "staleAfter">, ctx: EraAssumptionRefinementCtx): void;
type FindingSink = {
    push(finding: {
        readonly kind: string;
        readonly severity: "error" | "warning";
        readonly scenario: string;
        readonly message: string;
    }): void;
};
export declare function auditTopicTags(def: Pick<ScenarioDef, "id" | "topics">, sink: FindingSink): void;
export {};
