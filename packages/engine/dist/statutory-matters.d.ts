import type { Charter } from "@admin/world";
import { type Campaign } from "./state.js";
import type { Effect } from "./effects.js";
export declare function statutoryMatterId(billId: string, orderRecordId: string): string;
/** A live statute and an actual priority order are required before this autonomous filing exists. */
export declare function statutoryMatterEffects(state: Campaign, charter: Charter): readonly Effect[];
