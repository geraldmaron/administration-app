import type { Campaign } from "./state.js";
/**
 * `inherited` is the balance the President took over at today's size and
 * today's prices; `orders` is the customs the administration's own tariffs
 * collect; `limit` is what the Treasury is holding back, at the debt limit or
 * through a lapse, which narrows the deficit only by not paying it yet.
 */
export type DeficitDriverSource = "inherited" | "cycle" | "program" | "laws" | "orders" | "world" | "interest" | "limit";
/** One part of the year's balance, in USD millions a year; negative widens the deficit. */
export type DeficitDriver = {
    readonly source: DeficitDriverSource;
    readonly amount: number;
};
/**
 * The year's balance, part by part. Each part is what that cause adds to the
 * balance on its own: the program and the laws against the inherited ones, the cycle as
 * the receipts and benefits a gap moves, the world as what a war or a street in
 * revolt forces, and interest as the whole bill. What the President's own added
 * stock costs in interest is paid out of the discretionary line, so it is
 * counted with the program: the books keep one added stock, whether a program,
 * a reply or an order borrowed it. Where a cap already holds the line lower,
 * only the crowding beyond the cap is the program's. The inherited part is what
 * is left, so the parts sum to the balance exactly.
 */
export declare function selectDeficitDrivers(campaign: Campaign): readonly DeficitDriver[];
