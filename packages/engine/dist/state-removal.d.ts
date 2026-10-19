import type { RemovalMechanism } from "@admin/world";
import type { InabilityState } from "./inability.js";
export type RemovalArcBeat = {
    readonly turn: number;
    readonly description: string;
};
export type RemovalArc = {
    readonly mechanism: RemovalMechanism;
    readonly pressure: number;
    /**
     * Where pressure stood at the close of each completed turn, oldest first —
     * never the live turn, which is still moving. The same reasoning as
     * `player.metricHistory`: a figure on its own says how much trouble the
     * administration is in, only the series says whether that trouble is
     * building or easing. Bounded the same way, for the same reason.
     */
    readonly pressureHistory: readonly number[];
    readonly beats: readonly RemovalArcBeat[];
    readonly resolved: boolean;
    readonly endingSummary?: string;
    /** The watch on the President's own party for removal by inability (`inability.ts`); absent until it has anything to record. */
    readonly inability?: InabilityState;
};
