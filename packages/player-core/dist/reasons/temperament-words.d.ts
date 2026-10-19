import { type Campaign } from "@admin/engine";
import type { NationId, NationTraits } from "@admin/world";
/** The trait axes a temperament phrase can be read off. `agendas` is a list, not an axis. */
export type TemperamentAxis = Exclude<keyof NationTraits, "agendas">;
export declare const TEMPERAMENT_AXES: readonly TemperamentAxis[];
/** One axis as a band: where the government sits among the world's, 1 (least) to 5 (most). */
export type TemperamentReading = {
    readonly axis: TemperamentAxis;
    readonly level: 1 | 2 | 3 | 4 | 5;
    readonly text: string;
};
/**
 * The band phrase for one axis of one government, or nothing where the
 * services cannot read that government. Every read government gets its bands;
 * whether they were researched or fitted is the file's provenance sentence to
 * say, not a reason to hide them.
 */
export declare function temperamentBand(nation: NationId, axis: TemperamentAxis, campaign: Campaign): string | undefined;
/**
 * One axis as a band with its step, for a screen that draws where the
 * government sits, followed by how its leader leans it where that is worth
 * saying. The band stays the government's own: a leader moves how it decides
 * while they hold office, not what kind of government it is.
 */
export declare function temperamentReading(nation: NationId, axis: TemperamentAxis, campaign: Campaign): TemperamentReading | undefined;
/** Every axis of one government, in the order the file lists them; empty where it is unread. */
export declare function temperamentReadings(nation: NationId, campaign: Campaign): readonly TemperamentReading[];
