import { type CityId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import type { Effect } from "./effects.js";
/** Stable city identity. No municipal election or service capacity is implied. */
export declare function cityMayorSeat(campaign: Campaign, cityId: CityId): {
    readonly person: PersonRuntime;
    readonly effects: readonly Effect[];
} | undefined;
