import { type Effect } from "./effects.js";
import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { RetaliationRecord, TradeMeasure, TradeMeasureId } from "./trade.js";
import type { TradeSectorId } from "./trade-sectors.js";
import { type TariffFinding } from "./tariff-statutes.js";
export type TradeEffect = {
    readonly kind: "trade";
    /** A measure coming into force. */
    readonly measure?: TradeMeasure;
    /** A measure being lifted, by id. */
    readonly lift?: TradeMeasureId;
    /** Retaliation the world is now expecting, with the odds it actually comes. */
    readonly expect?: RetaliationRecord;
    /** How likely the expected answer is. A record below the roll is not queued at all. */
    readonly chance?: number;
    /** Expected retaliation that has now arrived, by id. */
    readonly land?: TradeMeasureId;
    /** How far a sector's US price moved, as a fraction. Accumulates. */
    readonly priceMove?: {
        readonly sector: TradeSectorId;
        readonly by: number;
    };
    /** A trade investigation opened, or its finding recorded. Replaces the record with the same id. */
    readonly finding?: TariffFinding;
};
export declare function applyTrade(state: Campaign, effect: TradeEffect): Campaign;
/** A declared duration starts when signed, never when a briefing was cast. */
export declare function temporaryImportSuspension(campaign: Campaign, target: NationId, days: number): readonly Effect[];
/**
 * What comes off a sector's price when a measure ends. A lift and an expiry
 * both use it, because a tariff that lapses on its clock leaves the shelf the
 * same way one the President lifts does.
 */
export declare function liftPriceMove(measure: TradeMeasure): {
    readonly sector: TradeSectorId;
    readonly by: number;
};
export declare function expireTradeMeasures(campaign: Campaign): Campaign;
