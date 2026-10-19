import { type Campaign, type ImpactEvent, type ImpactReport } from "@admin/engine";
export type ImpactFigure = {
    readonly label: string;
    readonly range: string;
};
export type ImpactReportRow = {
    readonly id: string;
    readonly title: string;
    readonly nationName: string;
    readonly kind: ImpactEvent["spec"]["mechanism"]["kind"];
    /** "Assessment ongoing" or "Recovery complete". */
    readonly stage: string;
    readonly reported: ImpactReport["date"];
    readonly confidence: ImpactReport["confidence"];
    /** The headline figures, in the order a reader weighs them. */
    readonly figures: readonly ImpactFigure[];
    /** Whether the site's kind was confirmed, assessed, or never classified. */
    readonly site: string;
    readonly basis: string;
    /** How many reports have been filed, so a single estimate reads as one. */
    readonly revisions: number;
};
export type ImpactReportFilter = {
    /** Only incidents a Record entry caused. */
    readonly causedBy?: string;
    readonly nation?: string;
    /** Only incidents whose latest report is this recent. */
    readonly withinDays?: number;
};
/** Every incident with at least one filed report, most recently updated first. */
export declare function impactReports(campaign: Campaign, filter?: ImpactReportFilter): readonly ImpactReportRow[];
