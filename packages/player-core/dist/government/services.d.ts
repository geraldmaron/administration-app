import { type Campaign, type ServiceId } from "@admin/engine";
import { type ProjectsReading } from "./projects.js";
export type ServiceStatus = "opening" | "keeping-up" | "falling-behind" | "delayed" | "cutting-corners" | "failing" | "stopped";
export type ServiceTone = "good" | "watch" | "bad" | "neutral";
export type ServiceAge = {
    readonly key: "fresh" | "month" | "quarter" | "half";
    readonly label: string;
    /** Cases of this age, in weeks of normal intake. */
    readonly weeks: number;
    readonly late: boolean;
};
export type ServiceRow = {
    readonly id: ServiceId;
    readonly name: string;
    readonly department: string;
    readonly owner: string;
    readonly href: string;
    readonly emblem: string;
    readonly status: ServiceStatus;
    readonly statusLabel: string;
    readonly tone: ServiceTone;
    readonly standardWeeks: number;
    readonly ages: readonly ServiceAge[];
    readonly pendingWeeks: number;
    readonly lateShare: number;
    /** Of last week's decisions, the share that were wrong. Absent before the first week. */
    readonly wrongShare?: number;
    /** Of last week's decisions, the share that were refusals. Only where the service can refuse. */
    readonly refusedShare?: number;
    readonly why: string;
    readonly action: string;
};
export type ServicesReading = {
    readonly rows: readonly ServiceRow[];
    readonly summary: string;
    /** The weeks of intake every row's bar is drawn against, so rows compare. */
    readonly scaleWeeks: number;
    /** The departments' grant programs, read on their own terms below the case work. */
    readonly projects: ProjectsReading;
};
export declare function departmentServices(campaign: Campaign): ServicesReading;
