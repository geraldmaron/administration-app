import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { MetricStance } from "../format/figures";
import { type TemperamentReading } from "../reasons/temperament-words";
export type PostureBand = {
    readonly word: string;
    readonly stance: MetricStance;
    /** 1 (holds what it has) to 4 (reaches for more). */
    readonly level: number;
};
export type NationPosture = {
    readonly posture: PostureBand;
    readonly unread: boolean;
    /** What it is after, in the dataset's own words, heaviest first; empty where unread. */
    readonly aims: readonly string[];
    readonly temperament: readonly TemperamentReading[];
    /** Where the temperament comes from, for a government the dataset has not researched in full. */
    readonly temperamentSource?: string;
};
/** A foreign government's posture, aims and temperament; undefined for the player's own or an unknown id. */
export declare function nationPosture(campaign: Campaign, nation: NationId): NationPosture | undefined;
