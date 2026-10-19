import { type Campaign, type GameDate, type OrderDomain } from "@admin/engine";
export type OrderStage = "desk" | "shut" | "rulemaking" | "court" | "standing" | "undone";
export declare const ORDER_STAGE_LABELS: Readonly<Record<OrderStage, string>>;
export type PipelineRow = {
    /** The signature's record id, or the catalogue id for an order not yet signed. */
    readonly id: string;
    readonly order: string;
    readonly name: string;
    /** The order's own domain (security, economy, civil, emergency). It is not the program's policy domain: the engine keeps no mapping between the two. */
    readonly domain?: OrderDomain;
    readonly stage: OrderStage;
    /** Where it stands, in one line. */
    readonly line: string;
    readonly href: string;
    /** Weeks until the next thing happens to it: a rule landing, a ruling. */
    readonly weeks?: number;
    readonly signed?: GameDate;
};
export type PipelineStage = {
    readonly stage: OrderStage;
    readonly label: string;
    readonly rows: readonly PipelineRow[];
};
/**
 * The order pipeline: every signature newest first by stage, and the catalogue
 * as it stands this week. An empty stage is left out, so the pipeline never
 * draws a heading over nothing.
 */
export declare function orderPipeline(campaign: Campaign): readonly PipelineStage[];
/** Every signature of one order, newest first, as the pipeline reads it. */
export declare function orderSignatures(campaign: Campaign, orderId: string): readonly PipelineRow[];
export type OrderDomainCount = {
    readonly domain: OrderDomain;
    readonly byStage: Readonly<Record<OrderStage, number>>;
};
/** How many orders sit at each stage in each of the orders' own domains, counted from the pipeline rows. */
export declare function orderCountsByDomain(campaign: Campaign): readonly OrderDomainCount[];
