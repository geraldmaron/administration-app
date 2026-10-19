import { type Campaign, type NationCondition } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type MetricStance } from "../format/figures";
import { type StatDefinition } from "./stat-definition";
export type VitalKey = "economy" | "prices" | "jobs" | "order" | "living";
export type NationVital = {
    readonly key: VitalKey;
    readonly caption: string;
    /** The band's word, or "Unread" where the services have no read. */
    readonly word: string;
    readonly stance?: MetricStance;
    /** Where the band sits on its own four steps, 1 to 4, highest the healthiest. */
    readonly level?: number;
    /** One line under the band: the latest beat of a condition, never a figure. */
    readonly line?: string;
    readonly unread?: true;
    /** What the reading is and what reads it, where it is a stat the dataset holds. */
    readonly definition?: StatDefinition;
};
/** The condition a country is living through that its file leads with: the newest, the worst on a tie. */
export declare function leadingCondition(campaign: Campaign, nation: NationId): NationCondition | undefined;
/** A foreign country's vitals, in the order its file reads them; empty for the player's own or an unknown id. */
export declare function nationVitals(campaign: Campaign, nation: NationId): readonly NationVital[];
