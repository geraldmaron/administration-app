import { type Campaign } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
export declare const oversightBoard: () => Campaign;
export declare const shutdownBoard: () => Campaign;
export declare const rulemakingBoard: () => Campaign;
/**
 * The boards a batch's own conditions demand, beyond the canonical spread.
 *
 * The point of returning these automatically rather than documenting them is
 * that the alternative already failed once: `openMatters` shipped as a gate no
 * board could satisfy, parsed clean through both institution audits, and would
 * have gone to a drafter as a live mechanism. A condition kind whose state no
 * default board carries has to bring its own board with it, or the reachability
 * gate is measuring the fixtures instead of the content.
 */
export declare function supplementBoards(defs: readonly ScenarioDef[]): readonly Campaign[];
