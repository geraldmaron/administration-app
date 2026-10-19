import { type Campaign } from "@admin/engine";
import type { StateId } from "@admin/world";
import type { MetricStance } from "../format/figures";
export type StateVitalKey = "jobs" | "prices" | "crime";
export type StateVital = {
    readonly key: StateVitalKey;
    readonly caption: string;
    readonly word: string;
    readonly stance: MetricStance;
};
/**
 * A state's pulse: its jobs, its prices and its crime, each the country's own
 * current figure carried through the state's authored deviation from it.
 * Undefined only where the campaign carries no live reading for the nation
 * this presidency governs, which does not happen in a founded campaign.
 */
export declare function stateVitals(campaign: Campaign, stateId: StateId): readonly StateVital[] | undefined;
