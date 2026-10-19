import { type Campaign, type OfficeId } from "@admin/engine";
import type { PersonId, RoleId } from "@admin/world";
import type { ComparisonCell } from "../conversation/decision-comparison.js";
import { type PricedOption } from "../government/act-price.js";
import { type AttributeJudgment } from "../government/machine-readings.js";
/** A row cell the shortlist adds to the decision comparison's: a banded reading. */
export type ShortlistCell = ComparisonCell | {
    readonly kind: "band";
    readonly judgment: AttributeJudgment;
};
export type ShortlistRow = {
    readonly id: string;
    readonly label: string;
    readonly cells: readonly ShortlistCell[];
};
export type ShortlistOption = PricedOption & {
    readonly person?: PersonId;
    readonly name?: string;
};
export type Shortlist = {
    readonly mode: "acting";
    readonly options: readonly ShortlistOption[];
    readonly rows: readonly ShortlistRow[];
    /** What leaving the seat empty costs, said beside the names, never as one. */
    readonly waiting: string;
};
/** How many names a shortlist sets: enough to choose between, few enough to read on a phone. */
export declare const SHORTLIST_SIZE = 4;
/**
 * The acting shortlist for a chair the law lets somebody act in: who could sign
 * for it tomorrow. The bench is the cabinet seat's own, or
 * for an agency the department's above it, which is where a deputy comes from.
 */
export declare function actingShortlist(campaign: Campaign, seat: RoleId | OfficeId, benchRole: RoleId | undefined, limitDays: number | undefined, limit?: number): Shortlist;
