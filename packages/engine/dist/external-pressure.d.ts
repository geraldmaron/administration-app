import { type NationId } from "@admin/world";
import { type CommodityMacroPressure } from "./commodity-pressure.js";
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
 * A measure in force between two governments, and how much of their trade it
 * cuts. `stopsImposerSales` is false for a ban on the target's goods alone: the
 * imposer's own exports stay legally open, so they neither shrink nor leave the
 * world market.
 */
export type Coercion = {
    readonly imposer: NationId;
    readonly target: NationId;
    readonly severity: number;
    readonly stopsImposerSales: boolean;
};
/**
 * Every economic measure in force, whoever imposed it: the administration's own
 * register (tariffs are a price step, not a cut in trade, and are not here) and
 * every standing embargo a government has declared, the United States included
 * as a target. An embargo the administration declared is in both, and counted
 * once, from the register.
 */
export declare function coercionsInForce(campaign: Campaign): readonly Coercion[];
/**
 * The share of one government's output that is goods sold to another. Where
 * the United States is on either side, what the two countries actually traded
 * (`US_GOODS_TRADE`); between two other capitals, what the seller exports in
 * all, split by how much of its trade runs to that buyer. Read against the
 * dataset's founding figures, so a measure that has already cut the trade does
 * not also shrink its own cost.
 */
export declare function exportShare(campaign: Campaign, seller: NationId, buyer: NationId): number;
/** What the rest of the world is doing to this economy's targets this week, and what its wars cost it. */
export declare function externalMacroPressure(campaign: Campaign, nation: NationId): ExternalMacroPressure;
export {};
