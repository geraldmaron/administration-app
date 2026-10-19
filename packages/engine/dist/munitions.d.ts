/**
 * Munitions as levels, never counts.
 *
 * No stock count for any of these systems is public (the CSIS page the seed
 * was read from says the inventories are classified), so every stock here is
 * an index where 1.0 is a notional full stock. The United States is held by
 * class, from `US_MUNITIONS`; every other government is one index, 1 at the
 * oath. A war week draws the stocks of everyone fighting it; what the United
 * States draws goes on order, its production line works the order book down
 * week by week, and whatever is still owed lands at the end of the general
 * lead. Every other government refills from its own industry.
 */
import { type NationId } from "@admin/world";
import { type Campaign, type GameDate, type MunitionStock, type MunitionsState } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
export declare const MUNITION_CLASS_IDS: readonly ["air-defense", "naval-interceptors", "cruise-standoff", "precision-fires", "artillery-155"];
export type MunitionClassId = (typeof MUNITION_CLASS_IDS)[number];
export declare const MUNITION_CLASS_LABELS: Readonly<Record<MunitionClassId, string>>;
/**
 * One lead for every class: the CSIS figure of "about 24 months historically,
 * 36 or more now", taken at its current end. It is a general figure, not any
 * one system's, and the label travels with it so no surface prints it as one.
 */
export declare const GENERAL_RESTOCK_LEAD: {
    readonly weeks: 156;
    readonly label: "general";
};
/**
 * How fast a production line refills a class, in index a week. The values are
 * planning values; only their order is sourced, from the rates the table
 * cites: THAAD at 96 a year (1), PrSM at about 400 (2), PAC-3 at about 600
 * (3), 155mm at about 36,000 a month (4). A class refills at its scarcest
 * cited system's rank, and a class with no cited rate takes the lowest rank
 * that does not flatter it.
 */
export type RestockRank = 1 | 2 | 3 | 4;
export declare const RESTOCK_PER_WEEK: Readonly<Record<RestockRank, number>>;
export declare const CLASS_RESTOCK_RANK: Readonly<Record<MunitionClassId, RestockRank>>;
/** A modeled supplier's priority access to a federal line, in stock-index units per week. */
export declare const DEFENSE_PRIORITY_CLASS: "precision-fires";
export declare const DEFENSE_PRIORITY_SUPPLIER = "Potomac Precision Works";
export declare const DEFENSE_PRIORITY_WEEKLY_INDEX = 0.0006;
/** What a week of fighting at full intensity takes out of a stock. A planning value. */
export declare const DRAW_PER_WAR_WEEK = 0.02;
/** Below this a class is too thin to carry the rung it supports. */
export declare const EXHAUSTED_STOCK = 0.02;
/** Below this a class is reported as running low. */
export declare const LOW_STOCK = 0.25;
/** Which classes each military rung spends, so a class at zero limits the rung it supports. */
export declare const RUNG_CLASSES: Readonly<Record<3 | 4 | 5, readonly MunitionClassId[]>>;
export { applyMunitions, type MunitionsEffect } from "./world-effects.js";
/** The stocks at the oath: each US class at its seeded planning level, nobody else drawn. */
export declare function openingMunitions(): MunitionsState;
/** The stored stocks, or the oath's where nothing has been stored yet. A stock's `count` holds its index. */
export declare function munitionsOf(campaign: Campaign): MunitionsState;
export declare function usClassLevel(state: MunitionsState, id: MunitionClassId): number;
/** One government's stock as one index: the class average for the United States. */
export declare function munitionLevel(campaign: Campaign, nation: NationId): number;
/**
 * What a side's stocks leave of its strength. A force with its magazines
 * empty still holds ground, so the floor is three quarters of full strength,
 * not zero; an army out of shells is weaker, not gone.
 */
export declare function munitionStrengthFactor(campaign: Campaign, nation: NationId): number;
/**
 * What a rung is missing for want of munitions, or undefined. Only the
 * President's own stocks are held by class; every other government's single
 * index already prices its strength in the war tick.
 */
export declare function munitionsShortfall(campaign: Campaign, actor: NationId, rung: 3 | 4 | 5): string | undefined;
type Order = MunitionStock["onOrder"][number];
/** The priority is available only against a federal replenishment entry already in the book. */
export declare function priorityOrder(campaign: Campaign): Order | undefined;
/** A named backlog still awaiting delivery under an unended priority contract. */
export declare function hasLiveDefensePriorityContract(campaign: Campaign): boolean;
export declare function munitionContractBook(campaign: Campaign, contractId: string): readonly Order[];
/** The one named contract the weekly line is currently allowed to prioritize. */
export declare function activeDefensePriorityContractId(campaign: Campaign): string | undefined;
/**
 * The week's draw on stocks and the restocks that arrive, for every
 * government at war and every stock still refilling. Runs after the war tick,
 * so it draws on the wars as this week left them.
 */
export declare const munitionsPhase: TurnPhase;
export type MunitionsClassReading = {
    readonly id: MunitionClassId;
    readonly label: string;
    /** 0..1 on a notional full stock. A planning level, never a count. */
    readonly index: number;
    readonly band: "full" | "adequate" | "low" | "spent";
    /** Index already ordered and not yet delivered. */
    readonly onOrder: number;
    readonly nextArrival?: GameDate;
};
export type MunitionsReading = {
    readonly classes: readonly MunitionsClassReading[];
    /** Every level here is set by the game, not reported; a surface says so beside it. */
    readonly provenance: "planning value";
    readonly lead: typeof GENERAL_RESTOCK_LEAD;
};
/** The President's stocks as the security room reads them: a level per class, what is on order, and when the next order lands. */
export declare function selectMunitions(campaign: Campaign): MunitionsReading;
/** The lines a munitions week can file. Levels only: no line prints a count, because none is sourced. */
export declare const MUNITIONS_LINES: {
    readonly ledger: "Munitions stocks are drawn and refilled.";
    readonly low: (label: string) => string;
    readonly restocked: (label: string) => string;
    readonly lead: "The general lead is about three years; a priority contract still awaiting production may be delayed past it.";
    readonly banner: "Munitions levels are the game's planning estimates, not reported stocks: no stock count for these systems is public.";
};
