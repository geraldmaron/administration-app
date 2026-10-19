import type { Campaign } from "@admin/engine";
import type { ScenarioCondition } from "./scenario-conditions.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
import type { ScenarioDef } from "./scenario.js";
export type InertGateFinding = ScenarioFinding & {
    readonly kind: "inert-gate";
    readonly condition: ScenarioCondition;
};
/** Whether a condition reads the player's own board rather than the cast, the clock or a deed. */
export declare function readsPlayerBoard(condition: ScenarioCondition): boolean;
/**
 * Every inert gate in a batch. `boards` defaults to the reachability spread;
 * a caller that already sealed it for `auditReachability` passes it in, since
 * sealing the boards is the expensive part.
 */
export declare function auditInertGates(defs: readonly ScenarioDef[], boards?: readonly Campaign[]): readonly InertGateFinding[];
