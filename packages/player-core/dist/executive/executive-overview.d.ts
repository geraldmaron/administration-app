import { type Campaign } from "@admin/engine";
import { type BriefMatter } from "../desk/brief-matters.js";
import type { AttentionPolicySettings } from "../desk/attention.js";
import { type BranchDelivery, type DeliveryRow } from "../government/delivery.js";
import { type ExecutiveNode, type ExecutiveSectionKey } from "../government/executive-tree.js";
import { type ServiceRow, type ServicesReading } from "../government/services.js";
/** A name the Senate has in front of it for a chair, which is not the person in it. */
export type PendingNominee = {
    readonly name: string;
    readonly stage: string;
};
export declare function pendingNominee(campaign: Campaign, node: ExecutiveNode): PendingNominee | undefined;
export type ChairCounts = {
    readonly total: number;
    readonly confirmed: number;
    readonly acting: number;
    readonly vacant: number;
    /** Chairs with a name before the Senate. */
    readonly nominees: number;
    /** Chairs with a request, offer or inquiry waiting. */
    readonly waiting: number;
    /** Chairs that are vacant, acting or have something waiting. */
    readonly needYou: number;
};
export type ServiceTally = {
    readonly total: number;
    readonly good: number;
    readonly watch: number;
    readonly bad: number;
    readonly neutral: number;
};
export type OverviewOffice = {
    readonly node: ExecutiveNode;
    readonly section: ExecutiveSectionKey;
    readonly nominee?: PendingNominee;
    /** Present for the top-level bodies the branch figure is built from; absent for the White House staff and independent boards. */
    readonly delivery?: DeliveryRow;
    /** The services this department owns, by how each is doing; absent when it owns none. */
    readonly services?: ServiceTally;
    readonly agencies: number;
    readonly agenciesNeedingYou: number;
    /** Agencies under this office that the branch figure also counts on their own, such as the FBI under Justice, so no delivery row goes undrawn. */
    readonly agencyDelivery: readonly AgencyDelivery[];
};
export type AgencyDelivery = {
    readonly name: string;
    readonly href: string;
    readonly row: DeliveryRow;
};
export type OverviewSection = {
    readonly key: ExecutiveSectionKey;
    readonly title: string;
    readonly lead: string;
    readonly offices: readonly OverviewOffice[];
};
export type PendingNomination = {
    readonly office: string;
    readonly href: string;
    readonly nominee: PendingNominee;
};
export type ExecutiveOverview = {
    readonly chairs: ChairCounts;
    readonly delivery: BranchDelivery;
    /** How many bodies the branch figure is weighted over, against the top-level offices drawn beside it. */
    readonly bodiesCounted: number;
    readonly services: ServicesReading;
    readonly serviceTally: ServiceTally;
    /** The service with the most intake waiting, where any is tracked. A maximum, never a pooled sum: each service is in its own unit. */
    readonly longestWait?: ServiceRow;
    readonly sections: readonly OverviewSection[];
    readonly nominations: readonly PendingNomination[];
    /** What waits on the President under Washington's executive pages. */
    readonly matters: readonly BriefMatter[];
};
/** Matters answered in the executive branch: under /washington, but not the other three branches' pages. */
export declare function executiveMatters(matters: readonly BriefMatter[]): readonly BriefMatter[];
/** Counts every chair in the tree, agencies included, the one way the roster and the headline both count. */
export declare function chairCounts(campaign: Campaign, nodes: readonly ExecutiveNode[]): ChairCounts;
export declare function executiveOverview(campaign: Campaign, settings?: AttentionPolicySettings): ExecutiveOverview;
