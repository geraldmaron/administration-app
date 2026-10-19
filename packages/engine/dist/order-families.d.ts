/**
 * The order catalog grouped as US families.
 *
 * Every family is one a President has actually used, and each entry names the
 * statute or clause it runs on. Rulemaking entries do not change the country
 * until their proceeding finishes; the others land the day they are signed.
 * The two energy orders are what an energy pledge rests on: leasing and
 * permitting are the executive's own levers over supply, and a promise about
 * energy is kept by pulling one, not by a program the platform put in force at
 * the oath.
 *
 * This file imports nothing but types from orders.ts: orders.ts spreads the
 * list below into its catalogue at load, so a value import back the other way
 * would read the catalogue before it exists.
 */
import type { ExecutiveOrder, OrderAuthority } from "./orders.js";
/**
 * The act every emergency power in the catalogue waits on. Named once so the
 * card that says an order needs a declaration can say which law makes one.
 */
export declare const EMERGENCY_DECLARATION_AUTHORITY: OrderAuthority;
export declare const FURTHER_US_ORDERS: readonly ExecutiveOrder[];
/** The family name a player reads beside an order. Unknown ids return nothing. */
export declare function orderFamily(id: string): string | undefined;
