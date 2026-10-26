import { type NationId, type SectorId } from "@admin/world";
import { type CommodityMacroPressure } from "./commodity-pressure.js";
import type { CoerciveMeasureKind, TradeMeasure } from "./trade.js";
import { type TradeSectorId } from "./trade-sectors.js";
import { type Campaign } from "./state.js";
/** Annual shifts as fractions: growth and inflation targets, and outlays as a share of output. */
export type ExternalMacroPressure = {
    readonly growth: number;
    readonly inflation: number;
    readonly outlays: number;
    /** The part of `growth` and `inflation` the world's commodity prices set, already inside both totals. */
    readonly commodities?: CommodityMacroPressure;
};
type WarRole = "defender" | "aggressor" | "joiner";
/**
 * What a war costs a belligerent per unit of intensity, by where it is fought.
 * A defender fights on its own ground, so it loses output and pays in prices; an
 * aggressor fights abroad and pays mostly in money; a joiner sends forces and
 * little else. Stated net: what a war's spending adds to demand is already
 * inside these figures, which is why war outlays never enter the budget's push.
 *
 * The growth figures are set on what a year of war does to the whole economy,
 * not on the target alone: the gap correction and the week-to-week lag take
 * about half of a target shift back inside a year, so a defender's target moves
 * ten points at full intensity for it to lose three or four over the year.
 *
 * What a war does to the world's energy and food prices is not in these
 * figures: a war among producers reaches every economy, the belligerents
 * included, through the commodity markets (`commodity-pressure.ts`), so the
 * same barrel is never charged twice.
 */
export declare const WAR_PRESSURE: Readonly<Record<WarRole, ExternalMacroPressure>>;
/** A measure's growth cost per unit of the trade it cuts, as a share of output. */
export declare const COERCION_BITE = 0.5;
/** The most every measure in force together can take off an economy's growth. */
export declare const COERCION_CAP = 0.08;
/** How much of a partner's swing reaches United States growth, per unit of US exports to it as a share of US output. */
export declare const PARTNER_ELASTICITY = 1.5;
/**
 * A measure in force between two governments, scoped the way the measure is:
 * the sector it reaches (absent where it reaches the whole economy), whose
 * sales it stops (`target-sales` for a ban on the target's goods alone, which
 * leaves the imposer's own exports legally open), the authority it was taken
 * under, and how far past the imposer's own market it reaches. Both world
 * supply (`commodity-shocks.ts`) and the target's own economy read this one
 * record, so a measure cannot reach a seller's whole output in one place and
 * only its sales to the imposer in the other.
 */
export type Coercion = {
    readonly imposer: NationId;
    readonly target: NationId;
    /** The share of the trade in scope the measure stops. */
    readonly severity: number;
    readonly sector?: SectorId;
    /** The trade sector a sectoral measure is filed under, the goods it names inside `sector`. */
    readonly good?: TradeSectorId;
    /** 0..1 of the goods' sales the designated sellers carry, where the measure names companies rather than a whole sector. */
    readonly covered: number;
    /**
     * Whose sales it stops: the target's alone (a ban on its goods), both ways,
     * or only the imposer's (an export control, which denies the target inputs
     * and leaves its own exports alone).
     */
    readonly direction: "target-sales" | "both" | "imposer-sales";
    readonly authority: string;
    /** 0..1 of the target's in-scope sales to everyone else the measure reaches this week, after evasion. */
    readonly financialReach: number;
};
/**
 * Planning value: the share of a designated seller's sales to third parties a
 * new designation by the administration reaches. Its measures run through the
 * currency most cross-border trade settles in, so a bank or a buyer anywhere
 * that deals with a designated seller risks its own access to it. Not a
 * sourced coefficient: Iran's crude exports fell by roughly four fifths in the
 * year after the 2018 reimposition (search snippets, not opened), and a
 * buyer the designation does not reach, such as a state refiner that never
 * touches the currency, keeps buying.
 */
export declare const DOLLAR_REACH = 0.8;
/**
 * Planning values: evasion (shadow fleets, transshipment, settlement in other
 * currencies) wins back up to `ceiling` of the reach while a designation
 * stands, approaching it with a `buildDays` half-life, and the networks it
 * built outlast a lift, fading with a `decayDays` half-life. No opened source
 * gives these; Iran's exports recovering over the five years after 2019 is
 * the shape (unverified).
 */
export declare const EVASION: {
    readonly ceiling: 0.5;
    readonly buildDays: 365;
    readonly decayDays: 730;
};
/** A trade sector's economy sector, or the id itself where it already names one. */
export declare function economySector(id: string): SectorId | undefined;
/**
 * How much of the reach evasion has won back on one target today, 0..ceiling.
 * Read off the register's own dates, so lifting a measure and imposing it
 * again does not reset the networks the first one taught the target to build.
 */
export declare function evasionOn(campaign: Campaign, target: NationId): number;
/**
 * How far past its own market one government's designation of another
 * reaches this week. Only the administration's: another capital's measure
 * stops what it buys and sells itself, and no more.
 */
export declare function financialReachOf(campaign: Campaign, imposer: NationId, target: NationId): number;
/**
 * Every economic measure in force, whoever imposed it: the administration's own
 * register (tariffs are a price step, not a cut in trade, and are not here) and
 * every standing embargo a government has declared, the United States included
 * as a target. An embargo the administration declared is in both, and counted
 * once, from the register. Another capital's embargo is taken under its own
 * law and reaches no further than its own trade.
 */
export declare function coercionsInForce(campaign: Campaign): readonly Coercion[];
/**
 * The share of one government's output that is goods sold to another, in one
 * sector or in all. Where the United States is on either side, what the two
 * countries actually traded (`US_GOODS_TRADE`); between two other capitals,
 * what the seller exports in the sector, split by how much of its trade runs
 * to that buyer. Read against the dataset's founding figures, so a measure
 * that has already cut the trade does not also shrink its own cost.
 */
export declare function exportShare(campaign: Campaign, seller: NationId, buyer: NationId, sector?: SectorId): number;
/**
 * How much of a seller's trade runs to one buyer, 0..1: the gravity share the
 * dataset derives, recovered from the dependence it stores, which is that
 * share times the seller's whole exposure to trade (`tradeExposure`). The
 * share is the dataset's model, not bilateral trade statistics.
 */
export declare function partnerShare(campaign: Campaign, seller: NationId, buyer: NationId): number;
/**
 * The share of a government's exports one economy sector carries. The dataset
 * names the sectors a country exports (`trade.topExports`, ranked from the
 * World Bank's breakdown) without their values, so its exports are read as
 * drawn from those sectors in proportion to each one's share of output. A
 * sector it does not list carries none of its exports to the world.
 */
export declare function exportScope(campaign: Campaign, nation: NationId, sector: SectorId | undefined): number;
/** What a government sells the whole world in one sector or in all, as a share of its output. */
export declare function worldExportShare(campaign: Campaign, seller: NationId, sector?: SectorId): number;
/** 0..1 of a seller's sales in a sector that go to one buyer. */
export declare function buyerShareOf(campaign: Campaign, seller: NationId, buyer: NationId, sector?: SectorId): number;
/** Whether a measure reaches one economy sector of its target, or one good inside it. */
export declare function covers(coercion: Coercion, sector: SectorId, good?: TradeSectorId): boolean;
/**
 * 0..1 of a seller's sales in one sector (or of one good in it) the measures
 * on it stop this week. One imposer's measures on the same sales stop them
 * once, at the heaviest; different imposers' measures stop independent shares
 * of what is left. World supply, the seller's own growth and its receipts all
 * read this one figure, so a repeated or overlapping measure cannot charge the
 * same exports twice in one place and once in another.
 */
export declare function stoppedShare(campaign: Campaign, seller: NationId, sector: SectorId, good?: TradeSectorId, coercions?: readonly Coercion[]): number;
/** What one of the administration's measures would take of its target's output, read the way the economy charges it. */
export declare function measureCut(campaign: Campaign, measure: TradeMeasure & {
    readonly kind: CoerciveMeasureKind;
}): number;
/** What a seller's measures stopped of one sector or good at its baseline vintage. */
export declare function embeddedStoppedShare(campaign: Campaign, seller: NationId, sector: SectorId, good?: TradeSectorId): number;
/** The change since the baseline vintage in what the measures stop of a seller's sales: negative where an embedded program has since been lifted. */
export declare function newlyStoppedShare(campaign: Campaign, seller: NationId, sector: SectorId, good?: TradeSectorId): number;
/**
 * Planning classification: the economy sectors whose goods cannot be built
 * without chips. No opened source gives a semiconductor-use table by industry,
 * so the list is stated rather than derived, and only these sectors' output is
 * charged when chips stop arriving.
 */
export declare const CHIP_DEPENDENT_SECTORS: readonly SectorId[];
/**
 * 0..1 of the chips the United States imports that stop arriving: each
 * supplier's share of the recorded imports, times what its wars and a blockade
 * on station take of its output, net of what buyers can source elsewhere in
 * the short run (the sector's `substitutability`). Recorded imports stand for
 * supply: chips that arrive inside finished goods assembled elsewhere, and
 * the country's own fabs, are not counted, so this is read as a planning value.
 */
export declare function chipShortfall(campaign: Campaign): number;
/** What the rest of the world is doing to this economy's targets this week, and what its wars cost it. */
export declare function externalMacroPressure(campaign: Campaign, nation: NationId): ExternalMacroPressure;
export {};
