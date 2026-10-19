import { type Campaign, type StatehouseStance } from "@admin/engine";
import type { StateId } from "@admin/world";
export type StatehouseReading = {
    readonly stance: StatehouseStance;
    readonly line: string;
};
/** One statehouse's stance and its line. Undefined where no governor is seated. */
export declare function statehouseReading(campaign: Campaign, state: StateId): StatehouseReading | undefined;
