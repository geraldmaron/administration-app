import { ConsequenceDef } from "@admin/content";
import { type OwnerAuthorization, type PublishGuard, type ReviewFileOf, type ReviewKind, type ReviewPaths } from "../jobs/review-core.js";
import type { HarnessCorpus } from "../corpus/harness-corpus.js";
export { reviewPathsFor, type ReviewPaths } from "../jobs/review-core.js";
export declare const CONSEQUENCE_REVIEW: ReviewKind<ConsequenceDef, "consequenceId">;
export declare const ConsequenceReviewFile: import("zod").ZodType<ReviewFileOf<"consequenceId">, unknown, import("zod/v4/core").$ZodTypeInternals<ReviewFileOf<"consequenceId">, unknown>>;
export type ConsequenceReviewFile = ReviewFileOf<"consequenceId">;
export declare function reviewConsequenceJob(jobId: string, paths: ReviewPaths, ownerAuthorization?: OwnerAuthorization, corpus?: HarnessCorpus): Promise<number>;
/** The publish gate's half of reviewer independence, named for this group's review command. */
export declare function guardConsequencePublish(jobId: string, provisional: boolean | undefined, args: readonly string[], ownerAuthorization?: OwnerAuthorization | null): PublishGuard;
