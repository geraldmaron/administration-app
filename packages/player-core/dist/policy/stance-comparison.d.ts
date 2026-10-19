import { type Campaign, type PolicyDomain } from "@admin/engine";
import type { Charter } from "@admin/world";
import { type ChoiceTable } from "./choice-table";
export type StanceComparison = ChoiceTable & {
    readonly domain: PolicyDomain;
    /** The standing stance, which every column is read against and none offers. */
    readonly current: string;
};
/**
 * Every position in a domain other than the standing one, each what adopting
 * it would charge now and every week after, with the weekly charge of the
 * stance in force said beside it.
 */
export declare function stanceComparison(campaign: Campaign, charter: Charter, domain: PolicyDomain): StanceComparison;
/** What signing a stance will do, in the one line above the verb. */
export declare function stanceReview(campaign: Campaign, charter: Charter, domain: PolicyDomain, stanceId: string): string;
