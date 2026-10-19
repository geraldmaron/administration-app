import type { RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { type InstitutionId } from "./institutions.js";
import { type WorkDef } from "./executive-work.js";
export type ProjectId = "highway-grants" | "reactor-demonstrations";
export type ProjectDefinition = {
    readonly id: ProjectId;
    readonly name: string;
    /** What one award is, in prose. */
    readonly unit: string;
    readonly portfolio: RoleId;
    /** The owner builds; an approval edge is the review each project must clear first. */
    readonly work: WorkDef;
    /** One award every this many weeks. */
    readonly awardEveryWeeks: number;
    /** The review, in weeks at the pace the department plans on. */
    readonly reviewWeeks: number;
    /** Construction, in weeks at the pace the department plans on. */
    readonly buildWeeks: number;
};
export type Project = {
    /** The week the award was made; before the record began for an inherited project. */
    readonly awarded: number;
    /** Share of the review done, 0..1. */
    readonly review: number;
    /** Share of construction done, 0..1; it starts only when the review is done. */
    readonly build: number;
};
export type ProjectWeek = {
    readonly awarded: number;
    /** The review share the week's award arrived with; absent when nothing was awarded. */
    readonly readyAtAward?: number;
    readonly reviewed: number;
    readonly completed: number;
    readonly completedLate: number;
};
export type ProjectRuntime = {
    readonly id: ProjectId;
    readonly openedTurn: number;
    readonly underway: readonly Project[];
    /** Finished since the record began, and of those, how many past their plan. */
    readonly completed: number;
    readonly completedLate: number;
    readonly last?: ProjectWeek;
};
/** How fast each stage moves this week, as the delivery of the body that runs it, 0..1. */
export type ProjectPace = {
    readonly review: number;
    readonly build: number;
    /** The reviewing body, when there is one. */
    readonly reviewer?: InstitutionId;
};
export declare const PLAN_PACE = 0.7;
export declare const READY_AT_AWARD_MAX = 0.6;
export declare function plannedWeeks(def: ProjectDefinition): number;
export declare function isLate(project: Project, def: ProjectDefinition, turn: number): boolean;
/**
 * The pipeline a department already has when its record begins: one award per
 * interval back across the plan, each where the plan would have it. None is
 * late, because nothing on the record says it is; it is the same assumption a
 * new campaign makes.
 */
export declare function openingProjects(def: ProjectDefinition, turn: number): ProjectRuntime;
/**
 * One week of a program. `readiness` is how far through its review the week's
 * award arrives, from whoever signs it; read only in a week an award is due.
 *
 * Every project is counted once: those underway, plus the award, less those
 * finished, are underway next week.
 */
export declare function projectTick(runtime: ProjectRuntime, def: ProjectDefinition, pace: ProjectPace, turn: number, readiness: number): ProjectRuntime;
export declare const PROJECTS: readonly ProjectDefinition[];
export declare function projectDefinition(id: ProjectId): ProjectDefinition | undefined;
/** The department a program rolls up to: its owner if the owner is one, else the owner's parent. */
export declare function projectDepartment(def: ProjectDefinition): InstitutionId;
/** How fast each stage moves this week: the slowest review body, stopped below the approval floor, then the owner. */
export declare function selectProjectPace(campaign: Campaign, def: ProjectDefinition): ProjectPace;
/**
 * How far through its review the program's next award arrives: the competence
 * of whoever runs the portfolio, acting or confirmed. With nobody in the chair
 * the career staff award down the list, and the project starts its review at
 * the beginning.
 */
export declare function awardReadiness(campaign: Campaign, def: ProjectDefinition): number;
/**
 * The week of every program. A save from before programs were tracked has
 * none; each opens this week with the pipeline a new campaign assumes, and
 * records from here.
 */
export declare const projectPhase: TurnPhase;
