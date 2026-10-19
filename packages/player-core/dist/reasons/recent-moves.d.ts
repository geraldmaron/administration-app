import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ReasonLine } from "./reason-lines";
export type RecentMove = {
    readonly turn: number;
    /** "This week", "Last week", "5 weeks ago". */
    readonly when: string;
    readonly headline: string;
    readonly target?: NationId;
    /** Empty where the services cannot read the government, or no stamp was kept. */
    readonly reasons: readonly ReasonLine[];
};
/** A government's latest moves as the wire reported them, newest first, each with its reasons where they can be read. */
export declare function recentMoves(campaign: Campaign, nation: NationId, limit?: number): readonly RecentMove[];
