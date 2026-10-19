import { type Campaign, type ExecutiveOrder, type OrderAuthority, type OrderProjection, type OrderSubject } from "@admin/engine";
import { type Charter, type StateId } from "@admin/world";
import { type ReachLine } from "./reach";
import { type ChoiceTable, type ChoiceTone } from "./choice-table";
export declare const ORDER_SIGN = "sign";
export type OrderEffectLine = {
    readonly label: string;
    readonly text: string;
    readonly tone: ChoiceTone;
};
export type OrderDesk = {
    readonly order: ExecutiveOrder;
    readonly available: boolean;
    readonly missing?: string;
    readonly authority?: OrderAuthority;
    readonly projection: OrderProjection;
    /** What it changes in the country, path by path. */
    readonly effects: readonly OrderEffectLine[];
    /** Added to the debt in the first year, in USD millions. Zero where it borrows nothing. */
    readonly debt: number;
    /** Weeks from the signature to the day it binds anybody. Zero for a decree. */
    readonly landsInWeeks: number;
    /** The states its domestic signature lands on, the ones it helps first. */
    readonly states: readonly {
        readonly state: StateId;
        readonly helps: boolean;
    }[];
    readonly pledges: readonly string[];
    /** Which groups of households it lands on, in a sentence; absent when it names none. */
    readonly reach?: string;
    /** The same groups as structured lines, hardest first, for a screen that draws them. Empty when it names none. */
    readonly reachLines: readonly ReachLine[];
    readonly comparison: ChoiceTable;
};
/** Where on the map an order lands: its states as a set, or the whole country. */
export declare function orderCamera(desk: Pick<OrderDesk, "states">): string;
/** One order at the desk, or undefined for an id the catalogue does not have. */
export declare function orderDesk(campaign: Campaign, charter: Charter, orderId: string, subject?: OrderSubject): OrderDesk | undefined;
/** What signing will do, in the one line above the verb. */
export declare function orderReview(desk: OrderDesk): string;
