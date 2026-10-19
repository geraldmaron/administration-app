import { type Campaign, type CyclePhase } from "@admin/engine";
/** The loop's four phases, in the order the economy actually moves through them. */
export declare const CYCLE_PHASE_ORDER: readonly CyclePhase[];
export type CycleReading = {
    readonly phase: CyclePhase;
    readonly word: string;
    /** Weeks since the economy entered this phase. */
    readonly weeksInPhase: number;
};
export declare function cycleReading(campaign: Campaign): CycleReading;
