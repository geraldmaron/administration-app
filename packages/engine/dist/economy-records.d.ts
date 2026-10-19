import type { Campaign } from "./state.js";
/**
 * The economy's three kept records, opened wherever a campaign lacks them: at
 * the oath, and on loading a save that predates them. Each opener
 * reads the campaign as it stands rather than as it was founded, so a load
 * forgives no deterioration the campaign already lived through.
 */
export declare function withEconomyRecords(campaign: Campaign): Campaign;
/**
 * The records at the oath, opened on the country the President inherits: the
 * predecessor's program in every domain. A program the platform holds from the
 * first day is the new President's change to that budget, so the books meet it
 * as one: the push it gives demand, the borrowing it adds to the President's
 * own stock, and the ten-year the market prices for it. Opened on the platform
 * instead, a President who ran on borrowing to build inherited the borrowing
 * and was never charged for it.
 */
export declare function withOathEconomyRecords(campaign: Campaign): Campaign;
/**
 * Rescales a v51 save's US debt stock from gross debt to debt held by the
 * public before the economy's records open on it. A no-op once the records
 * exist, since only a save that predates them predates the rescale too.
 */
export declare function withPublicDebtRebase(campaign: Campaign): Campaign;
