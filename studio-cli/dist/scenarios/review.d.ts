import { ScenarioDef } from "@admin/content";
import { type DoneItem, type FinishOutcome, type OwnerAuthorization, type PublishGuard, type ReviewFileOf, type ReviewKind, type ReviewPaths, type ScaffoldOutcome } from "../jobs/review-core.js";
import type { HarnessCorpus } from "../corpus/harness-corpus.js";
export { FULL_REVIEW_CEILING, reviewPathsFor, sampled, sampleRateFor, type FinishOutcome, type PersonaTally, type PublishGuard, type ReviewPaths, type ScaffoldOutcome, } from "../jobs/review-core.js";
export declare const SCENARIO_REVIEW: ReviewKind<ScenarioDef, "scenarioId">;
export declare const ReviewDecision: import("zod").ZodType<import("../jobs/review-core.js").ReviewDecisionOf<"scenarioId">, unknown, import("zod/v4/core").$ZodTypeInternals<import("../jobs/review-core.js").ReviewDecisionOf<"scenarioId">, unknown>>;
export declare const ReviewFile: import("zod").ZodType<ReviewFileOf<"scenarioId">, unknown, import("zod/v4/core").$ZodTypeInternals<ReviewFileOf<"scenarioId">, unknown>>;
export type ReviewFile = ReviewFileOf<"scenarioId">;
export type ReviewDecision = ReviewFile["decisions"][number];
export type DoneScenario = DoneItem<ScenarioDef>;
export declare function doneScenarios(paths: ReviewPaths): Promise<Map<string, DoneScenario>>;
export declare function scaffoldReview(jobId: string, paths: ReviewPaths, corpus?: HarnessCorpus): Promise<ScaffoldOutcome>;
export declare function recordDefects(record: ReviewFile, known: ReadonlySet<string>): readonly string[];
export declare function personaTally(decisions: readonly ReviewDecision[], approvedIds: ReadonlySet<string>): import("./review.js").PersonaTally;
export declare function finishReview(jobId: string, paths: ReviewPaths, corpus?: HarnessCorpus): Promise<FinishOutcome>;
export declare function reviewJob(jobId: string, paths: ReviewPaths, ownerAuthorization?: OwnerAuthorization, corpus?: HarnessCorpus): Promise<number>;
/** The publish gate's half of reviewer independence, named for this group's review command. */
export declare function guardScenarioPublish(jobId: string, provisional: boolean | undefined, args: readonly string[], ownerAuthorization?: OwnerAuthorization | null): PublishGuard;
