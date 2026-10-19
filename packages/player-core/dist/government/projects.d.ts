import { type Campaign, type ProjectId } from "@admin/engine";
import type { ExecutiveNode } from "./executive-tree.js";
export type ProjectStatus = "opening" | "on-schedule" | "slipping" | "failing" | "stalled";
export type ProjectTone = "good" | "watch" | "bad" | "neutral";
export type ProjectStage = {
    readonly key: "review" | "build" | "late";
    readonly label: string;
    readonly count: number;
};
export type ProjectRow = {
    readonly id: ProjectId;
    readonly name: string;
    readonly unit: string;
    readonly department: string;
    readonly owner: string;
    /** The body whose review each project clears first. */
    readonly reviewer?: string;
    readonly href: string;
    readonly emblem: string;
    readonly status: ProjectStatus;
    readonly statusLabel: string;
    readonly tone: ProjectTone;
    readonly plannedWeeks: number;
    /** Underway, split by stage, with every late project in `late` whatever its stage. */
    readonly stages: readonly ProjectStage[];
    readonly underway: number;
    readonly completed: number;
    readonly completedLate: number;
    /** How far through its review the next award arrives, 0..1: the Secretary's pick. */
    readonly nextAwardReady: number;
    readonly why: string;
    readonly action: string;
};
export type ProjectsReading = {
    readonly rows: readonly ProjectRow[];
    readonly summary: string;
    /** The project count every row's bar is drawn against, so rows compare. */
    readonly scale: number;
};
/** What to tell the President about a body the President cannot direct. */
export declare function independentAction(name: string): string;
export declare function departmentProjects(campaign: Campaign, nodes: ReadonlyMap<string, ExecutiveNode>): ProjectsReading;
