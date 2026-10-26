import { type NationId } from "@admin/world";
import type { CausalId } from "./causality.js";
import type { Campaign, GameDate } from "./state.js";
import type { EffectPacket, Effect } from "./effects.js";
import { type TradeSectorDef, type TradeSectorId } from "./trade-sectors.js";
import type { TariffFinding, TariffStatute } from "./tariff-statutes.js";
export type TradeMeasureId = string;
export type TradeMeasureKind = "tariff" | "sanctions" | "asset-restriction" | "export-control" | "embargo";
export type TradeMeasure = {
    readonly id: TradeMeasureId;
    readonly kind: TradeMeasureKind;
    readonly sector: TradeSectorId;
    readonly target: NationId;
    /** Statutory rate, 0..1. Zero for a measure that is not a rate. */
    readonly rate: number;
    readonly imposedTurn: number;
    readonly imposedDate: GameDate;
    /** The institution whose authority this was taken under. */
    readonly authority: string;
    /** The statute an American tariff was imposed under. Absent on a partner's measure and on saves before v67. */
    readonly statute?: TariffStatute;
    /** Whose measure it is: the player's, or a partner's answer to one. */
    readonly origin: "us" | "retaliation";
    /**
     * The capital that imposed it, where it is worth naming.
     *
     * `origin` says which side of the exchange a measure is on and cannot say who
     * is on that side: every retaliation read as "somebody answered", so a board
     * carrying answers from three capitals could not tell them apart. Absent means
     * the United States for an `origin: "us"` measure and the retaliating capital
     * for an `origin: "retaliation"` one, which is what every measure written
     * before this field meant.
     */
    readonly actor?: NationId;
    readonly liftedTurn?: number;
    /** The day it was lifted. Absent on a record lifted before the day was stored; readers fall back to the lifted week's date. */
    readonly liftedDate?: GameDate;
    readonly expiresDate?: GameDate;
    /** Import-only suspensions leave American exports legally open. */
    readonly direction?: "imports" | "both";
    /** A list-based program or a blocked account: it designates named persons or holdings, cuts no sector's trade and reaches no further. Absent on every other measure. */
    readonly scope?: "listed";
    /** 0..1 of the sector's sales the designated companies carry, where a designation names companies rather than the sector. Absent means all of it. */
    readonly covered?: number;
    /**
     * The ledger event that imposed this measure.
     *
     * Written by the effect handler rather than by the caller, because the id is
     * only knowable inside `apply()`. It is what lets a lift, months later, name
     * the signature it is undoing instead of arriving on the trail as an
     * unrelated sentence.
     */
    readonly causedBy?: CausalId;
};
export type RetaliationRecord = {
    readonly id: string;
    readonly by: NationId;
    readonly answering: TradeMeasureId;
    /** The turn the answer is expected to land. Retaliation is not instant. */
    readonly dueTurn: number;
    readonly sector: TradeSectorId;
    readonly rate: number;
    readonly landed: boolean;
    /**
     * The ledger event that provoked this answer — the day the tariff was
     * signed. Carried on the record because the phase that lands it runs weeks
     * later in a different function, and a partner's answer that cannot point at
     * what it is answering is the exact shape of a shallow causal graph.
     */
    readonly causedBy?: CausalId;
};
export type TradeState = {
    readonly measures: Readonly<Record<TradeMeasureId, TradeMeasure>>;
    readonly retaliation: readonly RetaliationRecord[];
    /**
     * How far each sector's US price has moved from its founding baseline, as a
     * fraction. Accumulated rather than recomputed so the record can say which
     * decision moved it and by how much.
     */
    readonly sectorPrice: Readonly<Record<TradeSectorId, number>>;
    /** The trade investigations ordered and what each found, by id. Absent until the first is ordered. */
    readonly findings?: Readonly<Record<string, TariffFinding>>;
};
export declare function foundingTrade(): TradeState;
export type TradeEdge = {
    readonly partner: NationId;
    readonly sector: TradeSectorId;
    /** US imports from the partner in this sector, USD millions per year. */
    readonly imports: number;
    /** US exports to the partner in this sector, USD millions per year. */
    readonly exports: number;
    /** This partner's share of everything the US imports in this sector, 0..1. */
    readonly dependence: number;
    readonly substitutability: number;
    readonly tariffRate: number;
    readonly strategic: boolean;
};
/**
 * What the United States trades with one partner in one sector.
 *
 * Derived every call rather than stored: the recorded opening, split by the
 * partner's own sector mix (a country with no steel industry does not sell
 * steel) and moved since by the two economies and the measures in force. The
 * reliance reading is this partner's share of everything the country imports
 * in the sector.
 */
export declare function tradeEdge(campaign: Campaign, partner: NationId, sectorId: TradeSectorId): TradeEdge | undefined;
/** Every sector the US actually trades with one partner, largest import first. */
export declare function tradeEdgesWith(campaign: Campaign, partner: NationId): readonly TradeEdge[];
/** Every partner the US buys a sector from, most dependent first. */
export declare function suppliersOf(campaign: Campaign, sectorId: TradeSectorId): readonly TradeEdge[];
/** The rate currently in force on a partner and sector, counting only live measures. */
export declare function currentRate(campaign: Campaign, partner: NationId, sectorId: TradeSectorId): number;
export type TariffIncidence = {
    readonly sector: TradeSectorDef;
    readonly target: NationId;
    readonly rate: number;
    /** Annual customs revenue, USD millions, net of the volume the tariff destroys and of what Customs fails to collect. */
    readonly revenue: number;
    /** Fractional rise in the duty-inclusive border price. */
    readonly borderPriceRise: number;
    /** Fractional rise in the US shelf price within a year. */
    readonly shelfPriceRise: number;
    /** Fractional fall in imported volume from this partner. */
    readonly importFall: number;
    /** Share of the lost volume that goes to another foreign supplier rather than home. */
    readonly diversionShare: number;
    /** Fractional rise in protected domestic output of this sector. */
    readonly domesticGain: number;
    /** Fractional rise in input costs for the sectors that buy from this one. */
    readonly inputCostRise: number;
    /** Net employment effect on the rolled-up sector, fraction. */
    readonly employmentEffect: number;
    /** Who is likely to answer, and where. */
    readonly retaliationChance: number;
    readonly retaliationTarget?: TradeSectorId;
    /** The share of American sales in the target sector the answer would remove, if it lands. */
    readonly retaliationCut: number;
};
/**
 * What a tariff does, all the way through.
 *
 * Deliberately returns the whole distribution rather than a treasury number.
 * The action surface shows who gains, who pays and who may answer, because a
 * single treasury delta was the thing that made a tariff feel free.
 */
export declare function tariffIncidence(campaign: Campaign, target: NationId, sectorId: TradeSectorId, rate: number): TariffIncidence | undefined;
/**
 * What a partner would hit back at.
 *
 * Retaliators pick politically salient US exports rather than economically
 * optimal ones — the record is soybeans, bourbon, orange juice and motorcycles,
 * not the largest line in the book. So salience leads, the partner has to
 * actually buy the thing, and the answer has to bite: goods its buyers can
 * get elsewhere at the world price, which is what made those answers cost
 * American sellers (the same border pass-through and substitutability
 * `retaliationFall` cuts by). A partner does not answer by taxing aircraft it
 * cannot buy from anyone else.
 */
export declare function retaliationTargetFor(campaign: Campaign, partner: NationId): TradeSectorId | undefined;
export type TradeResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly incidence: TariffIncidence;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** How much of the duty owed Customs collects, from 0.6 with no capacity to all of it. */
export declare function customsCollectionShare(campaign: Campaign): number;
/**
 * This week's customs on tariffs the administration still has in force. Annual
 * revenue, one week of it.
 *
 * Duty is charged on the goods that still arrive, and the live edge already
 * carries the fall every tariff in force causes. Charging it through
 * `tariffIncidence` took that fall a second time.
 */
export declare function selectCustomsReceipts(campaign: Campaign): number;
/**
 * The packet a tariff order is, once its statute's checks have passed.
 *
 * Callers go through `imposeTariff` in `tariff-orders.ts`, which holds the
 * statute's finding, cap and clock. This only prices and writes the order.
 */
export declare function tariffPacket(campaign: Campaign, target: NationId, sectorId: TradeSectorId, rate: number, statute: TariffStatute, expiresDate?: GameDate): TradeResult;
/** The economic acts the ladder orders that are not rates. */
export type CoerciveMeasureKind = Exclude<TradeMeasureKind, "tariff">;
/**
 * What a denial package against this partner actually is.
 *
 * A government cannot be export-controlled out of goods it does not buy. Where
 * the partner takes something from the United States that is licensed rather
 * than taxed — semiconductor equipment, critical minerals, defense articles,
 * telecom gear — denying it can be an export control, which BIS owns. A
 * designation, which OFAC owns, reaches the partner's sales to everyone the
 * dollar touches, so it is the package wherever it takes more of the partner's
 * trade than the control would, read off the same reach record the economy
 * charges (`external-pressure.ts#measureCut`).
 */
export declare function denialMeasureKind(campaign: Campaign, target: NationId): CoerciveMeasureKind;
/**
 * The register's record of an economic act ordered through the ladder, and the
 * answer the partner schedules against it.
 *
 * Written only for the administration's own acts, because the register is
 * US-centric all the way down: every edge is derived against the founding
 * nation, and the answer `tradePhase` lands charges the President's own book.
 * A measure between two other capitals would be an edge this model cannot
 * compute and a bill nobody in the campaign pays.
 */
export declare function coerciveMeasureEffect(campaign: Campaign, actor: NationId, target: NationId, kind: CoerciveMeasureKind): Effect | undefined;
export type LiftResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Lift a measure the administration imposed.
 *
 * No incidence is returned, and the reason is the embargo: cutting a partner
 * off sets the trade dependence the whole edge is derived from to zero, so the
 * measure that is hardest to lift is exactly the one whose incidence can no
 * longer be computed. A lift is a lift; what it undoes is on the record.
 */
export declare function liftMeasure(campaign: Campaign, id: TradeMeasureId): LiftResult;
export type TradeExposure = {
    readonly sector: TradeSectorDef;
    readonly priceMove: number;
    readonly measures: readonly TradeMeasure[];
};
/** Which sectors are carrying a price move, worst first — the cost-of-living read. */
export declare function selectTradeExposure(campaign: Campaign): readonly TradeExposure[];
/** Everything in force, so a surface never has to filter the record itself. */
export declare function selectLiveMeasures(campaign: Campaign): readonly TradeMeasure[];
/** What is coming, and from whom. */
export declare function selectExpectedRetaliation(campaign: Campaign): readonly RetaliationRecord[];
