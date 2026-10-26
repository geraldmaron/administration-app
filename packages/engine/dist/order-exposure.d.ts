import type { StateEconomyAxis } from "@admin/world";
/** Private plaintiffs by the kind of injury they can show. */
export type PlaintiffClass = "advocacy" | "regulated" | "individuals" | "congress";
/**
 * What a state can claim. `proprietary` is the state's own money or programs,
 * which courts accept. `residents` is harm to the people who live there, which
 * after United States v. Texas (2023) is attenuated: a state cannot simply
 * stand in for its residents against the federal government.
 */
export type StateStandingBasis = "proprietary" | "residents" | "none";
/** Which states the order actually lands on. */
export type StateReach = {
    readonly kind: "cohort";
    readonly cohort: "foreign-born";
} | {
    readonly kind: "economy";
    readonly axis: StateEconomyAxis;
} | {
    readonly kind: "federal-dependence";
} | {
    readonly kind: "subject-state";
} | {
    readonly kind: "none";
};
export type OrderExposure = {
    /** How visible and contested the act is, 0..1. */
    readonly salience: number;
    readonly classes: Readonly<Partial<Record<PlaintiffClass, number>>>;
    /** The private plaintiff who would lead, as a caption names a party. Fictional. */
    readonly privatePlaintiff: string;
    readonly stateBasis: StateStandingBasis;
    readonly stateReach: StateReach;
    /**
     * The share of the order's overreach that is a constitutional question
     * rather than a question of delegated authority. An act of Congress can cure
     * the second and not the first.
     */
    readonly constitutionalShare: number;
    /** The legal grounds a challenger would plead, each distinct. */
    readonly grounds: readonly string[];
};
export declare const ORDER_EXPOSURE: Readonly<Record<string, OrderExposure>>;
/** An act the table does not name is still exposed, quietly. */
export declare const DEFAULT_EXPOSURE: OrderExposure;
export declare function orderExposure(orderId: string): OrderExposure;
