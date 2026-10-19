import type { SectorId } from "@admin/world";
export type TradeSectorId = string;
/**
 * How a tariff on this sector behaves, which is the whole reason the taxonomy
 * exists at a finer grain than the dataset's own.
 */
export type TradeSectorDef = {
    readonly id: TradeSectorId;
    readonly name: string;
    /** The dataset sector this rolls into, so employment and mix stay one system. */
    readonly rollup: SectorId;
    /**
     * Share of a statutory rate that lands in the duty-inclusive border price.
     *
     * The literature is close to complete pass-through at the border for the
     * United States, and the deviations are real: commodities and undifferentiated
     * goods are where foreign exporters actually absorb part of a tariff, because
     * the US is a large enough buyer to move a world price. Differentiated
     * manufactures do not absorb. This ordering is specific to the United States
     * as the importer and must not be generalized to the other nations.
     */
    readonly borderPassThrough: number;
    /**
     * Share of the border price rise that reaches a US shelf price within a year.
     *
     * A completely different quantity from the border figure, and conflating the
     * two is the most common available modeling error. Retail margins, sourcing
     * shifts and untariffed complements absorb most of it in most sectors; the
     * exceptions are the sectors where a domestic substitute raises its own price
     * under the tariff umbrella.
     */
    readonly shelfPassThrough: number;
    /** How readily buyers move to another source. Higher means a tariff cuts volume rather than raising price. */
    readonly substitutability: number;
    /** How far a price move here travels into other sectors' input costs. */
    readonly inputIntensity: number;
    /** How likely this sector is to be picked as a retaliation target. */
    readonly retaliationSalience: number;
    /**
     * Whether a tariff is even the instrument. Some of these are licensed rather
     * than taxed, and the taxonomy carries them precisely so the game learns
     * which ones a tariff cannot touch.
     */
    readonly instrument: "tariff" | "export-control" | "licensing" | "sanctions";
    /** Which institution owns the authority, by catalog id. */
    readonly authority: string;
    readonly strategic: boolean;
};
export declare const TRADE_SECTORS: readonly TradeSectorDef[];
export declare const TRADE_SECTOR_IDS: readonly TradeSectorId[];
export declare function tradeSector(id: TradeSectorId): TradeSectorDef | undefined;
/** Every trade sector that rolls into one dataset sector. */
export declare function tradeSectorsFor(rollup: SectorId): readonly TradeSectorDef[];
/**
 * Sectors a price move in `source` travels into, weighted by how much of an
 * input it is. Deliberately not a full input-output table: what the game needs
 * is that a steel tariff is felt by the people who buy steel, and an
 * input-intensity weight carries that without inventing a matrix nobody sourced.
 */
export declare function downstreamOf(source: TradeSectorId): readonly TradeSectorDef[];
/** The sector's share of household spending, 0 where households do not buy it directly. */
export declare function householdShare(id: TradeSectorId): number;
