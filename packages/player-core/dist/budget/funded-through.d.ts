import { type Campaign } from "@admin/engine";
/**
 * The date funding runs through, for a `throughTurn`.
 *
 * A turn is dated by the first day of its week, so the week that holds
 * September 30 reads as a day or so earlier. When the turn is a fiscal year's
 * last, the date a player is owed is the statutory one, not the week's label.
 */
export declare function fundedThroughDate(campaign: Campaign, turn: number): string;
