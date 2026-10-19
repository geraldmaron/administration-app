import { type Campaign, type ForecastBasis, type EffectPacket, type ForecastConfidence, type ForecastOutcome, type ForecastRecord } from "@admin/engine";
import type { PersonId, RoleId } from "@admin/world";
import type { ModelingChoiceSpec } from "./choices";
export type ForecastDomain = "foreign" | "defense" | "intelligence" | "economy" | "justice" | "homeland" | "white-house";
/** A seat nobody holds is forecast by its career staff alone: the read of a capable office, without anyone to sharpen it. */
export declare const VACANT_SEAT_COMPETENCE = 0.35;
export type ForecastSource = {
    readonly basis: ForecastBasis;
    /** "God Mode", or the seat and who sits in it. */
    readonly label: string;
    readonly confidence: ForecastConfidence;
    readonly role?: RoleId;
    readonly person?: PersonId;
    /** Share of foreign governments the services read, for a choice about the world. */
    readonly coverage?: number;
};
/** Who forecasts this choice, on what basis, and how sure. God Mode alone forecasts from the truth. */
export declare function forecastSource(campaign: Campaign, spec: ModelingChoiceSpec): ForecastSource;
export type FiledForecast = {
    readonly source: ForecastSource;
    readonly subject: string;
    readonly option: string;
    readonly weeks: number;
    /** Approval at the horizon under the option taken: the runs' median and range. */
    readonly approval: {
        readonly median: number;
        readonly low: number;
        readonly high: number;
    };
};
/**
 * The packet that files a staff forecast on the Record, for the option the
 * President took. Background bookkeeping, as a held document's admission is:
 * it changes nothing in the world and is read by the forecast record alone.
 * A God Mode forecast is not a staff's and is not filed.
 */
export declare function forecastPacket(campaign: Campaign, filed: FiledForecast): EffectPacket | undefined;
export type AdviserTrackRecord = {
    readonly role: RoleId;
    readonly title: string;
    readonly name?: string;
    readonly filed: number;
    readonly settled: number;
    /** Settled forecasts whose range held what happened. */
    readonly within: number;
    /** Mean distance between the forecast's median and what happened, in shares of approval. */
    readonly meanMiss?: number;
    readonly entries: readonly {
        readonly record: ForecastRecord;
        readonly outcome: ForecastOutcome;
    }[];
};
/** Each adviser's forecasts against what happened: how often the range held, and by how much the middle missed. */
export declare function adviserTrackRecords(campaign: Campaign): readonly AdviserTrackRecord[];
