import { type Campaign, type ReleaseKind } from "@admin/engine";
export declare const RELEASE_LABELS: Readonly<Record<ReleaseKind, string>>;
/** A measure the economy screen can open selected, and the view it is drawn in. */
export declare const ECONOMY_MEASURE_VIEW: {
    readonly crude: "markets";
    readonly "natural-gas": "markets";
    readonly lng: "markets";
    readonly wheat: "markets";
    readonly corn: "markets";
    readonly soybeans: "markets";
    readonly potash: "markets";
    readonly nitrogen: "markets";
    readonly copper: "markets";
    readonly lithium: "markets";
    readonly "rare-earths": "markets";
    readonly unemployment: "overview";
    readonly inflation: "overview";
    readonly growth: "overview";
    readonly "policy-rate": "markets";
};
export type EconomyMeasure = keyof typeof ECONOMY_MEASURE_VIEW;
export declare function isEconomyMeasure(value: unknown): value is EconomyMeasure;
/** The measure each release prints. */
export declare const RELEASE_MEASURE: Readonly<Record<ReleaseKind, EconomyMeasure>>;
/** Where each release's figure is read: the economy, on the view that draws it, with it selected. */
export declare const RELEASE_HREF: Readonly<Record<ReleaseKind, string>>;
export type ReleaseEntry = {
    readonly kind: ReleaseKind;
    readonly label: string;
    readonly href: string;
    readonly date: string;
    /** Days before today, negative for a release still ahead. */
    readonly daysAgo: number;
    /** The figure it printed, where the week it fell in is on the record. */
    readonly figure?: string;
};
export type ReleaseTimeline = {
    readonly past: readonly ReleaseEntry[];
    readonly next: readonly ReleaseEntry[];
};
/** How far back the timeline reaches, in days. */
export declare const RELEASE_TIMELINE_DAYS = 56;
/** The last eight weeks of releases and the next of each kind. */
export declare function releaseTimeline(campaign: Campaign): ReleaseTimeline;
