import { type Campaign, type DomesticSignature, type Effect } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
import type { ResolvedLocus } from "./scenario-locus.js";
/**
 * Compiles a position's gazetteer recipe into engine effects. City deltas
 * (employment, taxBase, adminLean, holiday set) become one CityEffect so
 * apply() records a single last-moved reason.
 */
type GazetteerRecipe = NonNullable<Extract<ScenarioDef["replies"][number]["commitment"], {
    kind: "position";
}>["gazetteer"]>;
/**
 * The city and state come from the resolved locus when there is one, so the
 * effect lands where the briefing was datelined: the authored place, the bound
 * condition's, the story's earlier scene or the drawn one. Without a resolved
 * locus they fall back to what the scenario authored. A resolved locus abroad
 * names no home city or state, so the authored ones stand.
 */
export declare function gazetteerEffects(campaign: Campaign, def: ScenarioDef, recipe: GazetteerRecipe, reason: string, locus?: ResolvedLocus): Effect[];
/**
 * Compiles a domestic signature into state lean/marks plus cohort strain.
 * Same spine as nations (Grudge) and places (GrievanceMark): one signature,
 * many subjects. routeCohorts needs the state effects that actually landed
 * so geography weighting follows who was moved, not every state on the map.
 */
export declare function domesticSignatureEffects(campaign: Campaign, signature: DomesticSignature): Effect[];
export {};
