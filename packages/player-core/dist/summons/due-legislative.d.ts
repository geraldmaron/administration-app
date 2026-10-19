import { type Bill, type Campaign, type ForceAuthorization, type TreatyRecord } from "@admin/engine";
import type { SummonsDue } from "./types";
/**
 * When the clocks Congress starts come due, with nothing said about them.
 *
 * The reading half of `clocks-legislative.ts`: which record each clock is
 * running against, what it is called, and the day it lands. The prose, the
 * counsel and the door stay in the brief file, which imports these — so asking
 * whether the money runs out this week never loads the advisor.
 */
/**
 * A stopgap and a full-year bill run the same clock to different ends: one
 * expires and one comes due.
 */
export declare function appropriationTitle(campaign: Campaign): string;
export declare const SHUTDOWN_TITLE = "The government is closed";
export declare function appropriationDue(campaign: Campaign): SummonsDue | undefined;
/**
 * The shutdown counts up, not down.
 *
 * There is no date on which a closed government reopens: it reopens when
 * Congress passes something, which is an act rather than a deadline. So the
 * only honest clock is how long it has already been.
 */
export declare function shutdownDue(campaign: Campaign): SummonsDue | undefined;
/** The bill closest to lapsing, since that is the one the week is actually about. */
export declare function nearestDeskBill(campaign: Campaign): Bill | undefined;
export declare function billDeskDue(campaign: Campaign): SummonsDue | undefined;
export declare function nearestAuthorization(campaign: Campaign): ForceAuthorization | undefined;
export declare function aumfDue(campaign: Campaign): SummonsDue | undefined;
export declare function oldestUnratified(campaign: Campaign): TreatyRecord | undefined;
/** Weeks a signed treaty has been waiting on a Senate that has no deadline to act by. */
export declare function treatyWaiting(campaign: Campaign, treaty: TreatyRecord): number;
/**
 * Ratification has no statutory deadline, so this clock counts up rather than
 * down. A treaty the Senate never takes up is a real and specific failure — the
 * counterpart signed something the United States has not honored — and the only
 * honest reading of it is how long it has been sitting.
 */
export declare function treatyDue(campaign: Campaign): SummonsDue | undefined;
