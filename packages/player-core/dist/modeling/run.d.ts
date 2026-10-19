import { type Campaign, type ProjectionRun, type ProjectionRunOptions } from "@admin/engine";
import { type ModelingChoiceSpec } from "./choices";
export declare function modelingAdvance(campaign: Campaign): Pick<ProjectionRunOptions, "advance" | "settle">;
/** One job of a projection: an alternative and an ensemble member. */
export type ModelingJob = {
    readonly alternative: string;
    readonly member: number;
};
export type ModelingRequest = {
    readonly spec: ModelingChoiceSpec;
    readonly weeks: number;
    readonly jobs: readonly ModelingJob[];
};
/**
 * Runs a request's jobs in order. Kept to a spec and ids rather than to the
 * alternatives themselves, so a worker that holds its own copy of the campaign
 * can rebuild the choice and run its share without a function crossing a
 * thread boundary.
 */
export declare function runModelingJobs(campaign: Campaign, request: ModelingRequest, onWeek?: (job: ModelingJob, week: number) => void): readonly ProjectionRun[];
