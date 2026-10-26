/**
 * The orders a federal mission in one state is signed under.
 *
 * A locale act that sends officers or troops into a state signs one of these
 * behind the scenes, and the record it leaves is the legal instrument: the
 * Attorney General reviews it, a state or a private party sues over it, a
 * court can pause it, and a President can rescind it, on the same machinery
 * every other order runs on. They are not in `EXECUTIVE_ORDERS`, so the policy
 * desk never offers one on its own; each is reached only through its act and
 * that act's statutory predicate.
 *
 * Money is not here. The act charges it, so the order carries no
 * `treasuryOfGdp` and a signature cannot bill the same mission twice.
 *
 * This file imports nothing but types from orders.ts, for the reason
 * order-families.ts gives: orders.ts reads this list at load.
 */
import type { ExecutiveOrder } from "./orders.js";
export declare const LOCALE_MISSION_ORDERS: readonly ExecutiveOrder[];
