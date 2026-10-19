import type { PersonId, RoleId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
export type ForecastConfidence = "low" | "moderate" | "high";
export type ForecastRecord = {
    readonly id: string;
    readonly turn: number;
    readonly date: GameDate;
    /** The seat that made the forecast, and who sat in it. */
    readonly role: RoleId;
    readonly person?: PersonId;
    /** What was decided and which option was taken, in the screen's words. */
    readonly subject: string;
    readonly option: string;
    readonly horizonWeeks: number;
    readonly dueTurn: number;
    /** Approval forecast at the due week: the median of the runs and their range, 0 to 1. */
    readonly approval: {
        readonly median: number;
        readonly low: number;
        readonly high: number;
    };
    readonly confidence: ForecastConfidence;
};
export type ForecastEffect = {
    readonly kind: "forecast";
    readonly record: ForecastRecord;
};
/** A campaign's forecasts beyond this are dropped oldest first: a term of weekly decisions, without growing the save without bound. */
export declare const FORECAST_RECORD_LIMIT = 200;
export declare function applyForecast(state: Campaign, effect: ForecastEffect): Campaign;
/** Approval at the close of `turn`, while the metric record still holds it; the live figure for the week now running. */
export declare function approvalAtTurn(campaign: Campaign, turn: number): number | undefined;
export type ForecastOutcome = {
    readonly state: "pending";
}
/** The due week closed; `within` says whether approval landed inside the forecast's range. */
 | {
    readonly state: "settled";
    readonly approval: number;
    readonly within: boolean;
    readonly error: number;
}
/** The due week is older than the metric record keeps. */
 | {
    readonly state: "unrecorded";
};
export declare function forecastOutcome(campaign: Campaign, record: ForecastRecord): ForecastOutcome;
export type AdviserForecasts = {
    readonly role: RoleId;
    readonly person?: PersonId;
    readonly records: readonly {
        readonly record: ForecastRecord;
        readonly outcome: ForecastOutcome;
    }[];
};
/** Every adviser's forecasts with what happened, one entry per seat and person, newest forecast last. */
export declare function selectForecastRecord(campaign: Campaign): readonly AdviserForecasts[];
