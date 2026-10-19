import { ScenarioSubjectSlot } from "../scenario-subjects.js";
import { z } from "zod";
import { SettlementId, StateId } from "@admin/world";
import { ScenarioCast, ScenarioClass, ScenarioCondition, ScenarioSeverity, WeightBoost } from "../scenario.js";
// A scenario splits cleanly in two: the structured half that decides whether
// it can appear at all, and the prose half that is only worth reading once it
// has. The selector is that first half — every field selection consults and
// nothing else. It exists because a pool of tens of thousands cannot afford to
// hold, ship, or render bodies it is about to discard: at 3KB of prose each,
// resident bodies are measured in hundreds of megabytes, while selectors are a
// fraction of that and are the only part a draw actually reads.
export const ScenarioSelector = z.object({
    id: z.string().min(1),
    class: ScenarioClass,
    severity: ScenarioSeverity,
    cast: ScenarioCast,
    conditions: z.array(ScenarioCondition),
    weight: z.number().positive(),
    boosts: z.array(WeightBoost).optional(),
    once: z.boolean().optional(),
    subjects: z.array(ScenarioSubjectSlot).optional(),
    /** Which shard carries this scenario's body, for a pool that loads lazily. */
    shard: z.string().min(1).optional(),
    /**
     * Locus binds the draw may need without loading the body: `state` for a
     * `stateGrievance` condition with `scope: "locus"`, `ground` for the season a
     * `calendar` condition is read in, and `bind` because a scenario bound to a
     * running condition is only live while one is running — a selector that
     * dropped it would deal a decision about a fire on a board with no fire, which
     * is the defect the bind exists to remove.
     */
    locus: z
        .object({
        state: StateId.optional(),
        settlement: z.enum(["small", "commercial-port", "road-border"]).optional(),
        settlementId: SettlementId.optional(),
        ground: z.enum(["home", "counterpart"]).optional(),
        bind: z.literal("condition").optional(),
    })
        .strict()
        .optional(),
    /**
     * The arc this scenario belongs to, and its place in it.
     *
     * A selector that dropped this made the whole arc system unreachable rather
     * than merely unused: `memoryPool` projects every def through `selectorOf`
     * before the draw sees it, so the family branch in casting could only ever
     * fire for a caller holding a full `ScenarioDef` — never through
     * `stageFromResidentPool`, which is what the Desk actually uses.
     */
    family: z.object({ id: z.string().min(1), role: z.enum(["opener", "beat", "close"]) }).optional(),
});
/**
 * The selector for an authored scenario. A `ScenarioDef` already satisfies the
 * selector's shape structurally, so casting and liveness accept either — this
 * exists to *narrow* a def down to the part worth keeping resident.
 */
/**
 * The locus fields a draw reads, or nothing where the def carries none of them.
 *
 * `ground` travels only beside a `calendar` condition, because it is read for
 * nothing else and every byte here is multiplied by the whole resident pool.
 */
function selectorLocus(def) {
    const needsGround = def.conditions.some((condition) => condition.kind === "calendar") || def.locus?.settlement !== undefined || def.locus?.settlementId !== undefined;
    const locus = {
        ...(def.locus?.settlement ? { settlement: def.locus.settlement } : {}),
        ...(def.locus?.settlementId ? { settlementId: def.locus.settlementId } : {}),
        ...(def.locus?.state ? { state: def.locus.state } : {}),
        ...(needsGround && def.locus?.ground ? { ground: def.locus.ground } : {}),
        ...(def.locus?.bind ? { bind: def.locus.bind } : {}),
    };
    return Object.keys(locus).length === 0 ? {} : { locus };
}
export function selectorOf(def, shard) {
    return {
        id: def.id,
        class: def.class,
        severity: def.severity,
        cast: def.cast,
        conditions: def.conditions,
        weight: def.weight,
        ...(def.boosts ? { boosts: def.boosts } : {}),
        ...(def.once ? { once: def.once } : {}),
        ...(def.subjects?.length ? { subjects: def.subjects } : {}),
        ...(shard ? { shard } : {}),
        // Optional-chained even though `ScenarioDef.locus` is required, because the
        // selector's own `locus` is not: a selector this function returns is a
        // legal input shape that may legitimately have no locus at all, and every
        // other optional field here is read the same defensive way. An unguarded
        // read here throws inside `memoryPool`, which the root layout builds, so
        // the cost of being wrong is every route rather than one scenario.
        ...(selectorLocus(def)),
        ...(def.family ? { family: def.family } : {}),
    };
}
