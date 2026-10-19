import type { ExecutiveOrder, ExecutiveOrderRecord } from "@admin/engine";
import type { ProjectedEffect } from "../reading";
/** The country-facing effects a strike-down reverses, in the words the sign ceremony already used to preview them. */
export declare function reversedEffects(contribution: NonNullable<ExecutiveOrderRecord["nationContribution"]>): readonly ProjectedEffect[];
/** What a strike-down does not undo: the treasury share the order already spent. */
export declare function unreversedCost(order: ExecutiveOrder): string | undefined;
